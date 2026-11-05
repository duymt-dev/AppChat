// Điều khiển worker-channels từ API (Blueprint §6): lệnh tức thời qua Redis pub/sub (dừng phiên / chạy lại / đồng bộ lịch sử —
// worker đang giữ lease thực hiện), trạng thái đăng nhập QR (Redis, TTL ngắn — FE đọc qua `/settings/channels/:id/login`),
// hàng đợi `channel-login` (job đăng nhập QR chạy ở ROLE=channels). Tên queue không chứa `:` (BullMQ cấm).
import { randomUUID } from 'node:crypto';
import type { Queue } from 'bullmq';
import type { Redis } from 'ioredis';
import type { ChannelLoginStateDto } from '@appchat/shared';

export const CHANNEL_CONTROL = 'appchat:channels:control';
export const CHANNEL_LOGIN_QUEUE = 'channel-login';
/** Tin vào đã chuẩn hoá — consumer là inbound pipeline của Inbox (TIP-016). */
export const CHANNEL_INBOUND_QUEUE = 'channel-inbound';

export const leaseKey = (accountId: string) => `lease:channel:${accountId}`;
const loginKey = (accountId: string) => `chlogin:${accountId}`;

/** QR Zalo hết hạn sau ~100 giây; giữ trạng thái thêm một chút để FE kịp thấy kết quả. */
export const LOGIN_STATE_TTL_MS = 180_000;

export type ControlOp = { op: 'stop'; account_id: string } | { op: 'start'; account_id: string } | { op: 'sync'; account_id: string; days: number };

export interface LoginJob {
  ws: string;
  account_id: string;
  /** Người bấm kết nối — nhận WS `channel.zalo.qr`. */
  user_id: string | null;
  /** Lần kết nối (TIP-023c): trạng thái / QR của lần cũ không ghi đè lần mới. Job cũ trong hàng đợi không có → coi là hiện hành. */
  attempt?: string;
}

export class ChannelControl {
  constructor(
    private readonly redis: Pick<Redis, 'publish' | 'get' | 'set' | 'exists' | 'del'>,
    private readonly loginQueue: Pick<Queue, 'add'> | null,
  ) {}

  async send(cmd: ControlOp): Promise<void> {
    await this.redis.publish(CHANNEL_CONTROL, JSON.stringify(cmd));
  }

  /** Mỗi lần kết nối một job + một `attempt` mới (kết nối lại luôn tạo lần mới; job cũ thấy tài khoản / lần đã đổi thì bỏ). */
  async startLogin(job: LoginJob): Promise<string> {
    const attempt = job.attempt ?? randomUUID();
    const s: ChannelLoginStateDto = { account_id: job.account_id, status: 'starting', qr: null, expires_at: null, attempt, rev: 0 };
    await this.redis.set(loginKey(job.account_id), JSON.stringify(s), 'PX', LOGIN_STATE_TTL_MS);
    if (this.loginQueue) await this.loginQueue.add('login', { ...job, attempt }, { jobId: `login-${job.account_id}-${attempt}`, attempts: 1, removeOnComplete: 100, removeOnFail: 100 });
    return attempt;
  }

  /**
   * Ghi trạng thái của một lần kết nối. Có `attempt` mà khác lần hiện hành → bỏ (sự kiện trễ của QR cũ — trả false). `rev` tăng đơn điệu.
   * Một worker giữ job một lần; đọc-rồi-ghi đủ chặn ghi đè chéo giữa hai lần kết nối.
   */
  async setLogin(s: ChannelLoginStateDto): Promise<boolean> {
    const cur = await this.login(s.account_id);
    if (s.attempt && cur?.attempt && cur.attempt !== s.attempt) return false;
    const attempt = s.attempt ?? cur?.attempt;
    const next: ChannelLoginStateDto = { ...s, ...(attempt ? { attempt } : {}), rev: (cur?.rev ?? 0) + 1 };
    await this.redis.set(loginKey(s.account_id), JSON.stringify(next), 'PX', LOGIN_STATE_TTL_MS);
    return true;
  }

  async login(accountId: string): Promise<ChannelLoginStateDto | null> {
    const v = await this.redis.get(loginKey(accountId));
    return v ? (JSON.parse(v) as ChannelLoginStateDto) : null;
  }

  async clearLogin(accountId: string): Promise<void> {
    await this.redis.del(loginKey(accountId));
  }

  /** Có worker đang giữ phiên tài khoản này (lease còn hạn). */
  async held(accountId: string): Promise<boolean> {
    return (await this.redis.exists(leaseKey(accountId))) > 0;
  }
}
