import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { closeDb } from '../db/client.js';
import { createServer } from '../server.js';

describe('createServer', () => {
  let tempDir = '';
  const originalDatabasePath = process.env.DATABASE_PATH;

  beforeEach(() => {
    closeDb();
    tempDir = mkdtempSync(join(tmpdir(), 'ultraman-server-'));
    process.env.DATABASE_PATH = join(tempDir, 'family.db');
  });

  afterEach(() => {
    closeDb();
    if (originalDatabasePath === undefined) {
      delete process.env.DATABASE_PATH;
    } else {
      process.env.DATABASE_PATH = originalDatabasePath;
    }
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns status ok from /healthz', async () => {
    const response = await request(createServer()).get('/healthz');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'ok',
      version: expect.any(String),
    });
    expect(response.body.uptime).toEqual(expect.any(Number));
  });
});
