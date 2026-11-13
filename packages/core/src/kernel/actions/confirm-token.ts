// confirm_token cho preview (action-registry §7): gắn hash input + action + workspace + actor, sống 10 phút, dùng một lần.
import { createHash, createHmac, randomBytes } from 'node:crypto';
import type { KeyValueStore } from '../redis';
import type { ActionContext } from './action-context';
import type { PreviewFacts } from './preview-binding';

export const CONFIRM_TTL_MS = 600_000;

/** JSON ổn định (sắp khoá) để hash input không phụ thuộc thứ tự trường. */
export function stableJson(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stableJson).join(',')}]`;
  if (v && typeof v === 'object') {
    return `{${Object.keys(v as object)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableJson((v as Record<string, unknown>)[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(v ?? null);
}

export const hashInput = (v: unknown) => createHash('sha256').update(stableJson(v)).digest('hex');

/** Xoá token xem trước (một chiều — không đọc giá trị). Dùng khi không có ConfirmTokens (Trợ lý chỉ có KeyValueStore). */
export const revokeConfirm = (kv: Pick<KeyValueStore, 'getdel'>, token: string) => kv.getdel(`confirm:${token}`).then(() => undefined);

export class ConfirmTokens {
  constructor(
    private readonly kv: KeyValueStore,
    private readonly secret: string,
  ) {}

  private bind(ctx: ActionContext, actionId: string, input: unknown): string {
    return createHmac('sha256', this.secret)
      .update(`${ctx.workspaceId}|${ctx.actor.type}:${ctx.actor.id}|${actionId}|${hashInput(input)}`)
      .digest('hex');
  }

  /** `facts` (TIP-033c §3.1): dữ kiện nguồn đọc lúc xem trước (version / giá…) — lưu cùng token phía server, không đi qua client. */
  async issue(ctx: ActionContext, actionId: string, input: unknown, nowMs: number, facts?: PreviewFacts): Promise<{ token: string; expiresAt: Date }> {
    const token = randomBytes(24).toString('base64url');
    const mac = this.bind(ctx, actionId, input);
    await this.kv.set(`confirm:${token}`, facts && Object.keys(facts).length ? `${mac}|${JSON.stringify(facts)}` : mac, 'PX', CONFIRM_TTL_MS);
    return { token, expiresAt: new Date(nowMs + CONFIRM_TTL_MS) };
  }

  /** Thu hồi token (thẻ đã sửa → token cũ không còn chạy được input cũ). */
  async revoke(token: string): Promise<void> {
    await revokeConfirm(this.kv, token);
  }

  /** Đúng token + đúng input / action / actor → dữ kiện đã ràng lúc xem trước (`{}` khi không có) và xoá (một lần); sai → null. */
  async take(ctx: ActionContext, actionId: string, input: unknown, token: string | undefined): Promise<PreviewFacts | null> {
    if (!token) return null;
    const raw = await this.kv.getdel(`confirm:${token}`);
    if (raw === null) return null;
    const cut = raw.indexOf('|');
    if ((cut < 0 ? raw : raw.slice(0, cut)) !== this.bind(ctx, actionId, input)) return null;
    return cut < 0 ? {} : (JSON.parse(raw.slice(cut + 1)) as PreviewFacts);
  }

  /** Đúng token + đúng input / action / actor → true và xoá (một lần). */
  async consume(ctx: ActionContext, actionId: string, input: unknown, token: string | undefined): Promise<boolean> {
    return (await this.take(ctx, actionId, input, token)) !== null;
  }
}
