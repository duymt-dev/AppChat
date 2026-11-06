// Ngữ cảnh action quản trị nền tảng (TIP-040, DC-368): `admin.*` (permission `platform_admin`) chạy KHÔNG gắn workspace — không membership,
// không DB tenant, không action_log tenant. Ngữ cảnh chỉ dựng được phía server (`platformContext`, dấu tin cậy riêng của module) sau khi xác
// thực JWT; object tự dựng / header client không thành ngữ cảnh nền tảng. Handler nền tảng có hợp đồng riêng (`PlatformActionHandler`) —
// không ép ngữ cảnh tenant rỗng để dùng lại handler tenant.
import type { ActionPreview } from '@appchat/actions';
import type { PlatformDb } from '@appchat/db';
import { AppError } from '@appchat/shared';
import type { PlatformTx } from './action-context';
import type { HandlerOutcome } from './handler';

const TRUSTED = Symbol('appchat.platform-context');

export interface PlatformContext {
  readonly scope: 'platform';
  /** Chỉ màn quản trị (UI) — Trợ lý / agent / Cowork / system không chạy action quản trị. */
  readonly source: 'ui';
  readonly actor: { readonly type: 'user'; readonly id: string };
  readonly idempotencyKey?: string;
  readonly confirmToken?: string;
}

/** Dựng ngữ cảnh nền tảng — CHỈ gọi sau khi đã xác thực JWT của `userId` (quyền admin vẫn kiểm sống mỗi lần chạy). */
export function platformContext(userId: string, o: { idempotencyKey?: string; confirmToken?: string } = {}): PlatformContext {
  const ctx = { scope: 'platform' as const, source: 'ui' as const, actor: { type: 'user' as const, id: userId }, ...o };
  Object.defineProperty(ctx, TRUSTED, { value: true, enumerable: false });
  return Object.freeze(ctx);
}

export const isTrustedPlatformContext = (c: unknown): c is PlatformContext =>
  !!c && typeof c === 'object' && (c as Record<symbol, unknown>)[TRUSTED] === true && (c as PlatformContext).scope === 'platform';

/** Kết quả handler nền tảng: before / after vào audit nền tảng; `targetWorkspaceId` lấy từ thực thể đã kiểm (không phải workspace UI). */
export interface AdminOutcome<O> {
  result: O;
  before?: unknown;
  after?: unknown;
  targetWorkspaceId?: string | null;
  /** Việc sau commit (vd. ghi nhận hoá đơn đã trả) — tự idempotent + có đường quét lại. */
  afterCommit?: () => Promise<void>;
}

/**
 * Handler action quản trị: ghi trong transaction nền tảng (`ptx`), preview chỉ đọc DB nền tảng. Đăng ký như handler thường
 * (`@ActionHandler`) để registry đủ action; đường tenant (`execute`) luôn bị từ chối.
 */
export abstract class PlatformActionHandler<I = unknown, O = unknown> {
  readonly platformOnly = true as const;
  abstract executePlatform(ctx: PlatformContext, input: I, ptx: PlatformTx): Promise<AdminOutcome<O>>;
  abstract previewPlatform(ctx: PlatformContext, input: I, db: PlatformDb): Promise<ActionPreview>;

  async execute(): Promise<HandlerOutcome<never>> {
    throw new AppError('FORBIDDEN', 403, { scope: 'platform' });
  }
}

export const isPlatformHandler = (h: unknown): h is PlatformActionHandler =>
  !!h && typeof h === 'object' && (h as PlatformActionHandler).platformOnly === true;
