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
}

export const AUTHORIZER = Symbol('AUTHORIZER');
