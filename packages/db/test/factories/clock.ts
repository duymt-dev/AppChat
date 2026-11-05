// Đồng hồ + sinh id cho factory test (TIP-045b annex E): mọi bản ghi tạo theo đồng hồ tường minh (không `now()` ngầm) và id ngẫu nhiên
// riêng từng lượt — fixture không đụng nhau, không dựa vào DB demo dùng chung.
import { randomUUID } from 'node:crypto';

export interface FactoryClock {
  now(): Date;
  advance(ms: number): void;
}

export function fixedClock(start = '2026-11-05T08:00:00.000Z'): FactoryClock {
  let t = new Date(start).getTime();
  return { now: () => new Date(t), advance: (ms) => void (t += ms) };
}

export const newId = () => randomUUID();
/** Hậu tố ngắn duy nhất cho mã / slug / email của fixture. */
export const tag = () => randomUUID().replace(/-/g, '').slice(0, 10);
