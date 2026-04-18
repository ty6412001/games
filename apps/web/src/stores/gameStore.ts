import { create } from 'zustand';
import type {
  DurationMinutes,
  GamePhase,
  GameState,
  HeroId,
  Player,
  Tile,
} from '@ultraman/shared';

import {
  SALARY_ON_LAP,
  STARTING_MONEY,
  STUDY_REWARD_CORRECT,
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
  advancePosition,
  crossedStart,
  resolveLanding,
  rollDice,
  type DiceRoll,
  type LandingEvent,
} from '../domain/turnEngine.js';

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

type Store = {
  screen: 'menu' | 'setup' | 'playing' | 'result';
  game: GameState | null;
  lastDice: DiceRoll | null;
  isRolling: boolean;
  isMoving: boolean;
  landingEvent: LandingEvent | null;
  buyPrompt: BuyPrompt | null;
  rentNotice: RentNotice | null;
  bankruptcy: BankruptcyNotice | null;
  endSummary: GameEndSummary | null;
  nowMs: number;

  // setup actions
  goToSetup: () => void;
  startGame: (params: { duration: DurationMinutes; week: number; players: SetupPlayer[] }) => void;

  // turn actions
  rollAndMove: () => Promise<void>;
  confirmBuy: () => void;
  declineBuy: () => void;
  dismissLanding: () => void;

  // utility
  tick: (nowMs: number) => void;
  endGame: (reason: 'time-up') => void;

  // selectors
  currentPlayer: () => Player | null;
  tiles: () => readonly Tile[];
};

const generateGameId = (): string => {
  return `g-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

const generatePlayerId = (index: number): string => {
  return `p${index + 1}`;
};

const buildInitialPlayers = (setups: SetupPlayer[]): Player[] => {
  return setups.map((s, idx) => ({
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
};

const buildOwnerIndex = (players: readonly Player[]): Map<number, string> => {
  const map = new Map<number, string>();
  for (const p of players) {
    for (const pos of p.ownedTiles) {
      map.set(pos, p.id);
    }
  }
  return map;
};

const replacePlayer = (players: readonly Player[], updated: Player): Player[] => {
  return players.map((p) => (p.id === updated.id ? updated : p));
};

const findPlayer = (players: readonly Player[], id: string): Player => {
  const p = players.find((player) => player.id === id);
  if (!p) {
    throw new Error(`player not found: ${id}`);
  }
  return p;
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

const sleep = (ms: number): Promise<void> => {
  return new Promise((r) => setTimeout(r, ms));
};

export const useGameStore = create<Store>((set, get) => ({
  screen: 'menu',
  game: null,
  lastDice: null,
  isRolling: false,
  isMoving: false,
  landingEvent: null,
  buyPrompt: null,
  rentNotice: null,
  bankruptcy: null,
  endSummary: null,
  nowMs: Date.now(),

  goToSetup: () => set({ screen: 'setup' }),

  startGame: ({ duration, week, players: setups }) => {
    const tiles = createBoardTiles();
    const players = buildInitialPlayers(setups);
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
      lastDice: null,
      isRolling: false,
      isMoving: false,
      landingEvent: null,
      buyPrompt: null,
      rentNotice: null,
      bankruptcy: null,
      endSummary: null,
      nowMs: Date.now(),
    });
  },

  tick: (nowMs) => {
    const { game } = get();
    if (!game || game.phase !== 'monopoly') {
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
    if (state.isRolling || state.isMoving || state.buyPrompt || state.landingEvent) return;

    const roll = rollDice();
    set({ isRolling: true, lastDice: roll });
    await sleep(800);

    const game = get().game;
    if (!game) return;
    const currentPlayer = game.players[game.currentTurn];
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
    const players = replacePlayer(game.players, movedPlayer);
    let workingGame: GameState = { ...game, players };

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
      workingGame = applyStudyAutoReward(workingGame, movedPlayer.id);
    } else if (landing.kind === 'reward-vault') {
      workingGame = applyVaultReward(workingGame, movedPlayer.id);
    }

    set({
      game: workingGame,
      isMoving: false,
      landingEvent: landing,
      buyPrompt: nextBuyPrompt,
      rentNotice: nextRentNotice,
    });
  },

  confirmBuy: () => {
    const state = get();
    const prompt = state.buyPrompt;
    const game = state.game;
    if (!prompt || !game) return;
    const player = findPlayer(game.players, prompt.playerId);
    if (player.money < prompt.price) {
      set({ buyPrompt: null });
      return;
    }
    const updated: Player = {
      ...player,
      money: player.money - prompt.price,
      ownedTiles: [...player.ownedTiles, prompt.position],
    };
    const players = replacePlayer(game.players, updated);
    set({ game: { ...game, players }, buyPrompt: null });
  },

  declineBuy: () => set({ buyPrompt: null }),

  dismissLanding: () => {
    const state = get();
    if (state.buyPrompt) return;
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

  currentPlayer: () => {
    const game = get().game;
    if (!game) return null;
    return game.players[game.currentTurn] ?? null;
  },

  tiles: () => get().game?.tiles ?? [],
}));

const applyStudyAutoReward = (game: GameState, playerId: string): GameState => {
  const player = findPlayer(game.players, playerId);
  const updated: Player = { ...player, money: player.money + STUDY_REWARD_CORRECT };
  return { ...game, players: replacePlayer(game.players, updated) };
};

const applyVaultReward = (game: GameState, playerId: string): GameState => {
  const player = findPlayer(game.players, playerId);
  const updated: Player = { ...player, money: player.money + 300 };
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

// Re-export for tests
export { applyStudyAutoReward, applyVaultReward };
