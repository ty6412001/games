import { createHmac, timingSafeEqual } from 'node:crypto';

const base64UrlEncode = (input: Buffer | string): string => {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf-8') : input;
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const base64UrlDecode = (input: string): Buffer => {
  const pad = 4 - (input.length % 4);
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(pad % 4);
  return Buffer.from(normalized, 'base64');
};

const sign = (data: string, secret: string): string =>
  createHmac('sha256', secret).update(data).digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export type JwtPayload = {
  sub: string;
  iat: number;
  exp: number;
};

export const signJwt = (payload: Omit<JwtPayload, 'iat' | 'exp'>, ttlSec: number, secret: string): string => {
  const now = Math.floor(Date.now() / 1000);
  const full: JwtPayload = { ...payload, iat: now, exp: now + ttlSec };
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64UrlEncode(JSON.stringify(full));
  const signature = sign(`${header}.${body}`, secret);
  return `${header}.${body}.${signature}`;
};

export const verifyJwt = (token: string, secret: string): JwtPayload | null => {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts as [string, string, string];
  const expected = sign(`${header}.${body}`, secret);
  try {
    const expectedBuf = Buffer.from(expected);
    const actualBuf = Buffer.from(signature);
    if (expectedBuf.length !== actualBuf.length || !timingSafeEqual(expectedBuf, actualBuf)) {
      return null;
    }
  } catch {
    return null;
  }
  try {
    const payload = JSON.parse(base64UrlDecode(body).toString('utf-8')) as JwtPayload;
    if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
};
