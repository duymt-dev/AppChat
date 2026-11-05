// Sổ sự kiện stream của lượt Trợ lý (TIP-023c SPEC vận hành): ghi bền (run_id, seq) TRƯỚC khi phát; cursor ký HMAC gắn run + người xem
// (không theo offset đến); đọc lại theo trang id từ index (run_id, seq) rồi deferred join lấy payload. Sự kiện stream sống 24h —
// quá hạn / cursor không còn → `reset_required` (client dựng lại từ lịch sử tin, KHÔNG chạy lại model / action).
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { TenantDb } from '@appchat/db';
import { TenantSql } from '@appchat/db';
import { AppError, type StreamEvent, type StreamFrame } from '@appchat/shared';
import { uuidv7 } from '../../../kernel/ids';

export const EVENT_TTL_MS = 24 * 3600_000;
export const REPLAY_PAGE = 200;
type Db = Pick<TenantDb, 'assistantEvent' | '$queryRaw'>;

export class CursorSigner {
  constructor(private readonly secret: string) {}

  private mac(runId: string, userId: string, seq: number): string {
    return createHmac('sha256', this.secret).update(`${runId}|${userId}|${seq}`).digest('base64url').slice(0, 22);
  }

  sign(runId: string, userId: string, seq: number): string {
    return `${seq}.${this.mac(runId, userId, seq)}`;
  }

  /** Cursor hợp lệ → seq đã nhận (đọc tiếp từ seq + 1); sai run / người / chữ ký → 403 (không cho đọc chéo run người khác). */
  verify(runId: string, userId: string, cursor: string): number {
    const m = /^(\d{1,9})\.([A-Za-z0-9_-]{22})$/.exec(cursor);
    const deny = () => new AppError('FORBIDDEN', 403, { cursor: 'invalid' });
    if (!m) throw deny();
    const seq = Number(m[1]);
    const a = Buffer.from(m[2]!);
    const b = Buffer.from(this.mac(runId, userId, seq));
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw deny();
    return seq;
  }
}

export class EventStore {
  constructor(
    private readonly db: Db,
    private readonly now: () => Date,
  ) {}

  /** Ghi sự kiện kế tiếp của run (seq = max + 1). Trùng seq (hai writer) → ném — fence ở sổ yêu cầu chặn writer cũ trước đó. */
  async append(runId: string, event: StreamEvent): Promise<number> {
    const last = await this.db.assistantEvent.findFirst({ where: { runId }, orderBy: { seq: 'desc' }, select: { seq: true } });
    const seq = (last?.seq ?? 0) + 1;
    const at = this.now();
    await this.db.assistantEvent.create({ data: { id: uuidv7(at.getTime()), runId, seq, eventType: event.type, payload: event as object, createdAt: at, expiresAt: new Date(at.getTime() + EVENT_TTL_MS) } });
    return seq;
  }

  /**
   * Sự kiện sau `afterSeq` (trang ≤ 200). Trang id từ index (run_id, seq) INCLUDE (event_type, created_at), payload deferred join.
   * Có khoảng trống đầu trang (đã bị prune) → `reset_required`.
   */
  async after(runId: string, afterSeq: number, limit = REPLAY_PAGE): Promise<{ seq: number; event: StreamEvent }[] | 'reset_required'> {
    const rows = await this.db.$queryRaw<{ seq: number; payload: StreamEvent; expires_at: Date }[]>(TenantSql.sql`
      SELECT e.seq, e.payload, e.expires_at
      FROM (SELECT id FROM assistant_event WHERE run_id = ${runId}::uuid AND seq > ${afterSeq} ORDER BY seq LIMIT ${Math.min(limit, REPLAY_PAGE)}) p
      JOIN assistant_event e ON e.id = p.id
      ORDER BY e.seq`);
    const now = this.now().getTime();
    if (rows.length && rows[0]!.seq !== afterSeq + 1) return 'reset_required';
    // Trang rỗng: chưa có sự kiện mới HAY cả run đã bị dọn? Sự kiện tại cursor không còn → dọn rồi (client dựng lại từ lịch sử tin).
    if (!rows.length && afterSeq > 0 && !(await this.db.assistantEvent.findUnique({ where: { runId_seq: { runId, seq: afterSeq } }, select: { id: true } }))) return 'reset_required';
    if (rows.some((r) => r.expires_at.getTime() < now)) return 'reset_required';
    return rows.map((r) => ({ seq: r.seq, event: r.payload }));
  }

  /** Dọn sự kiện quá hạn theo lô (job prune của AI jobs; checkpoint = lô cuối < limit). */
  async prune(limit = 500): Promise<number> {
    const ids = await this.db.$queryRaw<{ id: string }[]>(TenantSql.sql`SELECT id FROM assistant_event WHERE expires_at < ${this.now()} ORDER BY expires_at, id LIMIT ${limit}`);
    if (!ids.length) return 0;
    const r = await this.db.assistantEvent.deleteMany({ where: { id: { in: ids.map((x) => x.id) } } });
    return r.count;
  }
}

export const frameOf = (signer: CursorSigner, runId: string, userId: string, seq: number, event: StreamEvent): StreamFrame => ({ run_id: runId, seq, cursor: signer.sign(runId, userId, seq), event });
