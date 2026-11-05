// Intent GenUI (TIP-023c hợp đồng 4): server phát handle cho từng node `action` (nút / form) của cây Trợ lý SAU khi kiểm cây + action
// + quyền. Trình duyệt gửi handle ở header `x-genui-intent`; ActionsController tự đặt source = assistant, actor = assistant(người
// dùng), run = run của cây → policy bắt xem trước / xác nhận như call_action (023b), không tin `x-action-source` hay body.
// Gắn: workspace + người dùng + run + node + action + (nút: digest input cố định | form: tập ô được gửi). Sửa node / dùng chéo người /
// workspace / action → từ chối. Handle sống 24h (mở lại phiên cũ → server phát lại sau khi kiểm quyền hiện hành).
import { createHmac, randomBytes } from 'node:crypto';
import { AppError } from '@appchat/shared';
import type { KeyValueStore } from '../redis';
import { hashInput } from './confirm-token';

export const INTENT_TTL_MS = 24 * 3600_000;
const key = (h: string) => `genui:intent:${h}`;
const HANDLE = /^[A-Za-z0-9_-]{20,64}$/;

export interface IntentClaim {
  workspaceId: string;
  userId: string;
  runId: string;
  /** Đường dẫn node trong cây ("0.2"). */
  node: string;
  actionId: string;
  /** Nút: input cố định của node. Form: không có — kiểm theo `fields`. */
  input?: Record<string, unknown>;
  /** Form: ô được phép gửi (đường dẫn gốc, vd `fields`, `address`). */
  fields?: string[];
}

interface Stored extends Omit<IntentClaim, 'input'> {
  digest?: string;
  mac: string;
}

export interface ResolvedIntent {
  runId: string;
  node: string;
  actionId: string;
}

type Kv = Pick<KeyValueStore, 'set'> & { get(key: string): Promise<string | null> };

export class GenUiIntents {
  constructor(
    private readonly kv: Kv,
    private readonly secret: string,
  ) {}

  /** Khoá dẫn xuất cho mục đích khác của GenUI (vd. cursor SSE) — không dùng chung khoá ký intent. */
  derive(purpose: string): string {
    return createHmac('sha256', this.secret).update(`derive:${purpose}`).digest('hex');
  }

  private mac(s: Omit<Stored, 'mac'>): string {
    return createHmac('sha256', this.secret)
      .update(`${s.workspaceId}|${s.userId}|${s.runId}|${s.node}|${s.actionId}|${s.digest ?? ''}|${(s.fields ?? []).join(',')}`)
      .digest('hex');
  }

  async issue(c: IntentClaim): Promise<string> {
    const handle = randomBytes(18).toString('base64url');
    const base: Omit<Stored, 'mac'> = { workspaceId: c.workspaceId, userId: c.userId, runId: c.runId, node: c.node, actionId: c.actionId, ...(c.input ? { digest: hashInput(c.input) } : {}), ...(c.fields ? { fields: [...c.fields].sort() } : {}) };
    await this.kv.set(key(handle), JSON.stringify({ ...base, mac: this.mac(base) }), 'PX', INTENT_TTL_MS);
    return handle;
  }

  /**
   * Kiểm handle cho lời gọi action: đúng workspace / người / action; nút → input trùng digest; form → chỉ ô trong `fields`. Sai / hết
   * hạn → 403 (không nói lý do cụ thể — không làm oracle).
   */
  async resolve(handle: string, q: { workspaceId: string; userId: string; actionId: string; input: unknown }): Promise<ResolvedIntent> {
    const deny = () => new AppError('FORBIDDEN', 403, { genui_intent: 'invalid' });
    if (!HANDLE.test(handle)) throw deny();
    const raw = await this.kv.get(key(handle));
    if (!raw) throw deny();
    const s = JSON.parse(raw) as Stored;
    const { mac, ...base } = s;
    if (mac !== this.mac(base)) throw deny();
    if (s.workspaceId !== q.workspaceId || s.userId !== q.userId || s.actionId !== q.actionId) throw deny();
    if (s.digest !== undefined && s.digest !== hashInput(q.input ?? {})) throw deny();
    if (s.fields) {
      const allowed = new Set(s.fields);
      const keys = q.input && typeof q.input === 'object' ? Object.keys(q.input) : [];
      if (keys.some((k) => !allowed.has(k))) throw deny();
    }
    return { runId: s.runId, node: s.node, actionId: s.actionId };
  }
}
