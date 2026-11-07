// TIP-003d — /v1/docs trên app thật (integration): spec hợp lệ OpenAPI 3.1 (AC1), MỌI route Nest đã đăng ký có trong spec (trừ webhook
// /hooks/*, /metrics, chính /v1/docs) và mọi action có input / output schema (AC2), production tắt docs → 404 (AC3), số operation
// `x-untyped` không vượt baseline (AC4 — chỉ được giảm; giảm thì hạ baseline). ETag theo SHA build → 304.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { DiscoveryService } from '@nestjs/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { registry } from '@appchat/actions';
import { env, startApi, type Harness } from './setup';
import { validator } from '../fixtures/json-schema-lite';

/** Baseline số operation chưa có schema (route đọc / ghi chưa DTO zod). Giảm được thì hạ số này; tăng là lỗi. */
const UNTYPED_BASELINE = 175;

const validate = validator(JSON.parse(readFileSync(join(import.meta.dirname, '..', 'fixtures', 'openapi-3.1.schema.json'), 'utf8')) as Record<string, unknown>);
type Doc = { openapi: string; paths: Record<string, Record<string, { 'x-untyped'?: boolean }>> };

let h: Harness;
let doc: Doc;

beforeAll(async () => {
  h = await startApi();
  const r = await fetch(`${h.base}/v1/docs`);
  expect(r.status).toBe(200);
  doc = (await r.json()) as Doc;
}, 120_000);
afterAll(async () => h?.close());

/** Route Nest thật (độc lập với route-scan.ts): method + path ghép như prefix.ts. */
function nestRoutes(): string[] {
  const out: string[] = [];
  const verbs: Partial<Record<RequestMethod, string>> = { [RequestMethod.GET]: 'get', [RequestMethod.POST]: 'post', [RequestMethod.PUT]: 'put', [RequestMethod.PATCH]: 'patch', [RequestMethod.DELETE]: 'delete' };
  for (const w of h.app.get(DiscoveryService).getControllers()) {
    const t = w.metatype as { prototype?: Record<string, unknown> } | null;
    if (!t?.prototype) continue;
    const base = String(Reflect.getMetadata(PATH_METADATA, t) ?? '');
    for (const k of Object.getOwnPropertyNames(t.prototype)) {
      const fn = Object.getOwnPropertyDescriptor(t.prototype, k)?.value as unknown;
      if (typeof fn !== 'function' || k === 'constructor') continue;
      const v = verbs[Reflect.getMetadata(METHOD_METADATA, fn) as RequestMethod];
      const sub = Reflect.getMetadata(PATH_METADATA, fn) as string | undefined;
      if (!v || sub === undefined) continue;
      const raw = `/${[base, sub].map((p) => p.replace(/^\/+|\/+$/g, '')).filter(Boolean).join('/')}`;
      const full = /^\/(hooks\/|widget\.js$|metrics$)/.test(raw) ? raw : `/v1${raw === '/' ? '' : raw}`;
      out.push(`${v} ${full.replace(/\{\*(\w+)\}/g, '{$1}').replace(/:(\w+)/g, '{$1}')}`);
    }
  }
  return out;
}

describe('GET /v1/docs', () => {
  it('AC1: JSON hợp lệ OpenAPI 3.1 theo schema chính thức', () => {
    expect(doc.openapi).toBe('3.1.0');
    expect(validate(doc)).toEqual([]);
  });

  it('AC2: mọi route API có trong spec (trừ webhook / metrics / docs); mọi action có operation riêng', () => {
    const inSpec = new Set(Object.entries(doc.paths).flatMap(([p, ops]) => Object.keys(ops).map((m) => `${m} ${p}`)));
    const routes = nestRoutes().filter((r) => !/ \/(hooks\/|metrics$|v1\/docs)/.test(r) && r !== 'post /v1/actions/{id}');
    expect(routes.length).toBeGreaterThan(150);
    expect(routes.filter((r) => !inSpec.has(r))).toEqual([]);
    for (const a of registry) expect(inSpec.has(`post /v1/actions/${a.id}`), a.id).toBe(true);
    expect([...inSpec].filter((r) => /\/hooks\/|\/metrics$/.test(r))).toEqual([]);
  });

  it('AC4: số operation x-untyped không vượt baseline (chỉ được giảm)', () => {
    const n = Object.values(doc.paths).reduce((s, ops) => s + Object.values(ops).filter((o) => o['x-untyped']).length, 0);
    expect(n).toBeLessThanOrEqual(UNTYPED_BASELINE);
  });

  it('ETag theo SHA build → 304; trang /v1/docs/ui là HTML không script', async () => {
    const r = await fetch(`${h.base}/v1/docs`);
    const etag = r.headers.get('etag')!;
    expect(etag).toMatch(/^"oas-/);
    expect((await fetch(`${h.base}/v1/docs`, { headers: { 'if-none-match': etag } })).status).toBe(304);
    const ui = await fetch(`${h.base}/v1/docs/ui`);
    expect(ui.status).toBe(200);
    expect(ui.headers.get('content-type')).toContain('text/html');
    const html = await ui.text();
    expect(html).toContain('/v1/actions/contact.create');
    expect(html).not.toMatch(/<script|https?:\/\/(?!spec\.)/i);
  });
});

describe('API_DOCS tắt (production)', () => {
  // ENV_SOURCE truyền theo tham chiếu (KernelModule.forRoot) và cổng docs đọc mỗi request → đổi tạm env của app đang chạy (khởi động lại
  // với NODE_ENV=production bị kiểm env production chặn — MAIL_PROVIDER console). Khôi phục ngay sau test.
  it('AC3: production không đặt API_DOCS=1 → /v1/docs và /v1/docs/ui trả 404 envelope chuẩn; API_DOCS=1 → bật lại', async () => {
    const saved = { NODE_ENV: env.NODE_ENV, API_DOCS: env.API_DOCS };
    try {
      env.NODE_ENV = 'production';
      delete env.API_DOCS;
      const r = await fetch(`${h.base}/v1/docs`);
      expect(r.status).toBe(404);
      expect(((await r.json()) as { error: { code: string } }).error.code).toBe('NOT_FOUND');
      expect((await fetch(`${h.base}/v1/docs/ui`)).status).toBe(404);
      env.API_DOCS = '1';
      expect((await fetch(`${h.base}/v1/docs`)).status).toBe(200);
    } finally {
      Object.assign(env, saved);
      if (saved.API_DOCS === undefined) delete env.API_DOCS;
    }
  });
});
