import type { KnowledgeAnswerLog, LearningRewardEvent, WrongBookEntry } from '@ultraman/shared';

const DEFAULT_TIMEOUT_MS = 2000;
const TOKEN_KEY = 'ultraman.auth.token';

type RequestOptions = {
  method?: string;
  body?: unknown;
  timeoutMs?: number;
};

const normalizeApiBase = (value: string | undefined): string | null => {
  const normalized = value?.trim();
  if (!normalized) return null;
  return normalized.replace(/\/$/, '');
};

const isTestRuntime = (): boolean => {
  const metaEnv = (import.meta as ImportMeta & { env?: Record<string, string | boolean | undefined> }).env;
  return Boolean(
    metaEnv?.MODE === 'test' ||
      metaEnv?.VITEST ||
      (typeof process !== 'undefined' && process.env?.VITEST === 'true'),
  );
};

const apiBase = (): string | null => {
  const configured = normalizeApiBase(import.meta.env.VITE_API_BASE as string | undefined);
  if (configured) return configured;
  if (isTestRuntime()) {
    return null;
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/api`;
  }
  return 'http://127.0.0.1:3001/api';
};

export const getToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setToken = (token: string): void => {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
};

export const clearToken = (): void => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
};

type HttpError = {
  status: number;
  code?: string;
  message?: string;
};

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor({ status, code, message }: HttpError) {
    super(message ?? 'api error');
    this.status = status;
    if (code !== undefined) this.code = code;
  }
}

const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const base = apiBase();
  if (!base) {
    throw new ApiError({ status: 0, code: 'API_DISABLED', message: 'API disabled in test runtime' });
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const token = getToken();
  try {
    const init: RequestInit = {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: controller.signal,
    };
    if (options.body !== undefined) {
      init.body = JSON.stringify(options.body);
    }
    const res = await fetch(new URL(path, `${base}/`).toString(), init);
    if (!res.ok) {
      let code: string | undefined;
      let message: string | undefined;
      try {
        const payload = await res.json();
        code = payload?.error?.code;
        message = payload?.error?.message;
      } catch {
        /* ignore */
      }
      throw new ApiError({ status: res.status, ...(code ? { code } : {}), ...(message ? { message } : {}) });
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  } finally {
    window.clearTimeout(timeoutId);
  }
};

export const loginFamily = async (password: string): Promise<string> => {
  const res = await request<{ token: string }>('/auth/login', {
    method: 'POST',
    body: { password },
    timeoutMs: 3000,
  });
  setToken(res.token);
  return res.token;
};

export const listWrongBook = async (params: {
  childId: string;
  subject?: string;
  mastered?: boolean;
  since?: number;
}): Promise<WrongBookEntry[]> => {
  const qs = new URLSearchParams({ childId: params.childId });
  if (params.subject) qs.set('subject', params.subject);
  if (params.mastered !== undefined) qs.set('mastered', String(params.mastered));
  if (params.since !== undefined) qs.set('since', String(params.since));
  const res = await request<{ entries: WrongBookEntry[] }>(`/wrong-book?${qs.toString()}`);
  return res.entries;
};

export const upsertWrongBook = async (entry: WrongBookEntry): Promise<void> => {
  await request('/wrong-book', { method: 'POST', body: entry });
};

export const masterWrongBook = async (id: string): Promise<void> => {
  await request(`/wrong-book/${id}/master`, { method: 'PATCH' });
};

export const syncWeaponUnlock = async (entry: {
  childId: string;
  weaponId: string;
  heroId: string;
  unlockedAt: number;
}): Promise<void> => {
  await request('/weapons', { method: 'POST', body: entry });
};

export const logBossOutcome = async (entry: {
  id: string;
  childId: string;
  week: number;
  bossId: string;
  defeated: boolean;
  totalCombatPower: number;
  topContributor?: string;
  playedAt: number;
}): Promise<void> => {
  await request('/boss-log', { method: 'POST', body: entry });
};

export const createAnswerLog = async (entry: Omit<KnowledgeAnswerLog, 'id'>): Promise<{
  log: KnowledgeAnswerLog;
  rewardEvent: LearningRewardEvent;
}> => {
  return await request('/knowledge-bank/answer-logs', { method: 'POST', body: entry, timeoutMs: 3000 });
};
