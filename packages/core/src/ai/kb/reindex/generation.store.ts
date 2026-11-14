// Sổ generation tái tạo chỉ mục (TIP-020e §2): building → catching_up → active | failed | cancelled | superseded. Mọi chuyển pha là
// UPDATE có điều kiện (pha hiện tại + lease đúng) và tăng `version` — job muộn của lease cũ / generation đã huỷ không ghi được gì. Một
// generation dở mỗi workspace (partial unique `kb_embed_generation_open_key`). Lease: token + hạn; job chết → hạn qua → job khác lấy lại
// và chạy tiếp từ `cursor_chunk_id` đã ghi bền.
import type { TenantDb } from '@appchat/db';
import { uuidv7 } from '../../../kernel/ids';
import type { Slot } from './space';

export const LEASE_MS = 60_000;
export const OPEN_PHASES = ['building', 'catching_up'] as const;
export type GenPhase = 'building' | 'catching_up' | 'active' | 'failed' | 'cancelled' | 'superseded';

export interface GenRow {
  id: string;
  slot: Slot;
  spaceKey: string;
  phase: GenPhase;
  expected: number;
  done: number;
  tokens: bigint;
  cursorChunkId: string | null;
  batchStep: number;
  catchupRound: number;
  leaseToken: string | null;
  leaseUntil: Date | null;
  reason: string | null;
  createdBy: string | null;
  createdAt: Date;
  version: number;
}

type Db = Pick<TenantDb, 'kbEmbedGeneration'>;

const row = (r: Awaited<ReturnType<TenantDb['kbEmbedGeneration']['findUniqueOrThrow']>>): GenRow => ({ ...r, slot: r.slot === 'b' ? 'b' : 'a', phase: r.phase as GenPhase });

export async function getGeneration(db: Db, id: string): Promise<GenRow | null> {
  const r = await db.kbEmbedGeneration.findUnique({ where: { id } });
  return r ? row(r) : null;
}

export async function openGeneration(db: Db): Promise<GenRow | null> {
  const r = await db.kbEmbedGeneration.findFirst({ where: { phase: { in: [...OPEN_PHASES] } } });
  return r ? row(r) : null;
}

/**
 * Lần tái tạo gần nhất kết thúc KHÔNG publish (lỗi / huỷ) mà chưa có lần publish nào sau nó — trang Cài đặt hiện lý do. Generation thay thế /
 * đang phục vụ không bao giờ là "lỗi gần nhất". Generation khởi tạo của migration (lý do `initial`, giờ DB lúc migrate) luôn là lần đầu.
 */
export async function lastUnpublished(db: Db, activeId: string | null): Promise<GenRow | null> {
  const r = await db.kbEmbedGeneration.findFirst({ where: { phase: { in: ['failed', 'cancelled'] } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
  if (!r) return null;
  const active = activeId ? await db.kbEmbedGeneration.findUnique({ where: { id: activeId }, select: { id: true, createdAt: true, reason: true } }) : null;
  // Một generation dở mỗi lúc → generation tạo sau (thời điểm, rồi id uuidv7 cùng mili giây) là lần chạy sau.
  const later = active && (active.createdAt > r.createdAt || (active.createdAt.getTime() === r.createdAt.getTime() && active.id > r.id));
  if (active && active.reason !== 'initial' && later) return null;
  return row(r);
}

export async function createGeneration(db: Db, g: { slot: Slot; spaceKey: string; expected: number; createdBy: string | null; operationId: string | null; now: Date }): Promise<GenRow> {
  const r = await db.kbEmbedGeneration.create({
    data: { id: uuidv7(g.now.getTime()), slot: g.slot, spaceKey: g.spaceKey, phase: 'building', expected: g.expected, createdBy: g.createdBy, operationId: g.operationId, createdAt: g.now, updatedAt: g.now },
  });
  return row(r);
}

/** Giành lease: generation còn dở và lease trống / hết hạn / đúng token này. Trả dòng sau khi giành, null = người khác đang giữ / đã xong. */
export async function claimLease(db: Db, id: string, token: string, now: Date): Promise<GenRow | null> {
  const n = await db.kbEmbedGeneration.updateMany({
    where: { id, phase: { in: [...OPEN_PHASES] }, OR: [{ leaseToken: null }, { leaseUntil: { lt: now } }, { leaseToken: token }] },
    data: { leaseToken: token, leaseUntil: new Date(now.getTime() + LEASE_MS), updatedAt: now, version: { increment: 1 } },
  });
  return n.count ? getGeneration(db, id) : null;
}

/** Ghi tiến độ một lô dưới lease (CAS theo token + pha). false = lease đã mất / generation không còn dở → bỏ kết quả. */
export async function advance(db: Db, id: string, token: string, a: { phase: 'building' | 'catching_up'; cursor: string | null; addDone: number; addTokens: number; now: Date }): Promise<boolean> {
  const n = await db.kbEmbedGeneration.updateMany({
    where: { id, leaseToken: token, phase: a.phase },
    data: { cursorChunkId: a.cursor, done: { increment: a.addDone }, tokens: { increment: a.addTokens }, batchStep: { increment: 1 }, leaseUntil: new Date(a.now.getTime() + LEASE_MS), updatedAt: a.now, version: { increment: 1 } },
  });
  return n.count === 1;
}

export async function toCatchingUp(db: Db, id: string, token: string, now: Date): Promise<boolean> {
  const n = await db.kbEmbedGeneration.updateMany({ where: { id, leaseToken: token, phase: { in: [...OPEN_PHASES] } }, data: { phase: 'catching_up', catchupRound: { increment: 1 }, updatedAt: now, version: { increment: 1 } } });
  return n.count === 1;
}

/** Nhả lease (hết việc của job này) — chỉ khi đúng token. */
export async function releaseLease(db: Db, id: string, token: string, now: Date): Promise<void> {
  await db.kbEmbedGeneration.updateMany({ where: { id, leaseToken: token }, data: { leaseToken: null, leaseUntil: null, updatedAt: now, version: { increment: 1 } } });
}

/** Kết thúc lỗi (khe cũ vẫn phục vụ). `token` null = hệ thống (vd. workspace bị xoá route) — chỉ khi còn dở. */
export async function failGeneration(db: Db, id: string, reason: string, now: Date, token?: string | null): Promise<boolean> {
  const n = await db.kbEmbedGeneration.updateMany({
    where: { id, phase: { in: [...OPEN_PHASES] }, ...(token ? { leaseToken: token } : {}) },
    data: { phase: 'failed', reason: reason.slice(0, 120), leaseToken: null, leaseUntil: null, updatedAt: now, version: { increment: 1 } },
  });
  return n.count === 1;
}

/** Huỷ / thay thế generation dở (người dùng huỷ, hoặc xác nhận reindex sang space khác — A→B→C). */
export async function closeOpen(db: Db, id: string, phase: 'cancelled' | 'superseded', reason: string, now: Date): Promise<boolean> {
  const n = await db.kbEmbedGeneration.updateMany({
    where: { id, phase: { in: [...OPEN_PHASES] } },
    data: { phase, reason, leaseToken: null, leaseUntil: null, updatedAt: now, version: { increment: 1 } },
  });
  return n.count === 1;
}

/** Generation dở có lease hết hạn (job mất) — quét khôi phục đẩy lại. */
export async function staleOpen(db: Db, now: Date): Promise<GenRow | null> {
  const r = await db.kbEmbedGeneration.findFirst({ where: { phase: { in: [...OPEN_PHASES] }, OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }] } });
  return r ? row(r) : null;
}
