// Sổ yêu cầu lượt Trợ lý (TIP-023c SPEC vận hành + "Fenced recovery"): claim nguyên tử unique (user_id, request_id) trước khi tạo tin / run;
// cùng request_id + cùng input → trả lại run cũ (không chạy lại); khác input → 409. Lease có `fence` tăng đơn điệu: thu hồi lease hết
// hạn dùng Clock, chỉ chủ + fence hiện hành được gia hạn / ghi checkpoint / kết thúc — worker cũ quay lại bị chặn. Không lưu bí mật.
import type { TenantDb } from '@appchat/db';
import { AppError } from '@appchat/shared';
import { hashInput } from '../../../kernel/actions/confirm-token';
import { uuidv7 } from '../../../kernel/ids';

export const LEASE_MS = 60_000;
export type ExecState = 'queued' | 'running' | 'waiting_external' | 'waiting_approval' | 'succeeded' | 'failed' | 'cancelled';
export const TERMINAL_EXEC: ExecState[] = ['succeeded', 'failed', 'cancelled'];

type Db = Pick<TenantDb, 'assistantRequest'>;
export type RequestRow = NonNullable<Awaited<ReturnType<TenantDb['assistantRequest']['findUnique']>>>;

export interface Lease {
  runId: string;
  owner: string;
  fence: number;
}

/** Hash yêu cầu: phiên + phần không bí mật của input (text, mode, context, tệp) — không chứa bí mật / token. */
export const requestHash = (sessionId: string | undefined, input: unknown) => hashInput({ session: sessionId ?? null, input });

export class RequestStore {
  constructor(
    private readonly db: Db,
    private readonly now: () => Date,
  ) {}

  /**
   * Claim (user, request_id): chưa có → tạo (`queued`, run đã cấp sẵn id) và trả `created`; có rồi cùng hash → `replay` (run cũ);
   * khác hash → 409 (request_id đã dùng cho yêu cầu khác).
   */
  async claim(q: { userId: string; requestId: string; sessionId: string; runId: string; inputHash: string }): Promise<{ kind: 'created' | 'replay'; row: RequestRow }> {
    const prev = await this.db.assistantRequest.findUnique({ where: { userId_requestId: { userId: q.userId, requestId: q.requestId } } });
    if (prev) return this.same(prev, q.inputHash);
    const at = this.now();
    try {
      const row = await this.db.assistantRequest.create({ data: { id: uuidv7(at.getTime()), userId: q.userId, requestId: q.requestId, sessionId: q.sessionId, runId: q.runId, inputHash: q.inputHash, createdAt: at, updatedAt: at } });
      return { kind: 'created', row };
    } catch (e) {
      // Hai request trùng cùng lúc: unique chặn một — bên thua đọc lại.
      const again = await this.db.assistantRequest.findUnique({ where: { userId_requestId: { userId: q.userId, requestId: q.requestId } } });
      if (again) return this.same(again, q.inputHash);
      throw e;
    }
  }

  private same(row: RequestRow, hash: string): { kind: 'replay'; row: RequestRow } {
    if (row.inputHash !== hash) throw new AppError('CONFLICT', 409, { request_id: 'mismatch' });
    return { kind: 'replay', row };
  }

  byRun(runId: string): Promise<RequestRow | null> {
    return this.db.assistantRequest.findUnique({ where: { runId } });
  }

  /** Nhận lease: dòng chưa kết thúc và (không ai giữ hoặc lease hết hạn) → fence + 1. Thua → null. */
  async acquire(runId: string, owner: string): Promise<Lease | null> {
    const at = this.now();
    const cur = await this.db.assistantRequest.findUnique({ where: { runId }, select: { fence: true, executionState: true } });
    if (!cur || TERMINAL_EXEC.includes(cur.executionState)) return null;
    const r = await this.db.assistantRequest.updateMany({
      where: { runId, fence: cur.fence, executionState: { notIn: TERMINAL_EXEC }, OR: [{ leaseUntil: null }, { leaseUntil: { lt: at } }] },
      data: { leaseOwner: owner, leaseUntil: new Date(at.getTime() + LEASE_MS), fence: cur.fence + 1, executionState: 'running', updatedAt: at },
    });
    return r.count === 1 ? { runId, owner, fence: cur.fence + 1 } : null;
  }

  /** Gia hạn — chỉ chủ + fence hiện hành. false → đã mất lease (dừng mọi ghi). */
  async renew(l: Lease): Promise<boolean> {
    const at = this.now();
    const r = await this.db.assistantRequest.updateMany({ where: { runId: l.runId, leaseOwner: l.owner, fence: l.fence }, data: { leaseUntil: new Date(at.getTime() + LEASE_MS), updatedAt: at } });
    return r.count === 1;
  }

  /** Lease còn hiệu lực (gọi trước mỗi lần ghi sự kiện / checkpoint / gọi tool). */
  async holds(l: Lease): Promise<boolean> {
    const row = await this.db.assistantRequest.findUnique({ where: { runId: l.runId }, select: { leaseOwner: true, fence: true, executionState: true } });
    return !!row && row.leaseOwner === l.owner && row.fence === l.fence && !TERMINAL_EXEC.includes(row.executionState);
  }

  /**
   * Chuyển trạng thái có fence (checkpoint): `waiting_*` thả lease và lưu điều đang chờ; trạng thái kết thúc là cuối cùng — huỷ rồi
   * thì receipt trễ không làm sống lại. Sai fence → false (worker cũ).
   */
  async transition(l: Lease, state: ExecState, waitingFor?: unknown): Promise<boolean> {
    const at = this.now();
    const release = state !== 'running';
    const r = await this.db.assistantRequest.updateMany({
      where: { runId: l.runId, leaseOwner: l.owner, fence: l.fence, executionState: { notIn: TERMINAL_EXEC } },
      data: {
        executionState: state,
        checkpointVersion: { increment: 1 },
        ...(waitingFor === undefined ? {} : { waitingFor: waitingFor as object }),
        ...(release ? { leaseOwner: null, leaseUntil: null } : {}),
        updatedAt: at,
      },
    });
    return r.count === 1;
  }

  /** Huỷ (run.cancel / người dùng bấm Dừng) — kết thúc, không phụ thuộc lease. */
  async cancel(runId: string): Promise<void> {
    await this.db.assistantRequest.updateMany({ where: { runId, executionState: { notIn: TERMINAL_EXEC } }, data: { executionState: 'cancelled', leaseOwner: null, leaseUntil: null, updatedAt: this.now() } });
  }
}
