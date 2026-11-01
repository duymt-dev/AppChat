// confirm_token cho preview (action-registry §7): gắn hash input + action + workspace + actor, sống 10 phút, dùng một lần.
import { createHash, createHmac, randomBytes } from 'node:crypto';
import type { KeyValueStore } from '../redis';
import type { ActionContext } from './action-context';

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

  async issue(ctx: ActionContext, actionId: string, input: unknown, nowMs: number): Promise<{ token: string; expiresAt: Date }> {
    const token = randomBytes(24).toString('base64url');
    await this.kv.set(`confirm:${token}`, this.bind(ctx, actionId, input), 'PX', CONFIRM_TTL_MS);
    return { token, expiresAt: new Date(nowMs + CONFIRM_TTL_MS) };
  }

  /** Đúng token + đúng input / action / actor → true và xoá (một lần). */
  async consume(ctx: ActionContext, actionId: string, input: unknown, token: string | undefined): Promise<boolean> {
    if (!token) return false;
    const bound = await this.kv.getdel(`confirm:${token}`);
    return bound !== null && bound === this.bind(ctx, actionId, input);
  }
}
