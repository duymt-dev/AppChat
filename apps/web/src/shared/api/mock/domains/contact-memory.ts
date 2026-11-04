// Mock trí nhớ khách (TIP-015b) — cùng hợp đồng `contactMemorySchema` / action contact.remember · memory_forget · memory_list · summarize.
// Thuần (không import domain khác): state nằm ở `customers.memory` (khách → fact), customers.ts nối route / handler. Trần 50, trùng văn bản
// (chuẩn hoá bỏ dấu) → làm mới; tóm tắt mock = luật từ fact (source rule) — không giả model.
import { ApiRequestError, foldText, type ContactMemoryDto, type MemoryFactDto } from '@appchat/shared';

export const MEMORY_CAP = 50;
export type MemoryStore = Record<string, MemoryFactDto[]>;

const norm = (s: string) => foldText(s).replace(/[\s\p{P}\p{S}]+/gu, ' ').trim();
const SENSITIVE = /\b(cccd|cmnd|mat khau|password|otp|ma pin|cvv)\b|(?<!\d)\d{12}(?!\d)/;

export function memoryOf(store: MemoryStore, contactId: string, canEdit: boolean): ContactMemoryDto {
  const items = [...(store[contactId] ?? [])].sort((a, b) => b.updated_at.localeCompare(a.updated_at) || b.memory_id.localeCompare(a.memory_id));
  return { items, cap: MEMORY_CAP, can_edit: canEdit };
}

export function remember(store: MemoryStore, i: { contact_id: string; fact: string; confidence?: number }, at: string, id: string) {
  const fact = i.fact.replace(/\s+/g, ' ').trim().slice(0, 1000);
  if (!fact) throw new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: 'fact', fields: { fact: 'required' } });
  if (SENSITIVE.test(norm(fact))) throw new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: 'fact', fields: { fact: 'sensitive:secret' } });
  const list = (store[i.contact_id] ??= []);
  const dup = list.find((f) => norm(f.fact) === norm(fact));
  const confidence = i.confidence ?? 1;
  if (dup) {
    dup.confidence = Math.max(dup.confidence, confidence);
    dup.updated_at = at;
    return { memory_id: dup.memory_id, status: 'refreshed' as const, evicted_id: null };
  }
  let evicted: string | null = null;
  if (list.length >= MEMORY_CAP) {
    const out = [...list].sort((a, b) => a.confidence - b.confidence || a.updated_at.localeCompare(b.updated_at) || a.memory_id.localeCompare(b.memory_id))[0]!;
    evicted = out.memory_id;
    list.splice(list.indexOf(out), 1);
  }
  list.push({ memory_id: id, fact, confidence, source: 'user', updated_at: at });
  return { memory_id: id, status: 'created' as const, evicted_id: evicted };
}

export function forget(store: MemoryStore, memoryId: string) {
  for (const [contactId, list] of Object.entries(store)) {
    const at = list.findIndex((f) => f.memory_id === memoryId);
    if (at >= 0) {
      const [row] = list.splice(at, 1);
      return { result: { memory_id: memoryId, contact_id: contactId }, row: row! };
    }
  }
  throw new ApiRequestError(404, { code: 'NOT_FOUND', message: memoryId, fields: { memory_id: 'not_found' } });
}

export function restore(store: MemoryStore, contactId: string, row: MemoryFactDto) {
  const list = (store[contactId] ??= []);
  if (list.length >= MEMORY_CAP) throw new ApiRequestError(409, { code: 'STALE_VERSION', message: 'cap', fields: { memory: 'cap_full' } });
  if (!list.some((f) => f.memory_id === row.memory_id)) list.push(row);
}

/** Tóm tắt mock: luật từ fact + gợi ý dòng (không model). */
export function summarize(store: MemoryStore, contactId: string, hint: string, at: string) {
  const facts = memoryOf(store, contactId, false).items.slice(0, 3).map((f) => f.fact);
  const bullets = [...facts, ...(hint ? [hint] : [])].slice(0, 5);
  return { bullets, source: 'rule' as const, status: 'fresh' as const, generated_at: at };
}

/** Seed: hai điều AI đã ghi nhớ về chị Lan (ct_lan — dùng chung Hộp thư + Khách hàng). */
export const seedMemory = (): MemoryStore => ({
  ct_lan: [
    { memory_id: 'mem_lan_1', fact: 'Dị ứng tinh dầu sả', confidence: 0.9, source: 'agent', updated_at: '2026-10-30T02:00:00.000Z' },
    { memory_id: 'mem_lan_2', fact: 'Thích đặt lịch buổi tối sau 18h', confidence: 0.8, source: 'user', updated_at: '2026-10-28T09:30:00.000Z' },
  ],
});

type Db = { customers: { memory: MemoryStore; seq: number } };

/** `GET /contacts/:id/memory` — khách không thấy được → null (404 ở transport). */
export function memoryRoute<D extends Db, C>(path: string, visibleContact: (db: D, id: string) => C | null) {
  const m = path.match(/^\/contacts\/([^/]+)\/memory$/);
  if (!m) return null;
  const id = m[1]!;
  return (db: D) => (visibleContact(db, id) ? memoryOf(db.customers.memory, id, true) : null);
}

const now = () => new Date().toISOString();

/** Handler action trí nhớ (contactOf ném 404 khi khách lạ). */
export function memoryHandlers<D extends Db, C extends { ai?: { hint: string } }>(contactOf: (db: D, id: string) => C) {
  return {
    'contact.memory_list': {
      execute: (db: D, i: { contact_id: string }) => (contactOf(db, i.contact_id), memoryOf(db.customers.memory, i.contact_id, true)),
    },
    'contact.remember': {
      execute: (db: D, i: { contact_id: string; fact: string; confidence?: number }) => {
        contactOf(db, i.contact_id);
        return remember(db.customers.memory, i, now(), `mem_${++db.customers.seq}`);
      },
    },
    'contact.memory_forget': {
      execute: (db: D, i: { memory_id: string; __row?: MemoryFactDto; __contact?: string }) => {
        const r = forget(db.customers.memory, i.memory_id);
        i.__row = r.row;
        i.__contact = r.result.contact_id;
        return r.result;
      },
      undo: (db: D, i: { __row?: MemoryFactDto; __contact?: string }) => {
        if (i.__row && i.__contact) restore(db.customers.memory, i.__contact, i.__row);
      },
      preview: (db: D, i: { memory_id: string }) => {
        const row = Object.values(db.customers.memory).flat().find((f) => f.memory_id === i.memory_id);
        return { summary: row?.fact ?? i.memory_id };
      },
    },
    'contact.summarize': {
      execute: (db: D, i: { contact_id: string }) => summarize(db.customers.memory, i.contact_id, contactOf(db, i.contact_id).ai?.hint ?? '', now()),
    },
  };
}
