// TIP-003d — dựng spec OpenAPI 3.1 (unit): document hợp lệ theo schema chính thức OAS 3.1 (fixture spec.openapis.org 2022-10-07),
// mọi action có operation riêng với input / output schema + Idempotency-Key bắt buộc đúng luật executor, route nội bộ / webhook không lộ,
// route công khai `security: []`, đường dẫn `:id` → `{id}`. Validator tối giản ở fixtures/json-schema-lite.ts (không thêm thư viện).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Controller, Get, Post } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { registry, requiresIdempotencyKey } from '@appchat/actions';
import { buildDocument, untypedCount } from '../src/openapi/document';
import { scanRoutes, toOpenApiPath } from '../src/openapi/route-scan';
import { validator } from './fixtures/json-schema-lite';

const OAS = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures', 'openapi-3.1.schema.json'), 'utf8')) as Record<string, unknown>;
const validate = validator(OAS);

@Controller('contacts')
class ContactsCtl {
  private readonly env: Record<string, string> | undefined = undefined;
  /** Getter trên prototype phụ thuộc state instance — quét không được gọi (lỗi thật ở AuthController). */
  get secure(): boolean {
    return this.env!.COOKIE_SECURE === 'true';
  }
  @Get()
  list() {}
  @Get(':id')
  one() {}
}
@Controller()
class KernelCtl {
  @Post('actions/:id')
  run() {}
  @Get('metrics')
  metrics() {}
  @Get('docs')
  docs() {}
  @Post('hooks/payments/:provider')
  hook() {}
  @Post('auth/otp/send')
  otp() {}
}
const discovery = { getControllers: () => [ContactsCtl, KernelCtl].map((metatype) => ({ metatype })) } as never;

describe('route-scan', () => {
  it('ghép prefix /v1, `:id` → `{id}`; bỏ /metrics, /v1/docs, /hooks/*; không gọi getter của controller', () => {
    const r = scanRoutes(discovery).map((x) => `${x.method} ${x.path} ${x.tag}`);
    expect(r).toEqual(['post /v1/actions/{id} actions', 'post /v1/auth/otp/send auth', 'get /v1/contacts contacts', 'get /v1/contacts/{id} contacts']);
    expect(toOpenApiPath('/hooks/{*path}')).toBe('/hooks/{path}');
  });
});

describe('document', () => {
  const doc = buildDocument({ routes: scanRoutes(discovery), actions: registry, version: 'test' });

  it('hợp lệ OpenAPI 3.1 theo schema chính thức (AC1)', () => {
    expect(doc.openapi).toBe('3.1.0');
    expect(validate(doc)).toEqual([]);
  });

  it('validator thật sự bắt lỗi (không phải luôn rỗng)', () => {
    expect(validate({ openapi: '3.1.0', paths: {} }).map((e) => e.keyword)).toContain('required:info');
    expect(validate({ ...doc, openapi: '2.0' }).length).toBeGreaterThan(0);
    expect(validate({ ...doc, paths: { 'no-slash': {} } }).length).toBeGreaterThan(0);
  });

  it('mỗi action một operation có input / output schema; Idempotency-Key bắt buộc đúng luật executor (AC2)', () => {
    for (const a of registry) {
      type Op = {
        requestBody: { content: Record<string, { schema: { properties: { input: unknown } } }> };
        responses: Record<string, { content: Record<string, { schema: { properties: { data: { properties: { result: unknown } } } } }> }>;
        parameters: { name: string; required: boolean }[];
        'x-risk': string;
      };
      const op = doc.paths[`/v1/actions/${a.id}`]?.post as Op | undefined;
      expect(op, a.id).toBeDefined();
      expect(op!.requestBody.content['application/json']!.schema.properties.input, a.id).toBeTypeOf('object');
      expect(op!.responses['200']!.content['application/json']!.schema.properties.data.properties.result, a.id).toBeTypeOf('object');
      expect(op!['x-risk']).toBe(a.risk);
      expect(op!.parameters.find((p) => p.name === 'Idempotency-Key')!.required, a.id).toBe(requiresIdempotencyKey(a.id, a.risk));
    }
    // Cổng chung được thay bằng operation từng action.
    expect(doc.paths['/v1/actions/{id}']).toBeUndefined();
  });

  it('route công khai không yêu cầu đăng nhập; route khác dùng bearer + workspace; untyped được đếm', () => {
    expect(doc.paths['/v1/auth/otp/send']!.post!.security).toEqual([]);
    expect(doc.paths['/v1/contacts/{id}']!.get!.security).toBeUndefined();
    expect(doc.security).toEqual([{ bearer: [], workspace: [] }]);
    expect(doc.paths['/v1/contacts/{id}']!.get!.parameters).toEqual([{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }]);
    expect(untypedCount(doc)).toBe(3);
  });

  it('không chứa secret / URL nội bộ', () => {
    const s = JSON.stringify(doc);
    expect(s).not.toMatch(/postgres(ql)?:\/\/|redis:\/\/|localhost|127\.0\.0\.1|\/hooks\/|\/metrics/);
  });
});
