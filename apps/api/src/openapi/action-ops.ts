// Operation OpenAPI cho từng action (TIP-003d SPEC 1.2): `POST /v1/actions/{id}` của registry → một path riêng mỗi action
// (`/v1/actions/contact.create`), input / output zod → JSON Schema 2020-12 (zod 4 `toJSONSchema`, dialect OpenAPI 3.1), `x-risk`,
// `x-permission`, header `Idempotency-Key` bắt buộc khi tạo / send / money (requiresIdempotencyKey — cùng luật executor). 200 = kết quả
// thống nhất; 202 = preview / duyệt / việc nền / thao tác chờ áp (ActionAccepted).
import { z } from 'zod';
import { requiresIdempotencyKey, type ActionDef } from '@appchat/actions';

type Schema = Record<string, unknown>;
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });

/** zod → JSON Schema (bỏ `$schema` — document đã khai `jsonSchemaDialect`). Kiểu không biểu diễn được → `{}` thay vì ném. */
export function jsonSchemaOf(t: z.ZodType, io: 'input' | 'output'): Schema {
  const { $schema: _s, ...rest } = z.toJSONSchema(t, { io, unrepresentable: 'any', target: 'draft-2020-12' }) as Schema;
  void _s;
  return rest;
}

/** Schema dùng chung của mọi action (components). */
export const ACTION_COMPONENTS: Record<string, Schema> = {
  UiCommand: { type: 'object', additionalProperties: true },
  ActionPreview: {
    type: 'object',
    required: ['summary', 'risk'],
    properties: {
      summary: { type: 'string' },
      risk: { type: 'string' },
      count: { type: 'integer' },
      changes: { type: 'array', items: { type: 'object', additionalProperties: true } },
      warnings: { type: 'array', items: { type: 'string' } },
    },
  },
  ActionAccepted: {
    oneOf: [
      { type: 'object', required: ['status', 'preview', 'confirm_token', 'expires_at'], properties: { status: { const: 'preview_required' }, preview: ref('ActionPreview'), confirm_token: { type: 'string' }, expires_at: { type: 'string', format: 'date-time' } } },
      { type: 'object', required: ['status', 'approval_id'], properties: { status: { const: 'approval_required' }, approval_id: { type: 'string' } } },
      { type: 'object', required: ['status', 'job_id', 'action_log_id', 'status_url'], properties: { status: { const: 'job_accepted' }, job_id: { type: 'string' }, action_log_id: { type: 'string' }, status_url: { type: 'string' } } },
      { type: 'object', required: ['status', 'operation_id', 'action_log_id', 'status_url'], properties: { status: { const: 'operation_pending' }, operation_id: { type: 'string' }, action_log_id: { type: 'string' }, status_url: { type: 'string' } } },
    ],
  },
};

const IDEMPOTENCY = (required: boolean) => ({
  name: 'Idempotency-Key',
  in: 'header',
  required,
  description: required ? 'Bắt buộc với lệnh tạo và risk send / money (response-envelope §7).' : 'Tuỳ chọn: gửi lại cùng khoá trả đúng kết quả cũ.',
  schema: { type: 'string', maxLength: 200 },
});

/** Path + operation của một action. `responses` dùng envelope `{ data }` / `{ error }` của document (ref theo tên). */
export function actionOperation(a: ActionDef): { path: string; op: Schema } {
  const idem = requiresIdempotencyKey(a.id, a.risk);
  const body = {
    type: 'object',
    properties: {
      input: jsonSchemaOf(a.input, 'input'),
      confirm_token: { type: 'string', description: 'Token xác nhận từ 202 preview_required (10 phút, một lần).' },
      secret_vault: { type: 'string', maxLength: 80 },
    },
  };
  const result = { type: 'object', required: ['result', 'action_log_id'], properties: { result: jsonSchemaOf(a.output, 'output'), action_log_id: { type: 'string' }, undo_until: { type: 'string', format: 'date-time' }, ui_target: ref('UiCommand') } };
  return {
    path: `/v1/actions/${a.id}`,
    op: {
      operationId: `action_${a.id.replace(/\W/g, '_')}`,
      tags: [`actions:${a.module}`],
      summary: a.id,
      description: a.description,
      'x-risk': a.risk,
      'x-permission': a.permission,
      'x-agent-grantable': a.agentGrantable,
      ...(a.bulk ? { 'x-bulk': true } : {}),
      parameters: [
        IDEMPOTENCY(idem),
        { name: 'x-action-source', in: 'header', required: false, schema: { type: 'string', enum: ['ui', 'assistant', 'api'] } },
        // TIP-028b: xin xem trước (bảng kiểm chứng từ) — chỉ có tác dụng với action gửi / duyệt chứng từ.
        { name: 'x-action-preview', in: 'header', required: false, schema: { type: 'string', enum: ['1'] } },
      ],
      requestBody: { required: true, content: { 'application/json': { schema: body } } },
      responses: {
        '200': { description: 'Đã thực hiện', content: { 'application/json': { schema: { type: 'object', required: ['data'], properties: { data: result } } } } },
        '202': { description: 'Cần xác nhận / chờ duyệt / việc nền / thao tác chờ áp', content: { 'application/json': { schema: { type: 'object', required: ['data'], properties: { data: ref('ActionAccepted') } } } } },
        default: { $ref: '#/components/responses/Error' },
      },
    },
  };
}
