import { create } from 'zustand';
import type {
  BossBattleState,
  DurationMinutes,
  GamePhase,
  GameState,
  HeroId,
  Player,
  Question,
  QuestionPack,
  Tile,
} from '@ultraman/shared';
import { BOARD_SIZE } from '@ultraman/shared';

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
  crossedStart,
  resolveLanding,
  rollDice,
  type DiceRoll,
  type LandingEvent,
} from '../domain/turnEngine.js';
import { calculateCombatPower, type CombatPowerBreakdown } from '../domain/combatPower.js';
import {
  applyAttack,
  buildInitialBossBattle,
  markBossEscaped,
} from '../domain/bossBattle.js';
import { loadQuestionPack } from '../data/packs/questionPackLoader.js';
import { recordWrong } from '../data/repo/wrongBookRepo.js';
import { bossForWeek } from '../theme/ultraman/monsters.js';
import { rollRandomWeapon } from '../theme/ultraman/weapons.js';
import { BATTLE_EFFECT_DURATION_MS, MOVEMENT_STEP_MS, features } from '../config/features.js';

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

export type QuizContextKind = 'study' | 'monster' | 'property-buy' | 'boss-attack';

export type QuizContext =
  | { kind: 'study' }
  | { kind: 'monster' }
  | { kind: 'property-buy'; position: number; price: number }
  | { kind: 'boss-attack'; weaponId?: string };

export type QuizResult = {
  outcome: 'correct' | 'wrong' | 'timeout' | 'help';
  reward: number;
  message: string;
  correct: boolean;
  contextKind: QuizContextKind;
  playerId: string;
  bossId?: string;
};

export type ActiveQuiz = {
  question: Question;
  context: QuizContext;
  playerId: string;
  usedHelp: boolean;
  startedAt: number;
  deadlineAt: number;
};

export type MovementAnimation = {
  playerId: string;
  path: readonly number[];
  stepIndex: number;
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
  movementAnim: MovementAnimation | null;
  landingEvent: LandingEvent | null;
  buyPrompt: BuyPrompt | null;
  rentNotice: RentNotice | null;
  bankruptcy: BankruptcyNotice | null;
  endSummary: GameEndSummary | null;
  activeQuiz: ActiveQuiz | null;
  quizResult: QuizResult | null;
  nowMs: number;
  combatSummary: Record<string, CombatPowerBreakdown> | null;
  weaponAwardToast: { heroName: string; weaponName: string } | null;
  pendingEndReason: 'time-up' | 'bankruptcy' | null;

  goToSetup: () => void;
  startGame: (params: {
    duration: DurationMinutes;
    week: number;
    players: SetupPlayer[];
  }) => Promise<void>;

  rollAndMove: () => Promise<void>;
  confirmBuy: () => void;
  declineBuy: () => void;
  dismissLanding: () => void;

  submitAnswer: (answer: string) => Promise<void>;
  useHelpCard: () => void;
  quizTimeout: () => Promise<void>;
  dismissQuizResult: () => void;

  dismissWeaponToast: () => void;

  enterBossBattle: () => void;
  bossAttack: (weaponId?: string) => void;
  finalizeBossBattle: (reason: 'victory' | 'escaped') => void;

  tick: (nowMs: number) => void;
  endGame: (reason: 'time-up') => void;

  currentPlayer: () => Player | null;
  tiles: () => readonly Tile[];
};

const generateGameId = (): string =>
  `g-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
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

const buildWalkPath = (start: number, steps: number): number[] => {
  const path: number[] = [start];
  let cur = start;
  for (let i = 0; i < steps; i += 1) {
    cur = (cur + 1) % BOARD_SIZE;
    path.push(cur);
  }
  return path;
};

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

const executePurchase = (
  game: GameState,
  playerId: string,
  position: number,
  price: number,
): GameState => {
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

const pickQuestionWithReshuffle = (
  pack: QuestionPack,
  askedIds: Set<string>,
): { question: Question; askedIds: Set<string> } | null => {
  const fresh = pickRandomQuestion(pack, { excludeIds: askedIds });
  if (fresh) return { question: fresh, askedIds };
  if (askedIds.size === 0) return null;
  const reshuffled = pickRandomQuestion(pack, { excludeIds: new Set() });
  if (!reshuffled) return null;
  return { question: reshuffled, askedIds: new Set() };
};

const shouldRecordWrong = (state: Store, quiz: ActiveQuiz): boolean => {
  if (!state.childId) return false;
  if (quiz.playerId !== state.childId) return false;
  if (quiz.usedHelp) return false;
  return true;
};

const recordWrongSafe = async (
  childId: string,
  question: Question,
  wrongAnswer: string,
  week: number,
): Promise<void> => {
  try {
    await recordWrong({ childId, question, wrongAnswer, week });
  } catch (err) {
    console.warn('recordWrong failed', err);
  }
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
  movementAnim: null,
  landingEvent: null,
  buyPrompt: null,
  rentNotice: null,
  bankruptcy: null,
  endSummary: null,
  activeQuiz: null,
  quizResult: null,
  nowMs: Date.now(),
  combatSummary: null,
  weaponAwardToast: null,
  pendingEndReason: null,

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
      movementAnim: null,
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
    if (!game) {
      set({ nowMs });
      return;
    }

    if (features.quizTimer && activeQuiz && nowMs >= activeQuiz.deadlineAt) {
      set({ nowMs });
      void get().quizTimeout();
      return;
    }

    if (game.phase !== 'monopoly') {
      set({ nowMs });
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
    if (!game || game.phase !== 'monopoly') return;
    const breakdown: Record<string, CombatPowerBreakdown> = {};
    for (const p of game.players) {
      breakdown[p.id] = calculateCombatPower(p);
    }
    set({
      game: { ...game, phase: 'settle' as GamePhase },
      combatSummary: breakdown,
      pendingEndReason: reason,
      landingEvent: null,
      buyPrompt: null,
      rentNotice: null,
      activeQuiz: null,
      quizResult: null,
      movementAnim: null,
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
      state.quizResult ||
      state.movementAnim
    ) {
      return;
    }

    const roll = rollDice();
    set({ isRolling: true, lastDice: roll });
    await sleep(800);

    const current = get();
    if (!current.game || current.game.phase !== 'monopoly') return;
    const currentPlayer = current.game.players[current.game.currentTurn];
    if (!currentPlayer) return;

    const oldPosition = currentPlayer.position;
    const path = buildWalkPath(oldPosition, roll);

    set({
      isRolling: false,
      isMoving: true,
      movementAnim: { playerId: currentPlayer.id, path, stepIndex: 0 },
    });

    for (let i = 1; i < path.length; i += 1) {
      const snapshot = get();
      if (!snapshot.game || snapshot.game.phase !== 'monopoly') {
        set({ movementAnim: null, isMoving: false });
        return;
      }
      const stepPos = path[i]!;
      const player = findPlayer(snapshot.game.players, currentPlayer.id);
      const updatedPlayer = { ...player, position: stepPos };
      const updatedPlayers = replacePlayer(snapshot.game.players, updatedPlayer);
      set({
        game: { ...snapshot.game, players: updatedPlayers },
        movementAnim: { playerId: currentPlayer.id, path, stepIndex: i },
      });
      await sleep(MOVEMENT_STEP_MS);
    }

    const afterWalk = get();
    if (!afterWalk.game || afterWalk.game.phase !== 'monopoly') {
      set({ movementAnim: null, isMoving: false });
      return;
    }

    const lapBonus = crossedStart(oldPosition, path[path.length - 1]!, roll) ? SALARY_ON_LAP : 0;
    let workingGame = afterWalk.game;
    if (lapBonus > 0) {
      workingGame = addMoney(workingGame, currentPlayer.id, lapBonus);
    }
    const movedPlayer = findPlayer(workingGame.players, currentPlayer.id);

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
      movedPlayer.position,
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
            movementAnim: null,
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
      if (afterWalk.currentPack) {
        const picked = pickQuestionWithReshuffle(afterWalk.currentPack, afterWalk.askedQuestionIds);
        if (picked) {
          nextActiveQuiz = startQuiz({
            state: { ...get(), askedQuestionIds: picked.askedIds },
            question: picked.question,
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
      if (afterWalk.currentPack) {
        const picked = pickQuestionWithReshuffle(afterWalk.currentPack, afterWalk.askedQuestionIds);
        if (picked) {
          nextActiveQuiz = startQuiz({
            state: { ...get(), askedQuestionIds: picked.askedIds },
            question: picked.question,
            context: { kind: 'monster' },
            playerId: movedPlayer.id,
          });
        } else {
          workingGame = addMoney(workingGame, movedPlayer.id, STUDY_REWARD_CORRECT);
        }
      } else {
        workingGame = addMoney(workingGame, movedPlayer.id, STUDY_REWARD_CORRECT);
      }
    } else if (landing.kind === 'reward-vault') {
      workingGame = applyVaultReward(workingGame, movedPlayer.id);
    }

    set({
      game: workingGame,
      isMoving: false,
      movementAnim: null,
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

    if (state.currentPack) {
      const picked = pickQuestionWithReshuffle(state.currentPack, state.askedQuestionIds);
      if (picked) {
        set({
          buyPrompt: null,
          ...startQuiz({
            state: { ...state, askedQuestionIds: picked.askedIds },
            question: picked.question,
            context: { kind: 'property-buy', position: prompt.position, price: prompt.price },
            playerId: prompt.playerId,
          }),
        });
        return;
      }
    }

    const player = findPlayer(game.players, prompt.playerId);
    if (player.money < prompt.price) {
      set({ buyPrompt: null });
      return;
    }
    set({
      game: executePurchase(game, prompt.playerId, prompt.position, prompt.price),
      buyPrompt: null,
    });
  },

  declineBuy: () => set({ buyPrompt: null }),

  dismissLanding: () => {
    const state = get();
    if (state.buyPrompt || state.activeQuiz || state.quizResult) return;
    if (state.bankruptcy) {
      const { game, bankruptcy } = state;
      if (game && bankruptcy) {
        const breakdown: Record<string, CombatPowerBreakdown> = {};
        for (const p of game.players) {
          breakdown[p.id] = calculateCombatPower(p);
        }
        set({
          game: { ...game, phase: 'settle' as GamePhase },
          combatSummary: breakdown,
          pendingEndReason: 'bankruptcy',
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
    let weaponToast: Store['weaponAwardToast'] = null;

    if (quiz.context.kind === 'boss-attack') {
      const battle = workingGame.bossBattle;
      if (battle) {
        const next = applyAttack(
          battle,
          {
            attackerId: quiz.playerId,
            ...(quiz.context.weaponId ? { weaponId: quiz.context.weaponId } : {}),
            correct,
          },
          workingGame.players.map((p) => p.id),
        );
        workingGame = { ...workingGame, bossBattle: next };
        if (correct) {
          message = `命中 Boss！造成伤害 ${battle.currentHp - next.currentHp}`;
          workingGame = updateStreak(workingGame, quiz.playerId, 1);
        } else {
          if (shouldRecordWrong(state, quiz)) {
            await recordWrongSafe(state.childId!, quiz.question, answer, game.week);
          }
          workingGame = updateStreak(workingGame, quiz.playerId, 0);
          message = quiz.playerId === state.childId
            ? '答错了，伤害减半（已记入错题本）'
            : '答错了，伤害减半';
        }
      }
      if (quiz.usedHelp && correct) {
        outcome = 'help';
      }
      set({
        game: workingGame,
        activeQuiz: null,
        quizResult: {
          outcome,
          reward: 0,
          message,
          correct,
          contextKind: 'boss-attack',
          playerId: quiz.playerId,
          ...(workingGame.bossBattle ? { bossId: workingGame.bossBattle.bossId } : {}),
        },
      });
      if (workingGame.bossBattle?.status === 'victory') {
        setTimeout(() => get().finalizeBossBattle('victory'), BATTLE_EFFECT_DURATION_MS);
      }
      return;
    }

    if (correct) {
      workingGame = addMoney(workingGame, quiz.playerId, reward.correct);
      workingGame = updateStreak(workingGame, quiz.playerId, 1);

      const attacker = findPlayer(workingGame.players, quiz.playerId);
      if (attacker.isChild && attacker.streak >= 3) {
        const owned = new Set(attacker.weaponIds);
        const next = rollRandomWeapon(attacker.hero.heroId);
        if (next && !owned.has(next.id)) {
          const updated = {
            ...attacker,
            weaponIds: [...attacker.weaponIds, next.id],
            streak: 0,
          };
          workingGame = {
            ...workingGame,
            players: replacePlayer(workingGame.players, updated),
          };
          weaponToast = { heroName: attacker.name, weaponName: next.name };
        }
      }

      if (quiz.context.kind === 'property-buy') {
        workingGame = executePurchase(
          workingGame,
          quiz.playerId,
          quiz.context.position,
          quiz.context.price,
        );
        message = `答对！买下地产 +¥${reward.correct}`;
      } else if (quiz.context.kind === 'monster') {
        message = `击败怪兽！+¥${reward.correct}`;
      } else {
        message = `答对！+¥${reward.correct}`;
      }
    } else {
      if (shouldRecordWrong(state, quiz)) {
        await recordWrongSafe(state.childId!, quiz.question, answer, game.week);
      }
      workingGame = addMoney(workingGame, quiz.playerId, reward.wrong);
      workingGame = updateStreak(workingGame, quiz.playerId, 0);
      const isChildPlayer = quiz.playerId === state.childId;
      if (quiz.context.kind === 'property-buy') {
        message = `答错了，这次不能买地，扣 ¥${Math.abs(reward.wrong)}`;
      } else {
        message = isChildPlayer
          ? `答错了，扣 ¥${Math.abs(reward.wrong)}（已记入错题本）`
          : `答错了，扣 ¥${Math.abs(reward.wrong)}`;
      }
    }

    if (quiz.usedHelp && correct) {
      outcome = 'help';
      message = '求助卡命中！（本次不加金币）';
    }

    set({
      game: workingGame,
      activeQuiz: null,
      quizResult: {
        outcome,
        reward: correct ? reward.correct : reward.wrong,
        message,
        correct,
        contextKind: quiz.context.kind,
        playerId: quiz.playerId,
      },
      weaponAwardToast: weaponToast,
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

    let workingGame = game;
    if (shouldRecordWrong(state, quiz)) {
      await recordWrongSafe(state.childId!, quiz.question, '(超时)', game.week);
    }

    let penalty = 0;
    if (quiz.context.kind === 'boss-attack') {
      const battle = workingGame.bossBattle;
      if (battle) {
        const next = applyAttack(
          battle,
          {
            attackerId: quiz.playerId,
            ...(quiz.context.weaponId ? { weaponId: quiz.context.weaponId } : {}),
            correct: false,
          },
          workingGame.players.map((p) => p.id),
        );
        workingGame = { ...workingGame, bossBattle: next };
      }
    } else {
      const reward = rewardFor(quiz.question);
      penalty = Math.floor(reward.wrong / 2);
      workingGame = addMoney(workingGame, quiz.playerId, penalty);
    }
    workingGame = updateStreak(workingGame, quiz.playerId, 0);

    set({
      game: workingGame,
      activeQuiz: null,
      quizResult: {
        outcome: 'timeout',
        reward: penalty,
        message:
          penalty !== 0
            ? `时间到，扣 ¥${Math.abs(penalty)}（已记错题本）`
            : '时间到，伤害减半',
        correct: false,
        contextKind: quiz.context.kind,
        playerId: quiz.playerId,
        ...(workingGame.bossBattle ? { bossId: workingGame.bossBattle.bossId } : {}),
      },
    });
    if (workingGame.bossBattle?.status === 'victory') {
      setTimeout(() => get().finalizeBossBattle('victory'), BATTLE_EFFECT_DURATION_MS);
    }
  },

  dismissQuizResult: () => {
    const state = get();
    if (!state.quizResult) return;
    set({ quizResult: null });
  },

  dismissWeaponToast: () => set({ weaponAwardToast: null }),

  enterBossBattle: () => {
    const { game } = get();
    if (!game || game.phase !== 'settle') return;
    const totalPower = game.players.reduce(
      (sum, p) => sum + calculateCombatPower(p).total,
      0,
    );
    const boss = bossForWeek(game.week);
    const battle = buildInitialBossBattle(boss, game.players, totalPower);
    set({
      game: { ...game, phase: 'boss' as GamePhase, bossBattle: battle },
    });
  },

  bossAttack: (weaponId) => {
    const state = get();
    const game = state.game;
    if (!game || game.phase !== 'boss' || !game.bossBattle) return;
    if (state.activeQuiz || state.quizResult) return;
    const attackerId = game.bossBattle.currentAttackerId;

    if (!state.currentPack) {
      return;
    }

    const picked = pickQuestionWithReshuffle(state.currentPack, state.askedQuestionIds);
    if (!picked) return;

    set({
      ...startQuiz({
        state: { ...state, askedQuestionIds: picked.askedIds },
        question: picked.question,
        context: { kind: 'boss-attack', ...(weaponId ? { weaponId } : {}) },
        playerId: attackerId,
      }),
    });
  },

  finalizeBossBattle: (reason) => {
    const { game } = get();
    if (!game || !game.bossBattle) return;
    const finalBattle: BossBattleState =
      reason === 'escaped' ? markBossEscaped(game.bossBattle) : game.bossBattle;
    const rankings = rankPlayersByAssets(game.players, game.tiles);
    set({
      game: { ...game, phase: 'ended' as GamePhase, bossBattle: finalBattle },
      screen: 'result',
      endSummary: {
        reason: get().pendingEndReason ?? 'time-up',
        rankings,
      },
    });
  },

  currentPlayer: () => {
    const game = get().game;
    if (!game) return null;
    return game.players[game.currentTurn] ?? null;
  },

  tiles: () => get().game?.tiles ?? [],
}));

export { applyStudyAutoReward, applyVaultReward, STUDY_REWARD_WRONG };
