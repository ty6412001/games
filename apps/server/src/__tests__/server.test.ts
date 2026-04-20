import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { closeDb } from '../db/client.js';
import { signJwt } from '../lib/jwt.js';
import { createServer } from '../server.js';

describe('createServer', () => {
  let tempDir = '';
  const originalDatabasePath = process.env.DATABASE_PATH;
  const authHeader = (): { Authorization: string } => ({
    Authorization: `Bearer ${signJwt({ sub: 'family' }, 60, process.env.JWT_SECRET ?? 'dev-jwt-secret')}`,
  });

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

  it('creates, updates, lists, and exports knowledge-bank data', async () => {
    const app = createServer();

    const createResponse = await request(app)
      .post('/api/knowledge-bank/questions')
      .set(authHeader())
      .send({
        subject: 'math',
        difficulty: 1,
        topic: '20以内加法',
        stem: '9 + 4 = ?',
        type: 'choice',
        options: ['12', '13', '14'],
        answer: '13',
        knowledgePoints: ['10以内进位'],
        gameModes: ['monopoly', 'review'],
        status: 'published',
        metadata: {
          source: 'manual',
          tags: ['grade1'],
        },
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.item.id).toEqual(expect.any(String));

    const itemId = createResponse.body.item.id as string;
    const patchResponse = await request(app)
      .patch(`/api/knowledge-bank/questions/${itemId}`)
      .set(authHeader())
      .send({
        topic: '20以内进位加法',
      });

    expect(patchResponse.status).toBe(200);
    expect(patchResponse.body.item.topic).toBe('20以内进位加法');

    const listResponse = await request(app)
      .get('/api/knowledge-bank/questions?subject=math&mode=review')
      .set(authHeader());

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.items).toHaveLength(1);
    expect(listResponse.body.items[0].topic).toBe('20以内进位加法');

    const logsResponse = await request(app).get('/api/knowledge-bank/answer-logs').set(authHeader());
    expect(logsResponse.status).toBe(200);
    expect(logsResponse.body.logs).toEqual([]);

    const wrongBookResponse = await request(app).get('/api/knowledge-bank/wrong-book').set(authHeader());
    expect(wrongBookResponse.status).toBe(200);
    expect(wrongBookResponse.body.records).toEqual([]);

    const exportResponse = await request(app)
      .get('/api/knowledge-bank/export/health-safe')
      .set(authHeader());

    expect(exportResponse.status).toBe(200);
    expect(exportResponse.body.metadata).toMatchObject({
      format: 'json',
      grade: 'grade1',
      semester: 'lower',
      questionCount: 1,
    });
    expect(exportResponse.body.questions).toHaveLength(1);
  });
});
