import { create } from 'zustand';
import type {
  DurationMinutes,
  GamePhase,
  GameState,
  HeroId,
  Player,
  Question,
  QuestionPack,
  Tile,
} from '@ultraman/shared';

import {
  SALARY_ON_LAP,
  STARTING_MONEY,
  STUDY_REWARD_CORRECT,
  STUDY_REWARD_WRONG,
  createBoardTiles,
} from '../domain/tiles.js';
import {
  calculateRent,
  countDistrictTilesOwned,
  isBankrupt,
  salvageValue,
} from '../domain/economy.js';
import { rankPlayersByAssets } from '../domain/rankings.js';
import {
  countdownSeconds,
  isAnswerCorrect,
  pickRandomQuestion,
  rewardFor,
} from '../domain/questionPicker.js';
import {
  advancePosition,
  crossedStart,
  resolveLanding,
  rollDice,
  type DiceRoll,
  type LandingEvent,
} from '../domain/turnEngine.js';
import { loadQuestionPack } from '../data/packs/questionPackLoader.js';
import { recordWrong } from '../data/repo/wrongBookRepo.js';

export type SetupPlayer = {
  name: string;
  heroId: HeroId;
  badge: 1 | 2;
  isChild: boolean;
};

export type BuyPrompt = {
  playerId: string;
  position: number;
  price: number;
};

export type RentNotice = {
  payerId: string;
  ownerId: string;
  position: number;
  amount: number;
};

export type BankruptcyNotice = {
  playerId: string;
  playerName: string;
};

export type GameEndSummary = {
  reason: 'time-up' | 'bankruptcy';
  rankings: { playerId: string; rank: number; totalAssets: number }[];
  bankruptPlayerId?: string;
};

export type QuizContext =
  | { kind: 'study' }
  | { kind: 'monster' }
  | { kind: 'property-buy'; position: number; price: number };

export type QuizResult = {
  outcome: 'correct' | 'wrong' | 'timeout' | 'help';
  reward: number;
  message: string;
};

export type ActiveQuiz = {
  question: Question;
  context: QuizContext;
  playerId: string;
  usedHelp: boolean;
  startedAt: number;
  deadlineAt: number;
};

type Store = {
  screen: 'menu' | 'setup' | 'playing' | 'result';
  game: GameState | null;
  childId: string | null;
  currentPack: QuestionPack | null;
  packLoading: boolean;
  packError: string | null;
  askedQuestionIds: Set<string>;
  lastDice: DiceRoll | null;
  isRolling: boolean;
  isMoving: boolean;
  landingEvent: LandingEvent | null;
  buyPrompt: BuyPrompt | null;
  rentNotice: RentNotice | null;
  bankruptcy: BankruptcyNotice | null;
  endSummary: GameEndSummary | null;
  activeQuiz: ActiveQuiz | null;
  quizResult: QuizResult | null;
  nowMs: number;

  // setup
  goToSetup: () => void;
  startGame: (params: { duration: DurationMinutes; week: number; players: SetupPlayer[] }) => Promise<void>;

  // turn
  rollAndMove: () => Promise<void>;
  confirmBuy: () => void;
  declineBuy: () => void;
  dismissLanding: () => void;

  // quiz
  submitAnswer: (answer: string) => Promise<void>;
  useHelpCard: () => void;
  quizTimeout: () => Promise<void>;
  dismissQuizResult: () => void;

  tick: (nowMs: number) => void;
  endGame: (reason: 'time-up') => void;

  currentPlayer: () => Player | null;
  tiles: () => readonly Tile[];
};

const generateGameId = (): string => {
  return `g-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

const generatePlayerId = (index: number): string => `p${index + 1}`;

const buildInitialPlayers = (setups: SetupPlayer[]): Player[] =>
  setups.map((s, idx) => ({
    id: generatePlayerId(idx),
    name: s.name,
    hero: { heroId: s.heroId, badge: s.badge },
    isChild: s.isChild,
    money: STARTING_MONEY,
    position: 0,
    weaponIds: [],
    ownedTiles: [],
    streak: 0,
    combatPower: 0,
    helpCards: 2,
  }));

const buildOwnerIndex = (players: readonly Player[]): Map<number, string> => {
  const map = new Map<number, string>();
  for (const p of players) {
    for (const pos of p.ownedTiles) {
      map.set(pos, p.id);
    }
  }
  return map;
};

const replacePlayer = (players: readonly Player[], updated: Player): Player[] =>
  players.map((p) => (p.id === updated.id ? updated : p));

const findPlayer = (players: readonly Player[], id: string): Player => {
  const p = players.find((player) => player.id === id);
  if (!p) {
    throw new Error(`player not found: ${id}`);
  }
  return p;
};

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

const triggerRentSettlement = (
  state: GameState,
  payer: Player,
  ownerId: string,
  rent: number,
): GameState => {
  const owner = findPlayer(state.players, ownerId);
  const newPayer = { ...payer, money: payer.money - rent };
  const newOwner = { ...owner, money: owner.money + rent };
  let players = replacePlayer(state.players, newPayer);
  players = replacePlayer(players, newOwner);
  return { ...state, players };
};

const advanceTurn = (game: GameState): GameState => {
  const next = (game.currentTurn + 1) % game.players.length;
  return { ...game, currentTurn: next };
};

const addMoney = (game: GameState, playerId: string, delta: number): GameState => {
  const player = findPlayer(game.players, playerId);
  const updated = { ...player, money: player.money + delta };
  return { ...game, players: replacePlayer(game.players, updated) };
};

const updateStreak = (game: GameState, playerId: string, delta: number): GameState => {
  const player = findPlayer(game.players, playerId);
  const nextStreak = delta === 0 ? 0 : Math.max(0, player.streak + delta);
  const updated = { ...player, streak: nextStreak };
  return { ...game, players: replacePlayer(game.players, updated) };
};

const consumeHelpCard = (game: GameState, playerId: string): GameState | null => {
  const player = findPlayer(game.players, playerId);
  if (player.helpCards <= 0) return null;
  const updated = { ...player, helpCards: player.helpCards - 1 };
  return { ...game, players: replacePlayer(game.players, updated) };
};

const autoLiquidate = (
  game: GameState,
  playerId: string,
): { workingGame: GameState; bankrupt: boolean } => {
  let player = findPlayer(game.players, playerId);
  let workingGame = game;
  const sortedTiles = [...player.ownedTiles].sort((a, b) => {
    const ta = workingGame.tiles[a];
    const tb = workingGame.tiles[b];
    const va = ta && ta.type === 'property' ? salvageValue(ta) : 0;
    const vb = tb && tb.type === 'property' ? salvageValue(tb) : 0;
    return va - vb;
  });
  for (const pos of sortedTiles) {
    const tile = workingGame.tiles[pos];
    if (!tile || tile.type !== 'property') continue;
    const gain = salvageValue(tile);
    player = {
      ...player,
      money: player.money + gain,
      ownedTiles: player.ownedTiles.filter((p) => p !== pos),
    };
    workingGame = { ...workingGame, players: replacePlayer(workingGame.players, player) };
    if (player.money >= 0) break;
  }
  return { workingGame, bankrupt: isBankrupt(player) };
};

const applyStudyAutoReward = (game: GameState, playerId: string): GameState => {
  return addMoney(game, playerId, STUDY_REWARD_CORRECT);
};

const applyVaultReward = (game: GameState, playerId: string): GameState => {
  return addMoney(game, playerId, 300);
};

const executePurchase = (game: GameState, playerId: string, position: number, price: number): GameState => {
  const player = findPlayer(game.players, playerId);
  if (player.money < price) return game;
  const updated: Player = {
    ...player,
    money: player.money - price,
    ownedTiles: [...player.ownedTiles, position],
  };
  return { ...game, players: replacePlayer(game.players, updated) };
};

const startQuiz = (params: {
  state: Store;
  question: Question;
  context: QuizContext;
  playerId: string;
}): Partial<Store> => {
  const now = Date.now();
  return {
    activeQuiz: {
      question: params.question,
      context: params.context,
      playerId: params.playerId,
      usedHelp: false,
      startedAt: now,
      deadlineAt: now + countdownSeconds(params.question) * 1000,
    },
    askedQuestionIds: new Set([...params.state.askedQuestionIds, params.question.id]),
  };
};

export const useGameStore = create<Store>((set, get) => ({
  screen: 'menu',
  game: null,
  childId: null,
  currentPack: null,
  packLoading: false,
  packError: null,
  askedQuestionIds: new Set(),
  lastDice: null,
  isRolling: false,
  isMoving: false,
  landingEvent: null,
  buyPrompt: null,
  rentNotice: null,
  bankruptcy: null,
  endSummary: null,
  activeQuiz: null,
  quizResult: null,
  nowMs: Date.now(),

  goToSetup: () => set({ screen: 'setup' }),

  startGame: async ({ duration, week, players: setups }) => {
    const tiles = createBoardTiles();
    const players = buildInitialPlayers(setups);
    const child = players.find((p) => p.isChild) ?? null;
    const game: GameState = {
      id: generateGameId(),
      startedAt: Date.now(),
      durationMin: duration,
      week,
      players,
      currentTurn: 0,
      phase: 'monopoly' as GamePhase,
      tiles,
    };
    set({
      screen: 'playing',
      game,
      childId: child?.id ?? null,
      currentPack: null,
      packLoading: true,
      packError: null,
      askedQuestionIds: new Set(),
      lastDice: null,
      isRolling: false,
      isMoving: false,
      landingEvent: null,
      buyPrompt: null,
      rentNotice: null,
      bankruptcy: null,
      endSummary: null,
      activeQuiz: null,
      quizResult: null,
      nowMs: Date.now(),
    });

    try {
      const pack = await loadQuestionPack(week);
      set({ currentPack: pack, packLoading: false });
    } catch (err) {
      set({
        packLoading: false,
        packError: err instanceof Error ? err.message : '题包加载失败',
      });
    }
  },

  tick: (nowMs) => {
    const { game, activeQuiz } = get();
    if (!game || game.phase !== 'monopoly') {
      set({ nowMs });
      return;
    }
    if (activeQuiz && nowMs >= activeQuiz.deadlineAt) {
      set({ nowMs });
      void get().quizTimeout();
      return;
    }
    const elapsed = (nowMs - game.startedAt) / 1000;
    const budget = game.durationMin * 60;
    if (elapsed >= budget) {
      set({ nowMs });
      get().endGame('time-up');
      return;
    }
    set({ nowMs });
  },

  endGame: (reason) => {
    const { game } = get();
    if (!game) return;
    const rankings = rankPlayersByAssets(game.players, game.tiles);
    const updated: GameState = { ...game, phase: 'ended' as GamePhase };
    set({
      game: updated,
      screen: 'result',
      endSummary: {
        reason,
        rankings,
      },
    });
  },

  rollAndMove: async () => {
    const state = get();
    if (!state.game || state.game.phase !== 'monopoly') return;
    if (
      state.isRolling ||
      state.isMoving ||
      state.buyPrompt ||
      state.landingEvent ||
      state.activeQuiz ||
      state.quizResult
    ) {
      return;
    }

    const roll = rollDice();
    set({ isRolling: true, lastDice: roll });
    await sleep(800);

    const current = get();
    if (!current.game) return;
    const currentPlayer = current.game.players[current.game.currentTurn];
    if (!currentPlayer) return;

    const oldPosition = currentPlayer.position;
    const newPosition = advancePosition(oldPosition, roll);
    const lapBonus = crossedStart(oldPosition, newPosition, roll) ? SALARY_ON_LAP : 0;

    set({ isRolling: false, isMoving: true });
    await sleep(200 + roll * 150);

    const movedPlayer: Player = {
      ...currentPlayer,
      position: newPosition,
      money: currentPlayer.money + lapBonus,
    };
    const players = replacePlayer(current.game.players, movedPlayer);
    let workingGame: GameState = { ...current.game, players };

    const ownerMap = buildOwnerIndex(workingGame.players);
    const findOwner = (pos: number): string | null => ownerMap.get(pos) ?? null;
    const getRent = (pos: number): number => {
      const tile = workingGame.tiles[pos];
      if (!tile || tile.type !== 'property') return 0;
      const ownerId = ownerMap.get(pos);
      if (!ownerId) return 0;
      const owner = findPlayer(workingGame.players, ownerId);
      const ownedInDistrict = countDistrictTilesOwned(owner, workingGame.tiles, tile.district);
      return calculateRent(tile, ownedInDistrict);
    };

    const landing = resolveLanding(
      newPosition,
      workingGame.tiles,
      movedPlayer.id,
      findOwner,
      getRent,
    );

    let nextBuyPrompt: BuyPrompt | null = null;
    let nextRentNotice: RentNotice | null = null;
    let nextActiveQuiz: Partial<Store> = {};

    if (landing.kind === 'property-owned-other') {
      workingGame = triggerRentSettlement(workingGame, movedPlayer, landing.ownerId, landing.rent);
      nextRentNotice = {
        payerId: movedPlayer.id,
        ownerId: landing.ownerId,
        position: landing.position,
        amount: landing.rent,
      };
      const paid = findPlayer(workingGame.players, movedPlayer.id);
      if (paid.money < 0) {
        const { workingGame: liquidated, bankrupt } = autoLiquidate(workingGame, paid.id);
        workingGame = liquidated;
        if (bankrupt) {
          set({
            game: workingGame,
            isMoving: false,
            landingEvent: landing,
            rentNotice: nextRentNotice,
            bankruptcy: { playerId: paid.id, playerName: paid.name },
          });
          return;
        }
      }
    } else if (landing.kind === 'property-unowned') {
      if (movedPlayer.money >= landing.price) {
        nextBuyPrompt = {
          playerId: movedPlayer.id,
          position: landing.position,
          price: landing.price,
        };
      }
    } else if (landing.kind === 'study') {
      if (movedPlayer.isChild && current.currentPack) {
        const question = pickRandomQuestion(current.currentPack, {
          excludeIds: current.askedQuestionIds,
        });
        if (question) {
          nextActiveQuiz = startQuiz({
            state: get(),
            question,
            context: { kind: 'study' },
            playerId: movedPlayer.id,
          });
        } else {
          workingGame = applyStudyAutoReward(workingGame, movedPlayer.id);
        }
      } else {
        workingGame = applyStudyAutoReward(workingGame, movedPlayer.id);
      }
    } else if (landing.kind === 'monster') {
      if (movedPlayer.isChild && current.currentPack) {
        const question = pickRandomQuestion(current.currentPack, {
          excludeIds: current.askedQuestionIds,
        });
        if (question) {
          nextActiveQuiz = startQuiz({
            state: get(),
            question,
            context: { kind: 'monster' },
            playerId: movedPlayer.id,
          });
        }
      }
    } else if (landing.kind === 'reward-vault') {
      workingGame = applyVaultReward(workingGame, movedPlayer.id);
    }

    set({
      game: workingGame,
      isMoving: false,
      landingEvent: landing,
      buyPrompt: nextBuyPrompt,
      rentNotice: nextRentNotice,
      ...nextActiveQuiz,
    });
  },

  confirmBuy: () => {
    const state = get();
    const prompt = state.buyPrompt;
    const game = state.game;
    if (!prompt || !game) return;
    const player = findPlayer(game.players, prompt.playerId);

    if (player.isChild && state.currentPack) {
      const question = pickRandomQuestion(state.currentPack, {
        excludeIds: state.askedQuestionIds,
      });
      if (question) {
        set({
          buyPrompt: null,
          ...startQuiz({
            state,
            question,
            context: { kind: 'property-buy', position: prompt.position, price: prompt.price },
            playerId: prompt.playerId,
          }),
        });
        return;
      }
    }

    if (player.money < prompt.price) {
      set({ buyPrompt: null });
      return;
    }
    set({ game: executePurchase(game, prompt.playerId, prompt.position, prompt.price), buyPrompt: null });
  },

  declineBuy: () => set({ buyPrompt: null }),

  dismissLanding: () => {
    const state = get();
    if (state.buyPrompt || state.activeQuiz || state.quizResult) return;
    if (state.bankruptcy) {
      const { game, bankruptcy } = state;
      if (game && bankruptcy) {
        const rankings = rankPlayersByAssets(game.players, game.tiles);
        set({
          screen: 'result',
          game: { ...game, phase: 'ended' as GamePhase },
          endSummary: {
            reason: 'bankruptcy',
            rankings,
            bankruptPlayerId: bankruptcy.playerId,
          },
          landingEvent: null,
          rentNotice: null,
          bankruptcy: null,
        });
      }
      return;
    }
    const game = state.game;
    if (!game) return;
    set({
      game: advanceTurn(game),
      landingEvent: null,
      rentNotice: null,
      lastDice: null,
    });
  },

  submitAnswer: async (answer) => {
    const state = get();
    const quiz = state.activeQuiz;
    const game = state.game;
    if (!quiz || !game) return;

    const correct = isAnswerCorrect(quiz.question, answer);
    const reward = rewardFor(quiz.question);
    let workingGame = game;
    let message = '';
    let outcome: QuizResult['outcome'] = correct ? 'correct' : 'wrong';

    if (correct) {
      workingGame = addMoney(workingGame, quiz.playerId, reward.correct);
      workingGame = updateStreak(workingGame, quiz.playerId, 1);

      if (quiz.context.kind === 'property-buy') {
        workingGame = executePurchase(
          workingGame,
          quiz.playerId,
          quiz.context.position,
          quiz.context.price,
        );
        message = `答对！买下地产并获得 +¥${reward.correct}`;
      } else if (quiz.context.kind === 'monster') {
        message = `击败怪兽！获得 +¥${reward.correct}`;
      } else {
        message = `答对！+¥${reward.correct}`;
      }
    } else {
      const childId = state.childId;
      if (childId && !quiz.usedHelp) {
        try {
          await recordWrong({
            childId,
            question: quiz.question,
            wrongAnswer: answer,
            week: game.week,
          });
        } catch (err) {
          console.warn('recordWrong failed', err);
        }
      }
      workingGame = addMoney(workingGame, quiz.playerId, reward.wrong);
      workingGame = updateStreak(workingGame, quiz.playerId, 0);
      if (quiz.context.kind === 'property-buy') {
        message = `答错了，这次不能买地，扣 ¥${Math.abs(reward.wrong)}`;
      } else {
        message = `答错了，扣 ¥${Math.abs(reward.wrong)}（已记入错题本）`;
      }
    }

    if (quiz.usedHelp && correct) {
      outcome = 'help';
      message = '求助卡命中！买下地产（本次不加金币）';
    }

    set({
      game: workingGame,
      activeQuiz: null,
      quizResult: { outcome, reward: correct ? reward.correct : reward.wrong, message },
    });
  },

  useHelpCard: () => {
    const state = get();
    const quiz = state.activeQuiz;
    const game = state.game;
    if (!quiz || !game) return;
    const player = findPlayer(game.players, quiz.playerId);
    if (player.helpCards <= 0) return;
    const updated = consumeHelpCard(game, quiz.playerId);
    if (!updated) return;
    set({
      game: updated,
      activeQuiz: { ...quiz, usedHelp: true },
    });
  },

  quizTimeout: async () => {
    const state = get();
    const quiz = state.activeQuiz;
    const game = state.game;
    if (!quiz || !game) return;

    const reward = rewardFor(quiz.question);
    const penalty = Math.floor(reward.wrong / 2);
    let workingGame = addMoney(game, quiz.playerId, penalty);
    workingGame = updateStreak(workingGame, quiz.playerId, 0);

    const childId = state.childId;
    if (childId && !quiz.usedHelp) {
      try {
        await recordWrong({
          childId,
          question: quiz.question,
          wrongAnswer: '(超时)',
          week: game.week,
        });
      } catch (err) {
        console.warn('recordWrong failed', err);
      }
    }

    set({
      game: workingGame,
      activeQuiz: null,
      quizResult: {
        outcome: 'timeout',
        reward: penalty,
        message: `时间到，扣 ¥${Math.abs(penalty)}（已记错题本）`,
      },
    });
  },

  dismissQuizResult: () => {
    const state = get();
    if (!state.quizResult) return;
    set({ quizResult: null });
  },

  currentPlayer: () => {
    const game = get().game;
    if (!game) return null;
    return game.players[game.currentTurn] ?? null;
  },

  tiles: () => get().game?.tiles ?? [],
}));

export { applyStudyAutoReward, applyVaultReward, STUDY_REWARD_WRONG };
