// Mock trạng thái chỉ mục embedding kho tri thức (TIP-020e §4.1 / §4.3) — chỉ cho UI / E2E chế độ mock. Khởi đầu theo kịch bản
// `localStorage.ac_mock_kb_index`: (không đặt) / `current` — chỉ mục dùng model hiện hành; `stale` — model embedding đã đổi;
// `retired` — model của khe đang phục vụ đã gỡ (nhánh vector tắt); `failed` — lần tạo lại gần nhất lỗi (hết Credit).
// `kb.reindex` (xem trước BẮT BUỘC như server — ước tính đoạn / token / Credit / dung lượng) → `building`; mỗi lần đọc trạng thái tiến 50 đoạn
// (giả lập job theo lô) → `catching_up` → publish (state current). `kb.reindex_cancel` → `cancelled`, khe cũ giữ nguyên.
import { ApiRequestError, type KbIndexStatus } from '@appchat/shared';
import type { MockDb } from '../store';
import type { MockHandler } from '../handlers';

export const MOCK_KB_INDEX_KEY = 'ac_mock_kb_index';
type Scenario = 'current' | 'stale' | 'retired' | 'failed';

const OLD = 'openai · text-embedding-3-small';
const NEW = 'openai · text-embedding-3-large';
const CHUNKS = 120;
const TOKENS = 48_000;
const STEP = 50;

export interface KbIndexState {
  status: KbIndexStatus;
  seq: number;
}

const scenario = (): Scenario => {
  try {
    const v = typeof window === 'undefined' ? null : window.localStorage.getItem(MOCK_KB_INDEX_KEY);
    return v === 'stale' || v === 'retired' || v === 'failed' ? v : 'current';
  } catch {
    return 'current';
  }
};

const base: KbIndexStatus = { state: 'current', phase: null, generation_id: null, active_space_label: OLD, done: 0, expected: 0, degraded: null, reason: null };

function initial(s: Scenario): KbIndexStatus {
  if (s === 'stale') return { ...base, state: 'stale', target_space_label: NEW };
  if (s === 'retired') return { ...base, state: 'stale', target_space_label: NEW, degraded: 'embed_space_retired' };
  if (s === 'failed') return { ...base, state: 'stale', target_space_label: NEW, phase: 'failed', generation_id: 'gen_failed', done: 64, expected: CHUNKS, reason: 'credit_exhausted' };
  return base;
}

/** Trạng thái lười theo kịch bản lúc đọc đầu tiên (localStorage đặt trước khi tải trang). */
export function kbIndexOf(db: MockDb): KbIndexState {
  db.kbIndex ??= { status: initial(scenario()), seq: 0 };
  return db.kbIndex;
}

/** Mỗi lần đọc: generation đang chạy tiến một lô (giả lập worker) — hết lô → catching_up → publish. */
export function readKbIndex(db: MockDb): KbIndexStatus {
  const k = kbIndexOf(db);
  const s = k.status;
  if (s.phase === 'building') {
    const done = Math.min(s.expected, s.done + STEP);
    k.status = { ...s, done, phase: done >= s.expected ? 'catching_up' : 'building' };
  } else if (s.phase === 'catching_up') {
    k.status = { ...base, active_space_label: s.target_space_label ?? NEW };
  }
  return k.status;
}

const open = (s: KbIndexStatus) => s.phase === 'building' || s.phase === 'catching_up';

export const kbIndexHandlers: Record<string, MockHandler> = {
  'kb.reindex': {
    preview: (db) => {
      const s = kbIndexOf(db).status;
      const target = s.target_space_label ?? NEW;
      return {
        summary: `${target} · ${CHUNKS}`,
        count: CHUNKS,
        changes: [{ entity: 'kb_index', before: { model: s.active_space_label }, after: { model: target, chunks: CHUNKS, tokens: TOKENS, credits: 5, storage: '720 KB' } }],
        warnings: ['kb_reindex_old_slot_serves', ...(open(s) ? ['kb_reindex_in_progress'] : [])],
      };
    },
    execute: (db) => {
      const k = kbIndexOf(db);
      const s = k.status;
      if (open(s)) return { generation_id: s.generation_id, phase: s.phase, expected: s.expected, reused: true };
      if (s.state === 'current') throw new ApiRequestError(409, { code: 'CONFLICT', message: 'index current', fields: { index: 'current' } });
      const id = `gen_${++k.seq}`;
      k.status = { ...s, phase: 'building', generation_id: id, done: 0, expected: CHUNKS, reason: null, target_space_label: s.target_space_label ?? NEW };
      return { generation_id: id, phase: 'building', expected: CHUNKS, reused: false };
    },
  },
  'kb.reindex_cancel': {
    preview: (db) => {
      const s = kbIndexOf(db).status;
      return { summary: open(s) ? `${s.target_space_label} · ${s.done}/${s.expected}` : '—', ...(open(s) ? {} : { warnings: ['kb_reindex_nothing_open'] }) };
    },
    execute: (db) => {
      const k = kbIndexOf(db);
      const s = k.status;
      if (!open(s)) return { cancelled: false, generation_id: null };
      k.status = { ...s, phase: 'cancelled', reason: 'cancelled_by_user' };
      return { cancelled: true, generation_id: s.generation_id };
    },
  },
};
