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
  Subject,
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
  type RecentQuestionMeta,
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
  applyChanceCard,
  drawChanceCard,
  type ChanceActualDelta,
  type ChanceCardDef,
} from '../domain/chanceDeck.js';
import {
  applyAttack,
  applyFinisher,
  buildInitialBossBattle,
  markBossEscaped,
} from '../domain/bossBattle.js';
import {
  formFromEnergy,
  isAtLeast,
  type DeckerForm,
} from '../domain/decker/forms.js';
import {
  applyDeckerEvent,
  applyFinisherEvent,
  type DeckerEvent,
} from '../domain/decker/energy.js';
import { loadBrainPack, loadQuestionPack } from '../data/packs/questionPackLoader.js';
import { recordWrong } from '../data/repo/wrongBookRepo.js';
import {
  clearCorrectForChild,
  listCorrectIdsByChild,
  recordCorrect,
} from '../data/repo/correctBookRepo.js';
import { DEFAULT_CHILD_ID } from '../config/childIdentity.js';
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

export type QuizContextKind =
  | 'study'
  | 'monster'
  | 'property-buy'
  | 'property-rent'
  | 'property-bonus'
  | 'boss-attack';

export type QuizContext =
  | { kind: 'study' }
  | { kind: 'monster' }
  | { kind: 'property-buy'; position: number; price: number }
  | { kind: 'property-rent'; position: number; ownerId: string; rent: number }
  | { kind: 'property-bonus'; position: number; bonus: number }
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

export type PendingQuiz = {
  context: QuizContext;
  playerId: string;
};

export type ChanceResult = {
  readonly playerId: string;
  readonly card: ChanceCardDef;
  readonly actualDelta: ChanceActualDelta;
  readonly converted: { readonly helpCardToMoney: number };
};

export type MovementAnimation = {
  playerId: string;
  path: readonly number[];
  stepIndex: number;
};

type CorrectBySubject = Record<Subject, Set<string>>;
type RecentBySubject = Record<Subject, RecentQuestionMeta[]>;

export type DeckerState = {
  currentForm: DeckerForm;
  energy: number;
  finisherEnergy: number;
  finisherUsedThisBoss: boolean;
  lastTransitionAt: number | null;
};

const INITIAL_DECKER_STATE: DeckerState = {
  currentForm: 'flash',
  energy: 0,
  finisherEnergy: 0,
  finisherUsedThisBoss: false,
  lastTransitionAt: null,
};

const nowForTransition = (): number =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

const deriveNextDecker = (
  current: DeckerState,
  event: DeckerEvent,
): DeckerState => {
  const prevForm = current.currentForm;
  const nextEnergy = applyDeckerEvent(current.energy, event);
  const nextForm = formFromEnergy(nextEnergy, prevForm);
  const dynamicUnlocked = isAtLeast(nextForm, 'dynamic');
  const nextFinisher = applyFinisherEvent(current.finisherEnergy, event, dynamicUnlocked);
  return {
    ...current,
    currentForm: nextForm,
    energy: nextEnergy,
    finisherEnergy: nextFinisher,
    lastTransitionAt: nextForm !== prevForm ? nowForTransition() : current.lastTransitionAt,
  };
};

const emptyCorrect = (): CorrectBySubject => ({
  math: new Set(),
  chinese: new Set(),
  english: new Set(),
  brain: new Set(),
});

const emptyRecentHistory = (): RecentBySubject => ({
  math: [],
  chinese: [],
  english: [],
  brain: [],
});

const toRecentQuestionMeta = (question: Question): RecentQuestionMeta => ({
  questionId: question.id,
  topic: question.topic,
  type: question.type,
  difficulty: question.difficulty,
});

const pushRecentQuestion = (
  recentHistory: RecentBySubject,
  question: Question,
): RecentBySubject => ({
  ...recentHistory,
  [question.subject]: [...recentHistory[question.subject], toRecentQuestionMeta(question)].slice(-2),
});

type Store = {
  screen: 'menu' | 'setup' | 'playing' | 'result';
  game: GameState | null;
  childId: string | null;
  currentPack: QuestionPack | null;
  brainQuestionCount: number;
  packLoading: boolean;
  packError: string | null;
  correctQuestionIds: CorrectBySubject;
  recentQuestionHistory: RecentBySubject;
  lastDice: DiceRoll | null;
  isRolling: boolean;
  isMoving: boolean;
  movementAnim: MovementAnimation | null;
  landingEvent: LandingEvent | null;
  buyPrompt: BuyPrompt | null;
  rentNotice: RentNotice | null;
  bankruptcy: BankruptcyNotice | null;
  endSummary: GameEndSummary | null;
  pendingQuiz: PendingQuiz | null;
  activeQuiz: ActiveQuiz | null;
  quizResult: QuizResult | null;
  chanceResult: ChanceResult | null;
  lastChildSubject: Subject | null;
  nowMs: number;
  combatSummary: Record<string, CombatPowerBreakdown> | null;
  weaponAwardToast: { heroName: string; weaponName: string } | null;
  pendingEndReason: 'time-up' | 'bankruptcy' | null;
  deckerState: DeckerState;

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

  selectSubject: (subject: Subject) => void;
  cancelPendingQuiz: () => void;

  submitAnswer: (answer: string) => Promise<void>;
  useHelpCard: () => void;
  quizTimeout: () => Promise<void>;
  dismissQuizResult: () => void;

  dismissWeaponToast: () => void;
  dismissChanceResult: () => void;
  resetCorrectBook: () => Promise<void>;

  chooseRentQuiz: () => void;
  acceptRentPayment: () => void;
  chooseSelfPropertyQuiz: () => void;
  dismissSelfPropertyLanding: () => void;

  enterBossBattle: () => void;
  bossAttack: (weaponId?: string) => void;
  fireFinisher: () => void;
  clearTransitionMark: () => void;
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

const ADULT_ONLY_SUBJECTS: ReadonlySet<Subject> = new Set<Subject>(['brain']);

const isSubjectAllowedForPlayer = (
  childId: string | null,
  playerId: string,
  subject: Subject,
): boolean => {
  if (!ADULT_ONLY_SUBJECTS.has(subject)) return true;
  return childId === null || playerId !== childId;
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

type RentSettlement = {
  workingGame: GameState;
  rentNotice: RentNotice;
  bankruptcy: BankruptcyNotice | null;
};

const settlePropertyRent = (
  game: GameState,
  payerId: string,
  context: { position: number; ownerId: string; rent: number },
): RentSettlement => {
  const payer = findPlayer(game.players, payerId);
  let workingGame = triggerRentSettlement(game, payer, context.ownerId, context.rent);
  const rentNotice: RentNotice = {
    payerId,
    ownerId: context.ownerId,
    position: context.position,
    amount: context.rent,
  };
  const paid = findPlayer(workingGame.players, payerId);
  if (paid.money < 0) {
    const { workingGame: liquidated, bankrupt } = autoLiquidate(workingGame, paid.id);
    workingGame = liquidated;
    if (bankrupt) {
      return {
        workingGame,
        rentNotice,
        bankruptcy: { playerId: paid.id, playerName: paid.name },
      };
    }
  }
  return { workingGame, rentNotice, bankruptcy: null };
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

const pickQuestionForSubject = (
  pack: QuestionPack,
  correctIds: CorrectBySubject,
  recentHistory: RecentBySubject,
  subject: Subject,
): { question: Question } | null => {
  const subjectCorrect = correctIds[subject];
  const fresh = pickRandomQuestion(pack, {
    subject,
    excludeIds: subjectCorrect,
    recentQuestions: recentHistory[subject],
  });
  if (!fresh) return null;
  return { question: fresh };
};

const startQuiz = (params: {
  question: Question;
  context: QuizContext;
  playerId: string;
  recentQuestionHistory: RecentBySubject;
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
    pendingQuiz: null,
    recentQuestionHistory: pushRecentQuestion(params.recentQuestionHistory, params.question),
  };
};

const markQuestionCorrect = (
  correctIds: CorrectBySubject,
  question: Question,
): CorrectBySubject => {
  const subjectCorrect = correctIds[question.subject];
  return {
    ...correctIds,
    [question.subject]: new Set([...subjectCorrect, question.id]),
  };
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

const CORE_SUBJECTS: ReadonlySet<Subject> = new Set(['math', 'chinese', 'english']);

const recordCorrectSafe = (question: Question, week: number): void => {
  void recordCorrect({ childId: DEFAULT_CHILD_ID, question, week }).catch((err) => {
    console.warn('recordCorrect failed', err);
  });
};

const loadPackForSubject = async (subject: Subject, week: number): Promise<QuestionPack> => {
  if (subject === 'brain') {
    return loadBrainPack();
  }
  return loadQuestionPack(week);
};

const isSameQuizContext = (a: QuizContext, b: QuizContext): boolean => {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'study' || a.kind === 'monster') return true;
  if (a.kind === 'property-buy' && b.kind === 'property-buy') {
    return a.position === b.position && a.price === b.price;
  }
  if (a.kind === 'property-rent' && b.kind === 'property-rent') {
    return a.position === b.position && a.ownerId === b.ownerId && a.rent === b.rent;
  }
  if (a.kind === 'property-bonus' && b.kind === 'property-bonus') {
    return a.position === b.position && a.bonus === b.bonus;
  }
  if (a.kind === 'boss-attack' && b.kind === 'boss-attack') {
    return a.weaponId === b.weaponId;
  }
  return false;
};

export const useGameStore = create<Store>((set, get) => ({
  screen: 'menu',
  game: null,
  childId: null,
  currentPack: null,
  brainQuestionCount: 0,
  packLoading: false,
  packError: null,
  correctQuestionIds: emptyCorrect(),
  recentQuestionHistory: emptyRecentHistory(),
  lastDice: null,
  isRolling: false,
  isMoving: false,
  movementAnim: null,
  landingEvent: null,
  buyPrompt: null,
  rentNotice: null,
  bankruptcy: null,
  endSummary: null,
  pendingQuiz: null,
  activeQuiz: null,
  quizResult: null,
  chanceResult: null,
  lastChildSubject: null,
  nowMs: Date.now(),
  combatSummary: null,
  weaponAwardToast: null,
  pendingEndReason: null,
  deckerState: INITIAL_DECKER_STATE,

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
      brainQuestionCount: 0,
      packLoading: true,
      packError: null,
      correctQuestionIds: emptyCorrect(),
      recentQuestionHistory: emptyRecentHistory(),
      lastDice: null,
      isRolling: false,
      isMoving: false,
      movementAnim: null,
      landingEvent: null,
      buyPrompt: null,
      rentNotice: null,
      bankruptcy: null,
      endSummary: null,
      pendingQuiz: null,
      activeQuiz: null,
      quizResult: null,
      chanceResult: null,
      lastChildSubject: null,
      nowMs: Date.now(),
      deckerState: INITIAL_DECKER_STATE,
    });

    try {
      const [pack, hydratedCorrect] = await Promise.all([
        loadQuestionPack(week),
        listCorrectIdsByChild(DEFAULT_CHILD_ID).catch(() => emptyCorrect()),
      ]);
      if (get().game?.id !== game.id) return;
      set({
        currentPack: pack,
        brainQuestionCount: 0,
        packLoading: false,
        correctQuestionIds: hydratedCorrect,
      });
      void loadBrainPack()
        .then((brainPack) => {
          if (get().game?.id !== game.id) return;
          set({ brainQuestionCount: brainPack.questions.length });
        })
        .catch(() => {
          if (get().game?.id !== game.id) return;
          set({ brainQuestionCount: 0 });
        });
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
      const { chanceResult } = get();
      if (chanceResult) {
        // 让机会卡完整展示完，避免展示中途被算钱截断
        set({ nowMs });
        return;
      }
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
      pendingQuiz: null,
      activeQuiz: null,
      quizResult: null,
      chanceResult: null,
      lastChildSubject: null,
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
      state.pendingQuiz ||
      state.activeQuiz ||
      state.quizResult ||
      state.chanceResult ||
      state.movementAnim
    ) {
      return;
    }

    const rollMax = isAtLeast(state.deckerState.currentForm, 'miracle') ? 7 : 6;
    const roll = rollDice(Math.random, rollMax);
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
    const nextRentNotice: RentNotice | null = null;
    let nextPendingQuiz: PendingQuiz | null = null;

    if (landing.kind === 'property-unowned') {
      if (movedPlayer.money >= landing.price) {
        nextBuyPrompt = {
          playerId: movedPlayer.id,
          position: landing.position,
          price: landing.price,
        };
      }
    } else if (landing.kind === 'study') {
      if (afterWalk.currentPack) {
        nextPendingQuiz = { context: { kind: 'study' }, playerId: movedPlayer.id };
      } else {
        workingGame = applyStudyAutoReward(workingGame, movedPlayer.id);
      }
    } else if (landing.kind === 'monster') {
      if (afterWalk.currentPack) {
        nextPendingQuiz = { context: { kind: 'monster' }, playerId: movedPlayer.id };
      } else {
        workingGame = addMoney(workingGame, movedPlayer.id, STUDY_REWARD_CORRECT);
      }
    } else if (landing.kind === 'reward-vault') {
      workingGame = applyVaultReward(workingGame, movedPlayer.id);
    } else if (landing.kind === 'chance') {
      const { card } = drawChanceCard();
      const playerBefore = findPlayer(workingGame.players, movedPlayer.id);
      const applied = applyChanceCard(playerBefore, card);
      workingGame = {
        ...workingGame,
        players: replacePlayer(workingGame.players, applied.player),
      };
      set({
        game: workingGame,
        isMoving: false,
        movementAnim: null,
        landingEvent: landing,
        buyPrompt: null,
        rentNotice: null,
        pendingQuiz: null,
        chanceResult: {
          playerId: movedPlayer.id,
          card,
          actualDelta: applied.actualDelta,
          converted: applied.converted,
        },
      });
      return;
    }

    set({
      game: workingGame,
      isMoving: false,
      movementAnim: null,
      landingEvent: landing,
      buyPrompt: nextBuyPrompt,
      rentNotice: nextRentNotice,
      pendingQuiz: nextPendingQuiz,
    });
  },

  confirmBuy: () => {
    const state = get();
    const prompt = state.buyPrompt;
    const game = state.game;
    if (!prompt || !game) return;

    if (state.currentPack) {
      set({
        buyPrompt: null,
        pendingQuiz: {
          context: { kind: 'property-buy', position: prompt.position, price: prompt.price },
          playerId: prompt.playerId,
        },
      });
      return;
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

  chooseRentQuiz: () => {
    const state = get();
    const game = state.game;
    const landing = state.landingEvent;
    if (
      !game ||
      !state.currentPack ||
      !landing ||
      landing.kind !== 'property-owned-other' ||
      state.pendingQuiz ||
      state.activeQuiz ||
      state.quizResult ||
      state.chanceResult
    ) {
      return;
    }
    const player = game.players[game.currentTurn];
    if (!player) return;
    set({
      pendingQuiz: {
        context: {
          kind: 'property-rent',
          position: landing.position,
          ownerId: landing.ownerId,
          rent: landing.rent,
        },
        playerId: player.id,
      },
      rentNotice: null,
    });
  },

  acceptRentPayment: () => {
    const state = get();
    const game = state.game;
    const landing = state.landingEvent;
    if (
      !game ||
      !landing ||
      landing.kind !== 'property-owned-other' ||
      state.activeQuiz ||
      state.quizResult ||
      state.chanceResult
    ) {
      return;
    }
    const settled = settlePropertyRent(game, game.players[game.currentTurn]!.id, landing);
    set({
      game: settled.workingGame,
      pendingQuiz: null,
      rentNotice: settled.rentNotice,
      bankruptcy: settled.bankruptcy,
    });
  },

  chooseSelfPropertyQuiz: () => {
    const state = get();
    const game = state.game;
    const landing = state.landingEvent;
    if (
      !game ||
      !state.currentPack ||
      !landing ||
      landing.kind !== 'property-owned-self' ||
      state.pendingQuiz ||
      state.activeQuiz ||
      state.quizResult ||
      state.chanceResult
    ) {
      return;
    }
    const player = game.players[game.currentTurn];
    const tile = game.tiles[landing.position];
    if (!player || !tile || tile.type !== 'property') return;
    set({
      pendingQuiz: {
        context: {
          kind: 'property-bonus',
          position: landing.position,
          bonus: Math.min(80, Math.floor(tile.baseRent * 0.5)),
        },
        playerId: player.id,
      },
    });
  },

  dismissSelfPropertyLanding: () => {
    const state = get();
    const game = state.game;
    const landing = state.landingEvent;
    if (
      !game ||
      !landing ||
      landing.kind !== 'property-owned-self' ||
      state.buyPrompt ||
      state.pendingQuiz ||
      state.activeQuiz ||
      state.quizResult ||
      state.chanceResult
    ) {
      return;
    }
    set({
      game: advanceTurn(game),
      landingEvent: null,
      rentNotice: null,
      lastDice: null,
    });
  },

  dismissLanding: () => {
    const state = get();
    if (
      state.buyPrompt ||
      state.pendingQuiz ||
      state.activeQuiz ||
      state.quizResult ||
      state.chanceResult
    )
      return;
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

  selectSubject: async (subject) => {
    const initial = get();
    const pending = initial.pendingQuiz;
    const game = initial.game;
    const currentPack = initial.currentPack;
    if (!pending || !game || !currentPack) return;
    if (!isSubjectAllowedForPlayer(initial.childId, pending.playerId, subject)) return;

    const pack = subject === 'brain' ? await loadPackForSubject(subject, game.week) : null;
    const latest = get();
    if (
      !latest.pendingQuiz ||
      latest.pendingQuiz.playerId !== pending.playerId ||
      !isSameQuizContext(latest.pendingQuiz.context, pending.context) ||
      latest.activeQuiz ||
      latest.quizResult ||
      latest.chanceResult
    ) {
      return;
    }

    const packForSubject = subject === 'brain' ? pack : latest.currentPack;
    if (!packForSubject) return;

    const picked = pickQuestionForSubject(
      packForSubject,
      latest.correctQuestionIds,
      latest.recentQuestionHistory,
      subject,
    );
    if (!picked) {
      set({ pendingQuiz: null });
      return;
    }

    set({
      ...startQuiz({
        question: picked.question,
        context: latest.pendingQuiz.context,
        playerId: latest.pendingQuiz.playerId,
        recentQuestionHistory: latest.recentQuestionHistory,
      }),
    });
  },

  cancelPendingQuiz: () => {
    const state = get();
    const pending = state.pendingQuiz;
    const game = state.game;
    if (!pending || !game) return;
    const kind = pending.context.kind;
    if (kind === 'study' || kind === 'monster' || kind === 'property-bonus') {
      set({ pendingQuiz: null });
      return;
    }
    if (kind === 'property-rent') {
      const settled = settlePropertyRent(game, pending.playerId, pending.context);
      set({
        game: settled.workingGame,
        pendingQuiz: null,
        rentNotice: settled.rentNotice,
        bankruptcy: settled.bankruptcy,
      });
    }
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
    let nextCorrectIds = state.correctQuestionIds;
    const isChildAnswering = state.childId !== null && quiz.playerId === state.childId;
    const deckerEvent: DeckerEvent | null = isChildAnswering
      ? correct
        ? quiz.context.kind === 'monster' || quiz.context.kind === 'boss-attack'
          ? 'monster-defeat'
          : 'correct'
        : 'wrong'
      : null;
    const nextDecker =
      deckerEvent !== null ? deriveNextDecker(state.deckerState, deckerEvent) : state.deckerState;
    const strongBuff =
      isChildAnswering && correct && isAtLeast(nextDecker.currentForm, 'strong');

    if (quiz.context.kind === 'property-rent') {
      const ctx = quiz.context;
      if (correct) {
        nextCorrectIds = markQuestionCorrect(nextCorrectIds, quiz.question);
        workingGame = updateStreak(workingGame, quiz.playerId, 1);
        if (quiz.playerId === state.childId && CORE_SUBJECTS.has(quiz.question.subject)) {
          recordCorrectSafe(quiz.question, game.week);
        }
        const nextLastChildSubject =
          quiz.playerId === state.childId && CORE_SUBJECTS.has(quiz.question.subject)
            ? quiz.question.subject
            : state.lastChildSubject;
        set({
          game: workingGame,
          activeQuiz: null,
          correctQuestionIds: nextCorrectIds,
          lastChildSubject: nextLastChildSubject,
          deckerState: nextDecker,
          quizResult: {
            outcome: 'correct',
            reward: 0,
            message: `答对！不用交过路费 ¥${ctx.rent}`,
            correct: true,
            contextKind: 'property-rent',
            playerId: quiz.playerId,
          },
        });
        return;
      }
      if (shouldRecordWrong(state, quiz)) {
        void recordWrongSafe(state.childId!, quiz.question, answer, game.week);
      }
      const settled = settlePropertyRent(workingGame, quiz.playerId, ctx);
      workingGame = updateStreak(settled.workingGame, quiz.playerId, 0);
      const isChildPlayer = quiz.playerId === state.childId;
      const nextLastChildSubject =
        isChildPlayer && CORE_SUBJECTS.has(quiz.question.subject)
          ? quiz.question.subject
          : state.lastChildSubject;
      set({
        game: workingGame,
        activeQuiz: null,
        rentNotice: settled.rentNotice,
        bankruptcy: settled.bankruptcy,
        correctQuestionIds: nextCorrectIds,
        lastChildSubject: nextLastChildSubject,
        deckerState: nextDecker,
        quizResult: {
          outcome: 'wrong',
          reward: -ctx.rent,
          message: isChildPlayer
            ? `答错了，交过路费 ¥${ctx.rent}（已记入错题本）`
            : `答错了，交过路费 ¥${ctx.rent}`,
          correct: false,
          contextKind: 'property-rent',
          playerId: quiz.playerId,
        },
      });
      return;
    }

    if (quiz.context.kind === 'property-bonus') {
      const ctx = quiz.context;
      const bonusReward = strongBuff ? Math.floor(ctx.bonus * 1.5) : ctx.bonus;
      if (correct) {
        nextCorrectIds = markQuestionCorrect(nextCorrectIds, quiz.question);
        workingGame = addMoney(workingGame, quiz.playerId, bonusReward);
        workingGame = updateStreak(workingGame, quiz.playerId, 1);
        if (quiz.playerId === state.childId && CORE_SUBJECTS.has(quiz.question.subject)) {
          recordCorrectSafe(quiz.question, game.week);
        }
        message = `答对！这块地奖励 +¥${bonusReward}`;
      } else {
        workingGame = updateStreak(workingGame, quiz.playerId, 0);
        message = '答错了，这次没有奖励';
      }
      const isChildCore =
        quiz.playerId === state.childId && CORE_SUBJECTS.has(quiz.question.subject);
      set({
        game: workingGame,
        activeQuiz: null,
        correctQuestionIds: nextCorrectIds,
        lastChildSubject: isChildCore ? quiz.question.subject : state.lastChildSubject,
        deckerState: nextDecker,
        quizResult: {
          outcome: correct ? 'correct' : 'wrong',
          reward: correct ? bonusReward : 0,
          message,
          correct,
          contextKind: 'property-bonus',
          playerId: quiz.playerId,
        },
      });
      return;
    }

    if (quiz.context.kind === 'boss-attack') {
      const battle = workingGame.bossBattle;
      if (battle) {
        const damageMultiplier =
          isChildAnswering && isAtLeast(nextDecker.currentForm, 'dynamic') ? 2 : 1;
        const next = applyAttack(
          battle,
          {
            attackerId: quiz.playerId,
            ...(quiz.context.weaponId ? { weaponId: quiz.context.weaponId } : {}),
            correct,
            damageMultiplier,
          },
          workingGame.players.map((p) => p.id),
        );
        workingGame = { ...workingGame, bossBattle: next };
        if (correct) {
          nextCorrectIds = markQuestionCorrect(nextCorrectIds, quiz.question);
          message = `命中 Boss！造成伤害 ${battle.currentHp - next.currentHp}`;
          workingGame = updateStreak(workingGame, quiz.playerId, 1);
        } else {
          if (shouldRecordWrong(state, quiz)) {
            void recordWrongSafe(state.childId!, quiz.question, answer, game.week);
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
        correctQuestionIds: nextCorrectIds,
        deckerState: nextDecker,
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

    const correctReward =
      quiz.context.kind === 'property-buy' && strongBuff
        ? Math.floor(reward.correct * 1.5)
        : reward.correct;

    if (correct) {
      nextCorrectIds = markQuestionCorrect(nextCorrectIds, quiz.question);
      workingGame = addMoney(workingGame, quiz.playerId, correctReward);
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
        message = `答对！买下这块地 +¥${correctReward}`;
      } else if (quiz.context.kind === 'monster') {
        message = `击败怪兽！+¥${correctReward}`;
      } else {
        message = `答对！+¥${correctReward}`;
      }
    } else {
      if (shouldRecordWrong(state, quiz)) {
        void recordWrongSafe(state.childId!, quiz.question, answer, game.week);
      }
      workingGame = addMoney(workingGame, quiz.playerId, reward.wrong);
      workingGame = updateStreak(workingGame, quiz.playerId, 0);
      const isChildPlayer = quiz.playerId === state.childId;
      if (quiz.context.kind === 'property-buy') {
        message = `答错了，这次不能买下这块地，扣 ¥${Math.abs(reward.wrong)}`;
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

    const isChildCore =
      quiz.playerId === state.childId && CORE_SUBJECTS.has(quiz.question.subject);
    if (correct && isChildCore) {
      recordCorrectSafe(quiz.question, game.week);
    }
    const nextLastChildSubject =
      isChildCore ? quiz.question.subject : state.lastChildSubject;

    set({
      game: workingGame,
      activeQuiz: null,
      correctQuestionIds: nextCorrectIds,
      lastChildSubject: nextLastChildSubject,
      deckerState: nextDecker,
      quizResult: {
        outcome,
        reward: correct ? correctReward : reward.wrong,
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

    const isChildAnswering = state.childId !== null && quiz.playerId === state.childId;
    const nextDecker = isChildAnswering
      ? deriveNextDecker(state.deckerState, 'wrong')
      : state.deckerState;

    let workingGame = game;
    if (shouldRecordWrong(state, quiz)) {
      void recordWrongSafe(state.childId!, quiz.question, '(超时)', game.week);
    }

    if (quiz.context.kind === 'property-rent') {
      const ctx = quiz.context;
      const settled = settlePropertyRent(workingGame, quiz.playerId, ctx);
      workingGame = updateStreak(settled.workingGame, quiz.playerId, 0);
      const isChildPlayer = quiz.playerId === state.childId;
      set({
        game: workingGame,
        activeQuiz: null,
        rentNotice: settled.rentNotice,
        bankruptcy: settled.bankruptcy,
        deckerState: nextDecker,
        quizResult: {
          outcome: 'timeout',
          reward: -ctx.rent,
          message: isChildPlayer
            ? `时间到，交过路费 ¥${ctx.rent}（已记错题本）`
            : `时间到，交过路费 ¥${ctx.rent}`,
          correct: false,
          contextKind: 'property-rent',
          playerId: quiz.playerId,
        },
      });
      return;
    }

    if (quiz.context.kind === 'property-bonus') {
      workingGame = updateStreak(workingGame, quiz.playerId, 0);
      set({
        game: workingGame,
        activeQuiz: null,
        deckerState: nextDecker,
        quizResult: {
          outcome: 'timeout',
          reward: 0,
          message: '时间到，这次没有奖励',
          correct: false,
          contextKind: 'property-bonus',
          playerId: quiz.playerId,
        },
      });
      return;
    }

    let penalty = 0;
    if (quiz.context.kind === 'boss-attack') {
      const battle = workingGame.bossBattle;
      if (battle) {
        const damageMultiplier =
          isChildAnswering && isAtLeast(nextDecker.currentForm, 'dynamic') ? 2 : 1;
        const next = applyAttack(
          battle,
          {
            attackerId: quiz.playerId,
            ...(quiz.context.weaponId ? { weaponId: quiz.context.weaponId } : {}),
            correct: false,
            damageMultiplier,
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
      deckerState: nextDecker,
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
    const result = state.quizResult;
    const game = state.game;
    if (!result) return;
    const shouldAdvance =
      game !== null &&
      game.phase === 'monopoly' &&
      (result.contextKind === 'property-bonus' ||
        (result.contextKind === 'property-rent' && result.correct));
    if (shouldAdvance) {
      set({
        game: advanceTurn(game),
        quizResult: null,
        landingEvent: null,
        rentNotice: null,
        lastDice: null,
      });
      return;
    }
    set({ quizResult: null });
  },

  dismissWeaponToast: () => set({ weaponAwardToast: null }),

  resetCorrectBook: async () => {
    try {
      await clearCorrectForChild(DEFAULT_CHILD_ID);
    } catch (err) {
      console.warn('clearCorrectForChild failed', err);
    }
    set({
      correctQuestionIds: emptyCorrect(),
      recentQuestionHistory: emptyRecentHistory(),
    });
  },

  dismissChanceResult: () => {
    const state = get();
    const game = state.game;
    if (!game || !state.chanceResult) return;
    const nowMs = Math.max(state.nowMs, Date.now());
    const elapsed = (nowMs - game.startedAt) / 1000;
    const budget = game.durationMin * 60;
    if (elapsed >= budget) {
      set({
        chanceResult: null,
        landingEvent: null,
        rentNotice: null,
        lastDice: null,
      });
      get().endGame('time-up');
      return;
    }
    set({
      chanceResult: null,
      game: advanceTurn(game),
      landingEvent: null,
      rentNotice: null,
      lastDice: null,
    });
  },

  enterBossBattle: () => {
    const state = get();
    const { game } = state;
    if (!game || game.phase !== 'settle') return;
    const totalPower = game.players.reduce(
      (sum, p) => sum + calculateCombatPower(p).total,
      0,
    );
    const boss = bossForWeek(game.week);
    const battle = buildInitialBossBattle(boss, game.players, totalPower);
    set({
      game: { ...game, phase: 'boss' as GamePhase, bossBattle: battle },
      deckerState: { ...state.deckerState, finisherUsedThisBoss: false },
    });
  },

  fireFinisher: () => {
    const s = get();
    if (!s.game || s.game.phase !== 'boss' || !s.game.bossBattle) return;
    if (s.deckerState.currentForm !== 'dynamic') return;
    if (s.deckerState.finisherEnergy < 100) return;
    if (s.deckerState.finisherUsedThisBoss) return;
    const nextBattle = applyFinisher(s.game.bossBattle);
    set({
      game: { ...s.game, bossBattle: nextBattle },
      deckerState: { ...s.deckerState, finisherEnergy: 0, finisherUsedThisBoss: true },
    });
  },

  clearTransitionMark: () => {
    const s = get();
    if (s.deckerState.lastTransitionAt === null) return;
    set({ deckerState: { ...s.deckerState, lastTransitionAt: null } });
  },

  bossAttack: (weaponId) => {
    const state = get();
    const game = state.game;
    if (!game || game.phase !== 'boss' || !game.bossBattle) return;
    if (state.pendingQuiz || state.activeQuiz || state.quizResult) return;
    const attackerId = game.bossBattle.currentAttackerId;

    if (!state.currentPack) {
      return;
    }

    set({
      pendingQuiz: {
        context: { kind: 'boss-attack', ...(weaponId ? { weaponId } : {}) },
        playerId: attackerId,
      },
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
