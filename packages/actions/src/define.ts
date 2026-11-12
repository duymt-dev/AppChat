// ActionDef (Blueprint §3.1, standards/actions/action-registry.md). Chỉ schema + metadata — handler ở packages/core.
import type { z } from 'zod';
import type { PermissionKey } from '@appchat/shared';

export type Risk = 'read' | 'write' | 'send' | 'money' | 'delete' | 'config';
export type Permission = PermissionKey | 'platform_admin' | 'self';

export type ModuleKey =
  | 'identity' | 'settings' | 'channels' | 'inbox' | 'crm' | 'catalog' | 'sales' | 'documents'
  | 'booking' | 'support' | 'marketing' | 'loyalty' | 'ai' | 'billing' | 'integrations' | 'notifications' | 'insights';

export type UiCommand =
  | { type: 'navigate'; route: string }
  | { type: 'open'; entity: string; id: string; view?: 'drawer' | 'page' }
  | { type: 'prefill'; form: string; values: Record<string, unknown> }
  | { type: 'filter'; table: string; filter: Record<string, unknown> }
  | { type: 'highlight'; target: string };

export interface ActionDef<I extends z.ZodTypeAny = z.ZodTypeAny, O extends z.ZodTypeAny = z.ZodTypeAny> {
  id: string;
  module: ModuleKey;
  /** i18n key `actions.<id>.title` */
  title: string;
  /** English, written for the LLM tool catalogue. */
  description: string;
  input: I;
  output: O;
  permission: Permission;
  risk: Risk;
  bulk?: boolean;
  agentGrantable: boolean;
  /**
   * `internal` (TIP-003c §1.1): action hệ thống riêng — chỉ chạy với capability gắn nguồn do domain cấp (kernel/actions/system); không
   * bao giờ vào menu / tool grant / khám phá / corpus embedding; không thể agentGrantable. Mặc định `public`.
   */
  exposure?: 'public' | 'internal';
  /** Nhóm "Kỹ năng AI" trong Builder Tools — chỉ action đọc (risk 'read') hữu ích cho AI trực kênh (D51). */
  skill?: boolean;
  /** Key connector/channel cần kết nối để tool chạy được — Builder hiện badge "Cần kết nối X" (D51 §3.3b). */
  requiresConnector?: string;
  undo?: { windowSec: number };
  /**
   * Nguồn LUÔN phải qua duyệt thật (TIP-015d, D32) — bất kể risk / autoSend / hội thoại đang phục vụ / thẻ xác nhận. Nguồn lấy từ ngữ
   * cảnh tin cậy (045b), model / người gọi không tự khai được. Thẻ xác nhận của Trợ lý không thay cho duyệt.
   */
  requiredApprovalSources?: readonly ('assistant' | 'agent' | 'task')[];
  invalidates: string[];
  db?: 'platform';
  uiTarget?: (o: z.infer<O>) => UiCommand;
  /**
   * Ô bí mật trong input (DC-227, TIP-023c): `paths` = đường dẫn chấm cố định (`fields.password`); `connector` = ô dưới `fields`
   * theo `ConnectorManifest.auth.fields[].secret` của provider ở ô `provider`. Executor che trong action_log; Trợ lý không nhận giá
   * trị từ model (chỉ form trình duyệt gửi thẳng); form GenUI hiện ô password.
   */
  secret?: SecretSpec;
}

export interface SecretSpec {
  paths?: string[];
  connector?: { provider: string; fields: string };
}

export const defineAction = <I extends z.ZodTypeAny, O extends z.ZodTypeAny>(d: ActionDef<I, O>): ActionDef<I, O> => {
  if (d.exposure === 'internal' && d.agentGrantable) throw new Error(`action ${d.id}: internal không thể agentGrantable`);
  return d;
};

/**
 * Gửi / duyệt chứng từ có bảng kiểm pháp lý trong preview (TIP-028b, templates.md §6, DC-444): UI XIN xem trước (`x-action-preview: 1`)
 * để người dùng thấy bảng kiểm trước khi gửi — nguồn vốn chạy thẳng đổi thành xem trước; quyết định khác (duyệt / cấm) giữ nguyên.
 */
export const REQUESTABLE_PREVIEW_ACTIONS: ReadonlySet<string> = new Set(['quote.send', 'contract.submit', 'contract.approve_and_sign', 'contract.send_for_signature', 'invoice.send_payment_qr', 'ticket_categories.replace']);

/** Action hệ thống riêng (TIP-003c) — loại khỏi mọi bề mặt công khai. */
export const isInternalAction = (d: Pick<ActionDef, 'exposure'>): boolean => d.exposure === 'internal';
/** Cấp được cho agent: `agentGrantable` VÀ không internal (phòng thủ kép — registry đã chặn tổ hợp này lúc define). */
export const isAgentGrantable = (d: Pick<ActionDef, 'exposure' | 'agentGrantable'>): boolean => !!d.agentGrantable && !isInternalAction(d);

/**
 * "Quên khách" (TIP-015c §1.3): không thể đảo ngược — bắt buộc Idempotency-Key dù risk không phải send/money/create, để gửi lại
 * cùng khoá không lặp hiệu ứng không thể hoàn tác. `privacy.review_resolve` / `contact.allow_recreation` thêm vào đây khi có action +
 * handler thật (pha sau).
 */
const PRIVACY_IDEMPOTENT_ACTIONS: ReadonlySet<string> = new Set(['contact.forget', 'privacy.review_resolve', 'contact.allow_recreation']);
/** Điều khiển kế hoạch Cowork (TIP-023d §1.6): mọi lệnh ghi cần khoá ổn định — gửi lại trả đúng biên nhận, không thêm đợt dừng / root. */
const PLAN_IDEMPOTENT_ACTIONS: ReadonlySet<string> = new Set(['assistant.plan_request_edit', 'assistant.plan_update', 'assistant.plan_resume', 'assistant.plan_reuse']);

/** Idempotency-Key bắt buộc: risk send / money và lệnh tạo (response-envelope §7) — executor kiểm, FE `useAction` tự gửi. */
export function requiresIdempotencyKey(actionId: string, risk: Risk): boolean {
  return risk === 'send' || risk === 'money' || /\.create$/.test(actionId) || PRIVACY_IDEMPOTENT_ACTIONS.has(actionId) || PLAN_IDEMPOTENT_ACTIONS.has(actionId);
}

export type ActionInput<D> = D extends ActionDef<infer I, z.ZodTypeAny> ? z.input<I> : never;
export type ActionOutput<D> = D extends ActionDef<z.ZodTypeAny, infer O> ? z.output<O> : never;

/** Kết quả thống nhất của POST /v1/actions/:id (Blueprint §4.3). */
export interface ActionResult<O = unknown> {
  result: O;
  action_log_id: string;
  undo_until?: string;
  ui_target?: UiCommand;
}

/**
 * Mục bảng kiểm pháp lý của chứng từ trong preview gửi / duyệt (templates.md §6, TIP-028b) — cảnh báo, không chặn (COMMERCE, DC-444).
 * `hint`: `template` = mẫu thiếu mục · `empty:<biến>` = mẫu có biến nhưng dữ liệu trống (vd. MST bên bán chưa khai).
 */
export interface ChecklistItem {
  code: string;
  ok: boolean;
  hint?: string;
}

export interface ActionPreview {
  summary: string;
  risk: Risk;
  count?: number;
  changes?: { entity: string; id?: string; before?: Record<string, unknown>; after?: Record<string, unknown> }[];
  warnings?: string[];
  checklist?: ChecklistItem[];
}

/** 202 của POST /v1/actions/:id (Blueprint §4.3). `job_accepted` (TIP-032b): yêu cầu đã ghi + xếp việc nền — CHƯA hoàn tất; tiến độ
 * đọc ở `status_url`, gửi lại cùng Idempotency-Key trả đúng handle này (không xếp việc lần hai). */
export type ActionAccepted =
  | { status: 'preview_required'; preview: ActionPreview; confirm_token: string; expires_at: string }
  | { status: 'approval_required'; approval_id: string }
  | { status: 'job_accepted'; job_id: string; action_log_id: string; status_url: string }
  /**
   * Action `db: 'platform'` đã commit ở DB nền tảng nhưng pha tenant chưa áp (TIP-045b annex A1): KHÔNG phải thành công, không phải
   * việc nền xếp hàng — hệ thống tự khôi phục; gửi lại cùng Idempotency-Key trả kết quả khi xong (không tạo thay đổi mới).
   */
  | { status: 'operation_pending'; operation_id: string; action_log_id: string; status_url: string };
