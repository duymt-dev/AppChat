// Trợ lý AI (TIP-023, Blueprint §4.4 assistant / §4.5) — đúng hợp đồng FE `features/assistant/types.ts`: lượt hội thoại trả một lần
// `{ session_id, run_id, events[] }` (FE chưa đọc SSE — DV-006), thẻ xác nhận phẳng, nhật ký hành động, phiên + tin đã lưu.
import { z } from 'zod';

const tier = z.enum(['standard', 'advanced', 'max']);
export const assistantModeSchema = z.enum(['chat', 'cowork']);

const uiCommandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('navigate'), route: z.string().startsWith('/').max(300) }),
  z.object({ type: z.literal('open'), entity: z.string().max(40), id: z.string().max(80), view: z.enum(['drawer', 'page']).optional() }),
  z.object({ type: z.literal('prefill'), form: z.string().max(60), values: z.record(z.string(), z.unknown()) }),
  z.object({ type: z.literal('filter'), table: z.string().max(60), filter: z.record(z.string(), z.unknown()) }),
  z.object({ type: z.literal('highlight'), target: z.string().max(120) }),
]);
export { uiCommandSchema };

/** ActionPreview (canonical — `changes`, không `diff`). */
export const previewSchema = z.object({
  summary: z.string(),
  risk: z.string(),
  count: z.number().optional(),
  changes: z.array(z.object({ entity: z.string(), id: z.string().optional(), before: z.record(z.string(), z.unknown()).optional(), after: z.record(z.string(), z.unknown()).optional() })).optional(),
  warnings: z.array(z.string()).optional(),
});

/** Thẻ xác nhận (ChatThread ActionCard) — dựng từ preview của handler hoặc ActionDef. */
export const confirmEventSchema = z.object({
  type: z.literal('confirm'),
  confirm_token: z.string(),
  key: z.string(),
  icon: z.string(),
  color: z.string(),
  action_id: z.string(),
  route: z.string(),
  title: z.string(),
  desc: z.string(),
  dest: z.string(),
  /** ActionPreview chuẩn (`packages/actions` define.ts) — thẻ hiện đổi gì (TIP-023b R2.8); thẻ cũ lưu trước 023b không có. */
  preview: previewSchema.optional(),
  /** Input đã chuẩn hoá mà token gắn (đã bỏ ô bí mật) — form Sửa điền sẵn (REQ-E03b). */
  input: z.record(z.string(), z.unknown()).optional(),
  /** Khuôn input lồng nhau (schema-brief) — form Sửa giữ kiểu object / array / enum. */
  schema: z.record(z.string(), z.unknown()).optional(),
});

export const turnEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('delta'), text: z.string() }),
  confirmEventSchema,
  z.object({ type: z.literal('ui_command'), command: uiCommandSchema }),
  z.object({ type: z.literal('result'), action_log_id: z.string(), summary: z.string() }),
  z.object({ type: z.literal('error'), code: z.string(), message: z.string() }),
]);

export const assistantTurnSchema = z.object({ session_id: z.string(), run_id: z.string().nullable(), events: z.array(turnEventSchema) });

export const assistantConfirmSchema = z.object({
  status: z.enum(['done', 'cancelled', 'approval_required']),
  action_log_id: z.string().optional(),
  approval_id: z.string().optional(),
  ui_target: uiCommandSchema.optional(),
  events: z.array(turnEventSchema),
});

/** `POST /assistant/preview-edit`: sửa input của thẻ → xem trước lại (không thực thi) → thẻ mới, token cũ mất hiệu lực. */
export const assistantEditSchema = z.object({ card: confirmEventSchema });

export const assistantHomeSchema = z.object({
  think_cards: z.array(z.object({ label: z.string(), desc: z.string(), color: z.string(), icon: z.string(), tag: z.string(), command: z.string() })),
  cowork_cards: z.array(z.object({ id: z.string(), name: z.string(), desc: z.string(), model_tier: tier, status: z.enum(['active', 'paused']), color: z.string(), icon: z.string() })),
  prompts: z.array(z.string()),
});

export const assistantSessionSchema = z.object({ id: z.string(), title: z.string(), mode: assistantModeSchema, last_message_at: z.string() });
export const assistantMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'ai']),
  text: z.string(),
  card: confirmEventSchema.optional(),
  status: z.enum(['pending', 'done', 'cancelled', 'approval']).optional(),
  run_id: z.string().nullable(),
});

/** Nhật ký hành động (ActionLogScreen) — `GET /v1/action-logs`. */
export const actionLogRowSchema = z.object({
  id: z.string(),
  kind: z.enum(['create', 'update', 'send', 'export', 'delete']),
  title: z.string().optional(),
  object: z.string().optional(),
  day: z.string(),
  time: z.string(),
  undoable: z.boolean(),
  status: z.enum(['done', 'pending']),
  action_id: z.string(),
  undone: z.boolean().optional(),
  source: z.string().optional(),
});
export const actionLogsPageSchema = z.object({ data: z.array(actionLogRowSchema), total: z.number().int(), next_cursor: z.string().nullable() });

export type UiCommandDto = z.infer<typeof uiCommandSchema>;
export type ConfirmEventDto = z.infer<typeof confirmEventSchema>;
export type ActionPreviewDto = z.infer<typeof previewSchema>;
export type AssistantEditDto = z.infer<typeof assistantEditSchema>;
export type TurnEventDto = z.infer<typeof turnEventSchema>;
export type AssistantTurnDto = z.infer<typeof assistantTurnSchema>;
export type AssistantHomeDto = z.infer<typeof assistantHomeSchema>;
export type AssistantSessionDto = z.infer<typeof assistantSessionSchema>;
export type AssistantMessageDto = z.infer<typeof assistantMessageSchema>;
export type ActionLogRowDto = z.infer<typeof actionLogRowSchema>;
