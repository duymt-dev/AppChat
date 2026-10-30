// Redis (Memurai ở dev) — confirm token, outbox:dirty, BullMQ. Một client mỗi process; BullMQ tạo kết nối riêng.
import { Redis } from 'ioredis';

export const REDIS = Symbol('REDIS');

export function createRedis(url: string): Redis {
  return new Redis(url, { maxRetriesPerRequest: null, lazyConnect: false });
}

/** Phần tối thiểu kernel cần — cho test thay bằng bản trong bộ nhớ. */
export interface KeyValueStore {
  set(key: string, value: string, mode: 'PX', ttlMs: number): Promise<unknown>;
  getdel(key: string): Promise<string | null>;
  sadd(key: string, ...members: string[]): Promise<number>;
  spop(key: string, count: number): Promise<string[]>;
}
