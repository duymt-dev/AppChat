// Mock việc dữ liệu nặng (TIP-045b annex D; server: packages/core/src/kernel/jobs/*). `contact.bulk_update` ≤ 50: kết quả từng khách ngay;
// > 50: `__accepted` (202 job_accepted) — lần đọc `/data-jobs/:id` đầu báo `running`, lần sau `completed` (đã áp patch cho từng khách, id
// không có → biên nhận lỗi). Huỷ (lặp lại an toàn) / thử lại chỉ bản ghi lỗi như server. Kiểu cấu trúc, không import domain khác.
// Loại việc khác (TIP-034c ticket hàng loạt) tự mang runner từng bản ghi + kết quả theo loại (`/data-jobs/:id/result`) — như
// registerDataJobKind / registerJobResult phía server; việc đã niêm phong hoàn tác không thử lại được.
import { ApiRequestError, BULK_SYNC_MAX, type DataJobDto, type DataJobItemDto } from '@appchat/shared';

type Patch = Record<string, unknown> & { add_tags?: string[]; remove_tags?: string[] };
type C = { id: string; tags: string[]; deleted?: boolean } & Record<string, unknown>;
/** Store mock (cấu trúc — không import store / handlers: tránh vòng phụ thuộc như product-import). */
type MockDb = { customers: { contacts: object[] } };
/** Runner từng bản ghi của loại việc riêng; `done` chạy một lần khi việc kết thúc. */
export type JobRunner = { run: (db: unknown, targetId: string) => Pick<DataJobItemDto, 'status' | 'error'>; done?: (db: unknown, jobId: string) => void };
type Job = DataJobDto & { items: DataJobItemDto[]; patch: Patch; polls: number; runner?: JobRunner; sealed?: boolean; logId?: string };

// Cấu trúc như MockHandler.
type Handler = { execute(db: MockDb, input: never): unknown; preview?(db: MockDb, input: never): { summary: string; count?: number } };

const jobs = new Map<string, Job>();
let seq = 0;

const contacts = (db: MockDb) => db.customers.contacts as unknown as C[];
const notFound = () => new ApiRequestError(404, { code: 'NOT_FOUND', message: 'job_id', fields: { job_id: 'not_found' } });
const invalid = (f: Record<string, string>) => new ApiRequestError(409, { code: 'INVALID_STATE', message: Object.keys(f)[0]!, fields: f });

function apply(db: MockDb, id: string, p: Patch): DataJobItemDto['status'] {
  const c = contacts(db).find((x) => x.id === id && !x.deleted);
  if (!c) throw new Error('NOT_FOUND:contact_id');
  const { add_tags, remove_tags, ...cols } = p;
  const before = JSON.stringify(c);
  Object.assign(c, cols);
  c.tags = [...new Set([...c.tags, ...(add_tags ?? [])])].filter((t) => !(remove_tags ?? []).includes(t));
  return JSON.stringify(c) === before ? 'skipped' : 'done';
}

const run = (db: MockDb, id: string, p: Patch): DataJobItemDto => {
  try {
    return { seq: 0, target_id: id, status: apply(db, id, p), error: null };
  } catch (e) {
    return { seq: 0, target_id: id, status: 'failed', error: (e as Error).message };
  }
};

const view = ({ items: _i, patch: _p, polls: _n, runner: _r, sealed: _s, logId: _l, ...dto }: Job): DataJobDto => {
  void [_i, _p, _n, _r, _s, _l];
  return dto;
};
const tally = (j: Job) => {
  j.done = j.items.filter((i) => i.status === 'done' || i.status === 'skipped').length;
  j.failed = j.items.filter((i) => i.status === 'failed').length;
};

export const dataJobsHandlers: Record<string, Handler> = {
  'contact.bulk_update': {
    preview: (_db, i: { contact_ids: string[] }) => ({ summary: `${new Set(i.contact_ids).size}`, count: new Set(i.contact_ids).size }),
    execute: (db, i: { contact_ids: string[]; patch: Patch }) => {
      const ids = [...new Set(i.contact_ids)];
      if (ids.length > BULK_SYNC_MAX) {
        // Id dạng uuid như server (action data_job.* kiểm uuid).
        const id = `0190f000-0000-7000-8000-${String(++seq).padStart(12, '0')}`;
        const now = new Date().toISOString();
        jobs.set(id, {
          id, kind: 'contact.bulk_update', action_id: 'contact.bulk_update', status: 'queued', total: ids.length, done: 0, failed: 0, error: null,
          download_url: null, file_name: null, expires_at: null, created_at: now, finished_at: null,
          items: ids.map((t, s) => ({ seq: s, target_id: t, status: 'pending', error: null })), patch: i.patch, polls: 0,
        });
        return { updated: 0, failed: 0, items: [], __accepted: { job_id: id, status_url: `/v1/data-jobs/${id}` } };
      }
      const items = ids.map((t) => run(db, t, i.patch));
      return { updated: items.filter((x) => x.status === 'done').length, failed: items.filter((x) => x.status === 'failed').length, items: items.map((x) => ({ id: x.target_id, status: x.status, error: x.error })) };
    },
  },
  'data_job.cancel': {
    execute: (_db, i: { job_id: string }) => {
      const j = jobs.get(i.job_id);
      if (!j) throw notFound();
      if (j.status === 'cancelling' || j.status === 'cancelled') return { status: j.status };
      if (j.status !== 'queued' && j.status !== 'running') throw invalid({ status: j.status });
      j.status = 'cancelling';
      return { status: 'cancelling' };
    },
  },
  'data_job.retry': {
    execute: (_db, i: { job_id: string }) => {
      const j = jobs.get(i.job_id);
      if (!j) throw notFound();
      if (!['failed', 'cancelled', 'completed'].includes(j.status)) throw invalid({ status: j.status });
      if (j.sealed) throw invalid({ undo: 'sealed' });
      const failed = j.items.filter((x) => x.status === 'failed');
      if (!failed.length && !j.items.some((x) => x.status === 'pending')) throw invalid({ items: 'nothing_to_retry' });
      failed.forEach((x) => Object.assign(x, { status: 'pending', error: null }));
      Object.assign(j, { status: 'queued', finished_at: null, polls: 0 });
      return { status: 'queued', retried: failed.length, __accepted: { job_id: j.id, status_url: `/v1/data-jobs/${j.id}` } };
    },
  },
};

/** Việc xuất danh sách (TIP-038 pha 3): tập id chốt + nội dung tệp; ≤ 50 dòng xong ngay, còn lại đi qua tick như sửa hàng loạt. */
export function exportJob(kind: string, ids: string[], fileName: string, body: string, sync: boolean): DataJobDto {
  const id = `0190f000-0000-7000-8000-${String(++seq).padStart(12, '0')}`;
  const now = new Date().toISOString();
  const j: Job = {
    id, kind, action_id: kind, status: sync ? 'completed' : 'queued', total: ids.length, done: sync ? ids.length : 0, failed: 0, error: null,
    download_url: sync ? `/v1/data-jobs/${id}/download` : null, file_name: fileName, expires_at: null, created_at: now, finished_at: sync ? now : null,
    items: ids.map((t, n) => ({ seq: n, target_id: t, status: sync ? 'done' : 'pending', error: null })), patch: {}, polls: 0,
  };
  files.set(id, body);
  jobs.set(id, j);
  return view(j);
}
const files = new Map<string, string>();
/** Tải tệp xuất của mock (`/data-jobs/:id/download`) — chỉ khi việc đã xong. */
export function dataJobBlob(path: string): Blob | null {
  const m = path.match(/^\/data-jobs\/([0-9a-f-]{36})\/download$/);
  const j = m ? jobs.get(m[1]!) : undefined;
  if (!j || j.status !== 'completed') return null;
  return new Blob([files.get(j.id) ?? ''], { type: 'text/csv' });
}

/** Giả worker: lần đọc đầu → running; lần sau → chạy hết bản ghi pending (hoặc dừng nếu đã huỷ). */
function tick(db: MockDb, j: Job) {
  if (j.status === 'queued') return void (j.status = 'running');
  if (j.status === 'cancelling') return void Object.assign(j, { status: 'cancelled', finished_at: new Date().toISOString() });
  if (j.status !== 'running' || ++j.polls < 1) return;
  const exporting = files.has(j.id);
  for (const it of j.items.filter((x) => x.status === 'pending')) Object.assign(it, exporting ? { status: 'done' } : j.runner ? j.runner.run(db, it.target_id) : run(db, it.target_id, j.patch), { seq: it.seq });
  tally(j);
  Object.assign(j, { status: 'completed', finished_at: new Date().toISOString(), ...(exporting ? { download_url: `/v1/data-jobs/${j.id}/download` } : {}) });
  j.runner?.done?.(db, j.id);
}

/** Việc của loại riêng (TIP-034c): ≤ 50 chạy hết ngay (như afterCommit của server), còn lại chờ tick như việc nền. */
export function startJob(db: MockDb, kind: string, ids: string[], runner: JobRunner, sync: boolean): string {
  const id = `0190f000-0000-7000-8000-${String(++seq).padStart(12, '0')}`;
  const j: Job = {
    id, kind, action_id: kind, status: 'queued', total: ids.length, done: 0, failed: 0, error: null, download_url: null, file_name: null, expires_at: null,
    created_at: new Date().toISOString(), finished_at: null, items: ids.map((t, n) => ({ seq: n, target_id: t, status: 'pending', error: null })), patch: {}, polls: 0, runner,
  };
  jobs.set(id, j);
  if (sync) {
    j.status = 'running';
    tick(db, j);
  }
  return id;
}
/** Biên nhận + trạng thái của việc (đọc kết quả theo loại). */
export const jobState = (id: string): { status: DataJobDto['status']; total: number; items: DataJobItemDto[]; sealed: boolean; logId?: string } | undefined => {
  const j = jobs.get(id);
  return j && { status: j.status, total: j.total, items: j.items, sealed: !!j.sealed, ...(j.logId ? { logId: j.logId } : {}) };
};
/** Gắn action_log của yêu cầu nhận việc (như data_job.action_log_id) / niêm phong khi đã hoàn tác. */
export const bindJobLog = (id: string, logId: string) => void (jobs.get(id) && (jobs.get(id)!.logId = logId));
export const jobOfLog = (logId: string) => [...jobs.values()].find((j) => j.logId === logId)?.id;
export const sealJob = (id: string) => void (jobs.get(id) && (jobs.get(id)!.sealed = true));
const RESULTS = new Map<string, (db: unknown, id: string) => unknown>();
export const registerMockJobResult = (kind: string, r: (db: unknown, id: string) => unknown) => void RESULTS.set(kind, r);

export const dataJobsRoute = (path: string): ((db: MockDb, p: Record<string, unknown>) => unknown) | undefined => {
  const m = path.match(/^\/data-jobs\/([0-9a-f-]{36})(\/items|\/result)?$/);
  if (!m) return undefined;
  return (db, p) => {
    const j = jobs.get(m[1]!);
    if (!j) throw notFound();
    if (m[2] === '/result') {
      // Kết quả theo loại (TIP-034c) — màn chỉ đọc route này khi theo dõi, nên giả worker cũng chạy ở đây.
      const r = RESULTS.get(j.kind);
      if (!r) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: 'result', fields: { result: 'not_supported' } });
      tick(db, j);
      return r(db, j.id);
    }
    if (m[2]) return { data: j.items.filter((x) => p.only !== 'failed' || x.status === 'failed'), next_cursor: null };
    tick(db, j);
    return view(j);
  };
};
