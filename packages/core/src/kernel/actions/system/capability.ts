// Capability gắn nguồn cho action riêng (TIP-003c §1.2): CHỈ ctx object đã niêm phong trong WeakMap riêng của module này mới qua cổng
// Executor — không trường serialize / source='system' / Owner / cờ agent nào đúc được. Capability buộc workspace + action + nguồn
// (kind, ref) + target + generation + digest input chuẩn. Niêm phong do bộ dựng của domain (verifier đã kiểm bằng chứng nguồn đã lưu)
// gọi; gỡ ngay sau lần gọi. Không có helper công khai nhận (action, trusted=true).
import { createHash } from 'node:crypto';
import { AppError } from '@appchat/shared';
import type { ActionContext } from '../action-context';

export type SystemSourceKind = 'event' | 'schedule' | 'ingress' | 'accepted_operation' | 'public_locator';

export interface SystemCapability {
  workspaceId: string;
  actionId: string;
  sourceKind: SystemSourceKind;
  sourceRef: string;
  targetId: string;
  /** Thế hệ domain của mục tiêu (hạn / token / ingest revision…) — không dùng updated_at. */
  generation: string;
  milestone: string;
  inputDigest: string;
}

const SEALED = new WeakMap<ActionContext, Readonly<SystemCapability>>();

export function canonicalDigest(input: unknown): string {
  const canon = (v: unknown): string => {
    if (Array.isArray(v)) return `[${v.map(canon).join(',')}]`;
    if (v && typeof v === 'object') return `{${Object.keys(v as object).sort().map((k) => `${JSON.stringify(k)}:${canon((v as Record<string, unknown>)[k])}`).join(',')}}`;
    return JSON.stringify(v ?? null);
  };
  return createHash('sha256').update(canon(input)).digest('hex');
}

/** Chỉ module system của kernel gọi (qua `runSystemAction`) — ctx phải là object mới do chính nó dựng. */
export function sealSystemContext(ctx: ActionContext, cap: SystemCapability): void {
  if (ctx.source !== 'system' || ctx.actor.type !== 'system') throw new Error('sealSystemContext: ctx không phải ngữ cảnh hệ thống');
  if (ctx.workspaceId !== cap.workspaceId) throw new Error('sealSystemContext: workspace không khớp');
  SEALED.set(ctx, Object.freeze({ ...cap }));
}

export function unsealSystemContext(ctx: ActionContext): void {
  SEALED.delete(ctx);
}

export const systemCapabilityOf = (ctx: ActionContext): Readonly<SystemCapability> | undefined => SEALED.get(ctx);

/** Cổng Executor: action internal → ctx phải mang capability đúng action + workspace + digest input; không thì 403 TRƯỚC prepare. */
export function admitInternal(ctx: ActionContext, actionId: string, input: unknown): Readonly<SystemCapability> {
  const cap = SEALED.get(ctx);
  if (!cap || cap.actionId !== actionId || cap.workspaceId !== ctx.workspaceId || cap.inputDigest !== canonicalDigest(input)) {
    throw new AppError('FORBIDDEN', 403, { capability: 'missing' });
  }
  return cap;
}
