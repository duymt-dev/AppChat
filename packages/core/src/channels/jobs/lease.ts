// Lease giữ phiên tài khoản kênh (Blueprint §6): `lease:channel:{id}` SET NX PX 30 000, gia hạn mỗi 10 giây bằng Lua (chỉ chủ
// lease gia hạn / nhả được) — mỗi tài khoản do đúng MỘT worker giữ phiên; worker chết thì lease hết hạn, worker khác nhận.
import type { Redis } from 'ioredis';
import { leaseKey } from '../services/control';

export const LEASE_TTL_MS = 30_000;
export const LEASE_HEARTBEAT_MS = 10_000;

const RENEW = `if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('pexpire', KEYS[1], ARGV[2]) else return 0 end`;
const RELEASE = `if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end`;

export class ChannelLeases {
  constructor(
    private readonly redis: Pick<Redis, 'set' | 'eval'>,
    /** Định danh worker (host + pid + ngẫu nhiên) — giá trị của khoá lease. */
    readonly owner: string,
    private readonly ttlMs = LEASE_TTL_MS,
  ) {}

  async acquire(accountId: string): Promise<boolean> {
    return (await this.redis.set(leaseKey(accountId), this.owner, 'PX', this.ttlMs, 'NX')) === 'OK';
  }

  /** false = đã mất lease (hết hạn / worker khác nhận) → phải dừng phiên ngay. */
  async renew(accountId: string): Promise<boolean> {
    return Number(await this.redis.eval(RENEW, 1, leaseKey(accountId), this.owner, String(this.ttlMs))) === 1;
  }

  async release(accountId: string): Promise<void> {
    await this.redis.eval(RELEASE, 1, leaseKey(accountId), this.owner);
  }
}
