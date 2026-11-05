// Dựng document OpenAPI 3.1 (TIP-003d): route Nest thật (route-scan.ts) + một operation mỗi action (action-ops.ts). Route đọc chưa có
// DTO zod → schema `data` = `{}` kèm `x-untyped: true` (đếm ở test — chỉ được giảm). Envelope chuẩn (response-envelope.md):
// `{ data }` / `{ data, next_cursor }` / `{ error: { code, message, fields? } }`. Bảo mật: bearer JWT + `x-workspace-id`; route công khai
// (auth, trang ký / xem báo giá công khai, health, widget) khai `security: []`. Không chứa secret / URL nội bộ.
import type { ActionDef } from '@appchat/actions';
import { channelHistoryRunSchema, channelOperationSchema } from '@appchat/shared';
import type { ScannedRoute } from './route-scan';
import { ACTION_COMPONENTS, actionOperation, jsonSchemaOf } from './action-ops';

type Schema = Record<string, unknown>;
export interface OpenApiDocument {
  openapi: '3.1.0';
  info: { title: string; version: string; description: string };
  jsonSchemaDialect: string;
  servers: { url: string }[];
  tags: { name: string }[];
  paths: Record<string, Record<string, Schema>>;
  components: Schema;
  security: Record<string, string[]>[];
}

/** Route không cần đăng nhập (đăng nhập / đăng ký / OTP, trang công khai, health, widget). */
const PUBLIC = /^\/(v1\/(auth|public|health|business-lookup)(\/|$)|widget\.js$)/;
const DATA = { $ref: '#/components/schemas/Data' };
const LIST = { $ref: '#/components/schemas/Page' };

const params = (path: string) =>
  [...path.matchAll(/\{([A-Za-z_]\w*)\}/g)].map((m) => ({ name: m[1]!, in: 'path', required: true, schema: { type: 'string' } }));

/** GET không có tham số cuối → danh sách (có thể có next_cursor); còn lại → `{ data }`. */
const isList = (r: ScannedRoute) => r.method === 'get' && !/\}$/.test(r.path) && !/(\/counts|\/stats|\/me|\/board|\/overview|\/summary)$/.test(r.path);

/** Route đọc đã có DTO zod chung (shared) → schema `data` thật, không `x-untyped`. Thêm route mới có DTO vào đây. */
const TYPED: Record<string, () => Schema> = {
  'get /v1/settings/channels/{id}/syncs/{runId}': () => ({ type: 'object', required: ['data'], properties: { data: jsonSchemaOf(channelHistoryRunSchema, 'output') } }),
  'get /v1/inbox/channel-operations/{id}': () => ({ type: 'object', required: ['data'], properties: { data: jsonSchemaOf(channelOperationSchema, 'output') } }),
};

function routeOperation(r: ScannedRoute): Schema {
  const typed = TYPED[`${r.method} ${r.path}`];
  const ok = typed ? typed() : isList(r) ? LIST : DATA;
  return {
    operationId: `${r.controller}_${r.handler}`.replace(/\W/g, '_'),
    tags: [r.tag],
    ...(typed ? {} : { 'x-untyped': true }),
    parameters: params(r.path),
    ...(r.method === 'get' || r.method === 'delete' ? {} : { requestBody: { required: false, content: { 'application/json': { schema: { type: 'object' } } } } }),
    ...(PUBLIC.test(r.path) ? { security: [] } : {}),
    responses: {
      '200': { description: 'OK', content: { 'application/json': { schema: ok } } },
      default: { $ref: '#/components/responses/Error' },
    },
  };
}

const COMPONENTS = {
  securitySchemes: {
    bearer: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    workspace: { type: 'apiKey', in: 'header', name: 'x-workspace-id', description: 'Workspace đang thao tác (membership của người gọi).' },
  },
  schemas: {
    Data: { type: 'object', required: ['data'], properties: { data: {} } },
    Page: { type: 'object', required: ['data'], properties: { data: { type: 'array', items: {} }, next_cursor: { type: ['string', 'null'] } } },
    Error: {
      type: 'object',
      required: ['error'],
      properties: { error: { type: 'object', required: ['code', 'message'], properties: { code: { type: 'string' }, message: { type: 'string' }, fields: { type: 'object', additionalProperties: { type: 'string' } } } } },
    },
    ...ACTION_COMPONENTS,
  },
  responses: { Error: { description: 'Lỗi theo envelope chuẩn', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } } },
};

export function buildDocument(o: { routes: readonly ScannedRoute[]; actions: readonly ActionDef[]; version: string }): OpenApiDocument {
  const paths: OpenApiDocument['paths'] = {};
  for (const r of o.routes) {
    // Cổng chung POST /v1/actions/{id} được mô tả bằng operation riêng của từng action bên dưới.
    if (r.path === '/v1/actions/{id}' && r.method === 'post') continue;
    (paths[r.path] ??= {})[r.method] = routeOperation(r);
  }
  for (const a of o.actions) {
    const { path, op } = actionOperation(a);
    (paths[path] ??= {}).post = op;
  }
  const tags = [...new Set(Object.values(paths).flatMap((p) => Object.values(p).flatMap((op) => op.tags as string[])))].sort().map((name) => ({ name }));
  return {
    openapi: '3.1.0',
    info: { title: 'AppChat API', version: o.version, description: 'Tự sinh từ route Nest + Action Registry (TIP-003d). Ghi nghiệp vụ chỉ qua POST /v1/actions/{id}.' },
    jsonSchemaDialect: 'https://spec.openapis.org/oas/3.1/dialect/base',
    servers: [{ url: '/' }],
    tags,
    paths,
    components: COMPONENTS,
    security: [{ bearer: [], workspace: [] }],
  };
}

/** Số operation chưa có schema (route đọc / ghi chưa DTO zod) — baseline ở test, chỉ được giảm. */
export const untypedCount = (d: OpenApiDocument) => Object.values(d.paths).reduce((n, p) => n + Object.values(p).filter((op) => op['x-untyped'] === true).length, 0);
