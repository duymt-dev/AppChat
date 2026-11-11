// Mock đầu vào Trợ lý (TIP-023f §5.1, §5.3; server: packages/core/src/ai/assistant/input/*). 4 action `assistant.attachment_*` + GET
// `/assistant/input/:id(/parts)` + kiểm handle của lượt. Mô phỏng tất định: nhận diện loại theo phần mở rộng + vài byte đầu, tệp chữ
// tách đoạn theo dòng trống, PDF / DOCX / XLSX / ảnh chỉ có một phần giữ chỗ (mock không có parser). Tên `*corrupt*` → lỗi `corrupt`,
// `*.exe` → `unsupported_type` (kiểm luồng lỗi). Lần hỏi đầu trả `preparing` (như worker xử lý sau). Không chứng minh khả năng parser.
import { ApiRequestError, INPUT_MAX_ATTACHMENTS, type InputKind } from '@appchat/shared';
import { inputArtifacts, inputUploads, type MockArtifact } from '../assistant-input-store';

/** Cùng hình `MockHandler` (handlers.ts) — khai cục bộ để không tạo vòng import domain ↔ handlers. */
type MockHandler = { execute(db: unknown, input: never): unknown };

const uuid = () => crypto.randomUUID();
const KINDS: Record<string, InputKind> = { txt: 'text', md: 'markdown', html: 'html', htm: 'html', pdf: 'pdf', docx: 'docx', csv: 'csv', xlsx: 'xlsx', png: 'png', jpg: 'jpeg', jpeg: 'jpeg', eml: 'eml' };
const err = (status: number, code: 'NOT_FOUND' | 'CONFLICT' | 'VALIDATION_FAILED' | 'INVALID_STATE' | 'ATTACHMENT_NOT_PREPARED', fields: Record<string, string>) =>
  new ApiRequestError(status, { code, message: Object.values(fields)[0] ?? code, fields });

function own(id: string): MockArtifact {
  const a = inputArtifacts.get(id);
  if (!a) throw err(404, 'NOT_FOUND', { artifact_id: 'not_found' });
  return a;
}

const PUBLIC = ['artifact_id', 'revision', 'phase', 'name', 'kind', 'size', 'session_id', 'part_count', 'error_reason', 'source_available', 'expires_at'] as const;
/** DTO công khai: không nonce / file_id / phần nội dung. */
const dto = (a: MockArtifact) => Object.fromEntries(PUBLIC.map((k) => [k, a[k]]));

/** "Worker" mock: lần hỏi thứ hai mới có kết quả. */
function settle(a: MockArtifact) {
  if (a.phase !== 'queued' && a.phase !== 'preparing') return;
  if (a.polls++ < 1) return void (a.phase = 'preparing');
  const u = inputUploads.get(a.file_id);
  const ext = a.name.slice(a.name.lastIndexOf('.') + 1).toLowerCase();
  if (/corrupt/i.test(a.name)) return Object.assign(a, { phase: 'failed', error_reason: 'corrupt' });
  const kind = KINDS[ext];
  if (!kind) return Object.assign(a, { phase: 'unsupported', error_reason: 'unsupported_type' });
  const text = u?.text ?? null;
  const parts: MockArtifact['parts'] =
    kind === 'png' || kind === 'jpeg'
      ? [{ locator: { kind: 'image' }, image_ref: `image:${a.artifact_id}:0` }]
      : text !== null
        ? text.split(/\n\s*\n/).filter(Boolean).map((p, i) => ({ locator: kind === 'csv' ? { kind: 'csv_record', record: i + 1, line_start: i + 1, line_end: i + 1 } : { kind: 'paragraph', paragraph: i + 1 }, text: p.slice(0, 8000) }))
        : [{ locator: kind === 'pdf' ? { kind: 'page', page: 1 } : { kind: 'paragraph', paragraph: 1 }, text: `[mock] ${a.name}` }];
  Object.assign(a, { phase: 'ready', kind, part_count: parts.length, parts });
}

export const assistantInputHandlers: Record<string, MockHandler> = {
  'assistant.attachment_prepare': {
    execute: (_db, i: { file_id: string; draft_nonce: string; session_id?: string }) => {
      const u = inputUploads.get(i.file_id);
      if (!u) throw err(404, 'NOT_FOUND', { file_id: 'not_found' });
      const same = [...inputArtifacts.values()].find((a) => a.draft_nonce === i.draft_nonce && a.file_id === i.file_id);
      if (same) return { artifact_id: same.artifact_id, revision: same.revision, phase: same.phase };
      const live = [...inputArtifacts.values()].filter((a) => a.draft_nonce === i.draft_nonce && a.phase !== 'cancelled').length;
      if (live >= INPUT_MAX_ATTACHMENTS) throw err(422, 'VALIDATION_FAILED', { attachments: 'too_many' });
      const id = uuid();
      const a: MockArtifact = { artifact_id: id, revision: 1, phase: 'queued', name: u.name, kind: null, size: u.size, session_id: i.session_id ?? null, part_count: 0, error_reason: null, source_available: true, expires_at: new Date(Date.now() + 86_400_000).toISOString(), draft_nonce: i.draft_nonce, file_id: i.file_id, polls: 0, parts: [] };
      inputArtifacts.set(id, a);
      return { artifact_id: id, revision: 1, phase: 'queued' };
    },
  },
  'assistant.attachment_remove': {
    execute: (_db, i: { artifact_id: string; if_revision: number }) => {
      const a = own(i.artifact_id);
      if (a.revision !== i.if_revision) throw err(409, 'CONFLICT', { revision: 'stale' });
      if (a.session_id) throw err(409, 'INVALID_STATE', { artifact_id: 'bound' });
      Object.assign(a, { phase: 'cancelled', revision: a.revision + 1, parts: [] });
      return { artifact_id: a.artifact_id, revision: a.revision, phase: a.phase };
    },
  },
  'assistant.attachment_get': { execute: (_db, i: { artifact_id: string }) => dto(own(i.artifact_id)) },
  'assistant.attachment_read': { execute: (_db, i: { artifact_id: string; revision: number; cursor?: string; limit?: number }) => readParts(i) },
};

function readParts(i: { artifact_id: string; revision: number; cursor?: string; limit?: number }) {
  const a = own(i.artifact_id);
  if (a.revision !== i.revision) throw err(409, 'CONFLICT', { revision: 'stale' });
  if (a.phase !== 'ready') throw err(409, 'INVALID_STATE', { phase: a.phase });
  const from = Number(i.cursor ?? 0) || 0;
  const limit = Math.min(Math.max(i.limit ?? 8, 1), 8);
  const page = a.parts.slice(from, from + limit);
  const more = from + limit < a.parts.length;
  return { artifact_id: a.artifact_id, revision: a.revision, parts: page, has_more: more, next_cursor: more ? String(from + limit) : null };
}

/** GET /assistant/input/:id và /:id/parts — cùng dịch vụ đọc với action get / read. */
export const assistantInputRoute = (path: string) => {
  const m = path.match(/^\/assistant\/input\/([^/?]+)(\/parts)?$/);
  if (!m) return null;
  const id = decodeURIComponent(m[1]!);
  return (_db: unknown, p: Record<string, unknown>) => {
    if (m[2]) return readParts({ artifact_id: id, revision: Number(p.revision), ...(p.cursor ? { cursor: String(p.cursor) } : {}), ...(p.limit ? { limit: Number(p.limit) } : {}) });
    const a = own(id);
    settle(a);
    return dto(a);
  };
};

/** Lượt mang handle: chủ / ready / revision như server; buộc vào phiên. Trả phần tin (tên + loại) + đoạn trích cho kịch bản trả lời. */
export function bindTurnInputs(inputs: unknown, session: string): { names: { name: string; kind: string }[]; excerpt: string } {
  const list = Array.isArray(inputs) ? (inputs as { artifact_id: string; revision: number }[]) : [];
  const rows = list.map((h) => {
    const a = own(String(h.artifact_id));
    if (a.revision !== h.revision) throw err(409, 'CONFLICT', { attachments: 'stale_revision' });
    if (a.phase !== 'ready') throw err(409, 'ATTACHMENT_NOT_PREPARED', { attachments: a.phase });
    if (a.session_id && a.session_id !== session) throw err(409, 'CONFLICT', { attachments: 'bound_elsewhere' });
    return a;
  });
  for (const a of rows) a.session_id = session;
  return { names: rows.map((a) => ({ name: a.name, kind: a.kind ?? 'file' })), excerpt: rows.flatMap((a) => a.parts.map((p) => p.text ?? '')).join(' ').slice(0, 160) };
}
