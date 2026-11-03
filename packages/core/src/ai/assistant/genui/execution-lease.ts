// Lease có fence cho một lượt Trợ lý (TIP-023c "Fenced recovery"): tiến trình chạy lượt nhận lease trên sổ yêu cầu (fence + 1), gia hạn
// định kỳ trong lúc chạy, và MỌI lần ghi sự kiện stream / chốt trạng thái kiểm còn giữ lease (chủ + fence). Lease hết hạn (tiến trình chết
// / treo) → job thu hồi ở ROLE=ai chốt lượt (genui/recovery.ts); tiến trình cũ quay lại thì `holds` = false → không ghi tiếp, không chốt
// đè. Chờ ngoài (QR / duyệt) → checkpoint `waiting_*` thả lease, lưu điều đang chờ. Lượt không có request_id (client cũ) → không lease.
import { hostname } from 'node:os';
import type { TenantDb } from '@appchat/db';
import { LEASE_MS, RequestStore, type ExecState, type Lease } from './request-store';

const RENEW_MS = Math.floor(LEASE_MS / 3);
let seq = 0;
/** Chủ lease: tiến trình + lượt (hai lượt cùng tiến trình vẫn khác chủ). */
export const leaseOwner = () => `${hostname()}:${process.pid}:${++seq}`;

export class ExecutionLease {
  private timer: ReturnType<typeof setInterval> | null = null;
  private lost = false;

  private constructor(
    private readonly store: RequestStore,
    readonly lease: Lease,
  ) {}

  /** Nhận lease cho run; người khác đang giữ (lease còn hạn) / đã kết thúc → null (không chạy). */
  static async acquire(db: Pick<TenantDb, 'assistantRequest'>, now: () => Date, runId: string): Promise<ExecutionLease | null> {
    const store = new RequestStore(db, now);
    const lease = await store.acquire(runId, leaseOwner());
    if (!lease) return null;
    const l = new ExecutionLease(store, lease);
    l.timer = setInterval(() => void l.renew(), RENEW_MS);
    l.timer.unref?.();
    return l;
  }

  private async renew(): Promise<void> {
    if (this.lost) return;
    if (!(await this.store.renew(this.lease).catch(() => false))) this.lost = true;
  }

  /** Còn giữ lease (gọi trước mỗi lần ghi sổ sự kiện / chốt). Mất một lần là mất hẳn. */
  async holds(): Promise<boolean> {
    if (this.lost) return false;
    if (!(await this.store.holds(this.lease))) this.lost = true;
    return !this.lost;
  }

  /** Chốt trạng thái (kết thúc hoặc `waiting_*` + điều đang chờ) rồi dừng gia hạn. false → đã mất lease (người khác đã chốt). */
  async finish(state: ExecState, waitingFor?: unknown): Promise<boolean> {
    this.stop();
    if (this.lost) return false;
    return this.store.transition(this.lease, state, waitingFor);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}

/** Trạng thái sổ yêu cầu theo kết quả run. */
export const execStateOf = (status: string): ExecState =>
  status === 'completed' ? 'succeeded' : status === 'waiting_approval' ? 'waiting_approval' : status === 'cancelled' ? 'cancelled' : status === 'waiting_external' ? 'waiting_external' : 'failed';
