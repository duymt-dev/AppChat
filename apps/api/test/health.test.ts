// TIP-001 AC2, AC3, AC8: /v1/health, X-Request-Id (nhận / sinh uuidv7), log 1 dòng mỗi request kèm traceId, AppModule đủ 19 domain.
import { Writable } from 'node:stream';
import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DOMAINS, FixedClock, CLOCK, LOGGER, UUID_V7, createLogger } from '@appchat/core';
import { Test } from '@nestjs/testing';
import { AppModule, DOMAIN_HTTP_MODULES } from '../src/app.module';
import { traceMiddleware } from '../src/middleware/trace.middleware';

const lines: Record<string, unknown>[] = [];
const sink = new Writable({
  write(chunk, _e, cb) {
    lines.push(JSON.parse(String(chunk)) as Record<string, unknown>);
    cb();
  },
});
const log = createLogger({ level: 'info', destination: sink });
let app: INestApplication;
let base: string;

beforeAll(async () => {
  const mod = await Test.createTestingModule({ imports: [AppModule.forRoot({})] })
    .overrideProvider(CLOCK)
    .useValue(new FixedClock('2026-10-30T07:00:00.000Z'))
    .overrideProvider(LOGGER)
    .useValue(log)
    .compile();
  app = mod.createNestApplication({ logger: false });
  app.setGlobalPrefix('v1');
  app.use(traceMiddleware(log));
  await app.listen(0);
  base = await app.getUrl();
});

afterAll(() => app?.close());

const requestLines = () => lines.filter((l) => l.msg === 'request');

describe('api', () => {
  it('GET /v1/health → 200 envelope { data }, X-Request-Id sinh mới là uuidv7', async () => {
    const res = await fetch(`${base}/v1/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: { status: 'ok', service: 'api', time: '2026-10-30T07:00:00.000Z' } });
    expect(res.headers.get('x-request-id')).toMatch(UUID_V7);
  });

  it('X-Request-Id hợp lệ được trả lại và có trong dòng log request', async () => {
    const before = requestLines().length;
    const res = await fetch(`${base}/v1/health?phone=0907711888`, { headers: { 'X-Request-Id': 'abc-123' } });
    expect(res.headers.get('x-request-id')).toBe('abc-123');
    await new Promise((r) => setTimeout(r, 20));
    const added = requestLines().slice(before);
    expect(added).toHaveLength(1);
    expect(added[0]).toMatchObject({
      level: 'info', traceId: 'abc-123', source: 'http', method: 'GET', path: '/v1/health', status: 200,
    });
    expect(JSON.stringify(added[0])).not.toContain('0907711888');
  });

  it('X-Request-Id không hợp lệ → sinh mới', async () => {
    const res = await fetch(`${base}/v1/health`, { headers: { 'X-Request-Id': 'x'.repeat(129) } });
    expect(res.headers.get('x-request-id')).toMatch(UUID_V7);
  });

  it('route lạ → 404 vẫn có X-Request-Id', async () => {
    const res = await fetch(`${base}/v1/khong-co`);
    expect(res.status).toBe(404);
    expect(res.headers.get('x-request-id')).toMatch(UUID_V7);
  });

  it('AppModule đăng ký đủ 19 domain HTTP module', () => {
    expect(DOMAIN_HTTP_MODULES).toHaveLength(DOMAINS.length);
    const names = DOMAIN_HTTP_MODULES.map((m) => m.name);
    for (const d of DOMAINS) expect(names).toContain(`${d[0]!.toUpperCase()}${d.slice(1)}HttpModule`);
  });
});
