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
}

export class ChannelControl {
  constructor(
    private readonly redis: Pick<Redis, 'publish' | 'get' | 'set' | 'exists' | 'del'>,
    private readonly loginQueue: Pick<Queue, 'add'> | null,
  ) {}

  async send(cmd: ControlOp): Promise<void> {
    await this.redis.publish(CHANNEL_CONTROL, JSON.stringify(cmd));
  }

  /** Mỗi lần kết nối một job (id ngẫu nhiên — kết nối lại luôn tạo job mới; job cũ thấy tài khoản đã đổi thì bỏ). */
  async startLogin(job: LoginJob): Promise<void> {
    await this.setLogin({ account_id: job.account_id, status: 'starting', qr: null, expires_at: null });
    if (!this.loginQueue) return;
    await this.loginQueue.add('login', job, { jobId: `login-${job.account_id}-${randomUUID()}`, attempts: 1, removeOnComplete: 100, removeOnFail: 100 });
  }

  async setLogin(s: ChannelLoginStateDto): Promise<void> {
    await this.redis.set(loginKey(s.account_id), JSON.stringify(s), 'PX', LOGIN_STATE_TTL_MS);
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
