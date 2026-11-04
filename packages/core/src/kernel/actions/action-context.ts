// Ngữ cảnh một lần gọi action (Blueprint §3.2) + port quyền (DC-010: TIP-005 cài Authorizer thật từ role / team).
import type { Risk } from '@appchat/actions';
import type { AuthzContext, PermissionKey } from '@appchat/shared';
import type { PlatformDb, TenantDb } from '@appchat/db';

export type ActionSource = 'ui' | 'assistant' | 'agent' | 'task' | 'system' | 'api';
export type ActorType = 'user' | 'agent' | 'assistant' | 'system';

export interface ActionContext {
  workspaceId: string;
  source: ActionSource;
  actor: { type: ActorType; id: string };
  /** assistant / task / agent được giao luôn mang user gốc → quyền = quyền user đó (§3.3b). */
  onBehalfOfUserId?: string;
  runId?: string;
  stepId?: string;
  idempotencyKey?: string;
  confirmToken?: string;
  /** Chạy action đã được duyệt (job `ai-resume` — TIP-021): executor bỏ bước policy `approval`, gateway kiểm + đánh dấu đã chạy. */
  approvalId?: string;
  /**
   * Agent trực kênh: hội thoại đang phục vụ (TIP-022). Action `send` nhận `conversation_id` trùng giá trị này chạy luôn
   * (Blueprint §3.3 "chỉ trả lời trong hội thoại đang phục vụ"); gửi nơi khác vẫn qua duyệt.
   */
  servedConversationId?: string;
  /**
   * Tác vụ Cowork tắt "Hỏi xác nhận trước khi gửi ra bên ngoài" (REQ-E13, Blueprint §3.3 dòng `task` — "approval nếu ask_before_send"):
   * action `send` chạy luôn; delete / money vẫn qua duyệt.
   */
  autoSend?: boolean;
  /** Action `db: 'platform'`: id thao tác xuyên DB (TIP-045b) — handler dùng cho đặt chỗ hạn mức / id tất định. */
  operationId?: string;
  /** Quyền + data scope của người hiệu lực — handler dùng để lọc scope (SCOPE_FORBIDDEN). */
  authz: AuthzContext;
}

/** Transaction tenant truyền cho handler (Prisma interactive transaction). */
export type TenantTx = Parameters<Parameters<TenantDb['$transaction']>[0]>[0];

/** Transaction DB nền tảng cho action `db: 'platform'` (Blueprint §3.2 bước 6) — handler nhận qua tham số thứ tư. */
export type PlatformTx = Parameters<Parameters<PlatformDb['$transaction']>[0]>[0];

export interface Authorizer {
  /** Quyền hiệu lực của ctx cho permission của action (`self` = luôn được; `platform_admin` = admin nền tảng). */
  can(ctx: ActionContext, permission: PermissionKey | 'platform_admin' | 'self'): boolean | Promise<boolean>;
}

export interface ActionPolicyInput {
  source: ActionSource;
  risk: Risk;
  bulk?: boolean;
  /** Agent gửi vào chính hội thoại đang phục vụ (§3.3). */
  servedConversation?: boolean;
  /** Tác vụ không hỏi trước khi gửi (ActionContext.autoSend). */
  autoSend?: boolean;
  /** Id action — FORCE_APPROVAL theo action (policy.ts). */
  actionId?: string;
}

export const AUTHORIZER = Symbol('AUTHORIZER');
