// Mock nhập dữ liệu dùng chung (TIP-038b; server: packages/core/src/data-transfer/*). Tệp CSV "đã tải" (`importTexts` — upload purpose
// import / attachment) → kế hoạch: ánh xạ đoán theo registry (`guessTransferMapping`), kiểm tối thiểu (bắt buộc / SĐT / email / tiền) giống
// server, dòng trùng trong tệp → duplicate. Commit khách hàng gọi đúng handler `contact.import` (cùng luật trùng / khách người khác) — thực
// thể khác: mock chỉ đếm applied (không dựng chứng từ). Kiểu cấu trúc, không import store / handlers (tránh vòng).
import {
  ApiRequestError,
  TRANSFER_ENTITIES,
  guessTransferMapping,
  normalizePhone,
  transferSpec,
  type ErrorCode,
  type TransferEntity,
  type TransferPlanDto,
  type TransferRowDto,
} from '@appchat/shared';
import { importTexts } from './product-import';

type Plan = TransferPlanDto & { file_id: string; rows: TransferRowDto[] };
const plans = new Map<string, Plan>();
let seq = 0;
const bad = (status: number, code: ErrorCode, fields: Record<string, string>) =>
  new ApiRequestError(status, { code, message: Object.keys(fields)[0]!, fields });

function table(fileId: string) {
  const f = importTexts.get(fileId);
  if (!f) throw bad(422, 'VALIDATION_FAILED', { file_id: 'not_found' });
  const [head = '', ...lines] = f.text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  return { name: f.name, columns: head.split(',').map((c) => c.trim()), rows: lines.map((l) => l.split(',').map((c) => c.trim())) };
}

function check(entity: TransferEntity, columns: string[], cells: string[][], mapping: Record<string, string>): TransferRowDto[] {
  const fields = transferSpec(entity).fields;
  for (const [k, c] of Object.entries(mapping)) {
    if (!fields.some((x) => x.key === k)) throw bad(422, 'VALIDATION_FAILED', { [`mapping.${k}`]: 'unknown_field' });
    if (!columns.includes(c)) throw bad(422, 'VALIDATION_FAILED', { [`mapping.${k}`]: 'column_not_found' });
  }
  const seen = new Set<string>();
  return cells.map((r, i) => {
    const data: Record<string, string> = {};
    const errors: Record<string, string> = {};
    for (const f of fields) {
      const v = mapping[f.key] ? (r[columns.indexOf(mapping[f.key]!)] ?? '').trim() : '';
      if (!v) {
        if (f.required) errors[f.key] = 'required';
        continue;
      }
      const val = f.type === 'phone' ? normalizePhone(v) : f.type === 'email' ? (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v.toLowerCase() : null) : f.type === 'money' ? (/^[\d.,\s]+$/.test(v) ? v.replace(/\D/g, '') : null) : v;
      if (val === null) errors[f.key] = 'invalid';
      else data[f.key] = val;
    }
    if (entity === 'contact' && !data.phone && !data.email && !Object.keys(errors).length) errors.contact = 'required';
    const key = data.phone ?? data.email;
    const dup = !Object.keys(errors).length && !!key && seen.has(key);
    if (key) seen.add(key);
    return { row_no: i + 1, data, check: Object.keys(errors).length ? 'invalid' : dup ? 'duplicate' : 'valid', errors, status: 'pending', result_id: null, result_code: null };
  });
}

const counts = (rows: TransferRowDto[], extra: Partial<TransferPlanDto['counts']> = {}) => ({
  total: rows.length,
  valid: rows.filter((r) => r.check === 'valid').length,
  invalid: rows.filter((r) => r.check === 'invalid').length,
  duplicates: rows.filter((r) => r.check === 'duplicate' || r.check === 'owned').length,
  applied: 0,
  skipped: 0,
  failed: 0,
  ...extra,
});

const view = (p: Plan): TransferPlanDto => {
  const out: Partial<Plan> = structuredClone(p);
  delete out.file_id;
  delete out.rows;
  return out as TransferPlanDto;
};
const own = (id: string) => {
  const p = plans.get(id);
  if (!p) throw bad(404, 'NOT_FOUND', { plan_id: 'not_found' });
  return p;
};

/** Ghi khách: handler `contact.import` thật của mock (cùng luật trùng); trả số đã tạo. */
type ImportContacts<D> = (db: D, rows: Record<string, string>[]) => { created: number };

export function dataTransferHandlers<D>(importContacts: ImportContacts<D>) {
  return {
    'transfer.sample': {
      execute: (_db: unknown, i: { entity: TransferEntity; file_id: string }) => {
        const t = table(i.file_id);
        const spec = transferSpec(i.entity);
        return {
          file_name: t.name,
          sheets: [],
          sheet: null,
          columns: t.columns,
          total_rows: t.rows.length,
          sample: t.rows.slice(0, 20),
          fields: spec.fields.map((f) => ({ key: f.key, type: f.type, required: !!f.required })),
          mapping: guessTransferMapping(i.entity, t.columns),
          import_supported: spec.importReady,
        };
      },
    },
    'transfer.plan': {
      preview: (_db: unknown, i: { entity: string }) => ({ summary: `transfer.plan · ${i.entity}` }),
      execute: (_db: unknown, i: { entity: TransferEntity; file_id: string; mapping?: Record<string, string> }) => {
        const t = table(i.file_id);
        const mapping = i.mapping ?? guessTransferMapping(i.entity, t.columns);
        const rows = check(i.entity, t.columns, t.rows, mapping);
        const now = new Date();
        const p: Plan = {
          id: `0190f000-0000-7000-8000-${String(++seq).padStart(12, '0')}`,
          entity: i.entity,
          file_name: t.name,
          sheet: null,
          columns: t.columns,
          mapping,
          version: 1,
          row_policy: 'all_valid',
          status: 'draft',
          counts: counts(rows),
          job_id: null,
          error: null,
          expires_at: new Date(now.getTime() + 86_400_000).toISOString(),
          created_at: now.toISOString(),
          file_id: i.file_id,
          rows,
        };
        plans.set(p.id, p);
        return view(p);
      },
    },
    'transfer.update_mapping': {
      execute: (_db: unknown, i: { plan_id: string; if_version: number; mapping?: Record<string, string>; row_policy?: 'all_valid' | 'only_valid' }) => {
        const p = own(i.plan_id);
        if (p.status !== 'draft') throw bad(409, 'INVALID_STATE', { status: p.status });
        if (p.version !== i.if_version) throw bad(409, 'CONFLICT', { if_version: 'stale' });
        const t = table(p.file_id);
        if (i.mapping) p.mapping = i.mapping;
        if (i.row_policy) p.row_policy = i.row_policy;
        p.rows = check(p.entity, t.columns, t.rows, p.mapping);
        p.counts = counts(p.rows);
        p.version += 1;
        return view(p);
      },
    },
    'transfer.commit': {
      preview: (_db: unknown, i: { plan_id: string }) => {
        const p = own(i.plan_id);
        const skip = p.counts.duplicates + (p.row_policy === 'only_valid' ? p.counts.invalid : 0);
        return { summary: `${p.file_name} · ${p.counts.valid}`, count: p.counts.valid, ...(skip ? { warnings: [`skipped:${skip}`] } : {}) };
      },
      execute: (db: D, i: { plan_id: string; if_version: number }) => {
        const p = own(i.plan_id);
        if (p.version !== i.if_version) throw bad(409, 'CONFLICT', { if_version: 'stale' });
        if (p.status !== 'draft') throw bad(409, 'INVALID_STATE', { status: p.status });
        if (!p.counts.valid) throw bad(409, 'INVALID_STATE', { rows: 'none_valid' });
        if (p.row_policy === 'all_valid' && p.counts.invalid) throw bad(409, 'INVALID_STATE', { rows: 'has_invalid' });
        const valid = p.rows.filter((r) => r.check === 'valid');
        const created = p.entity === 'contact' ? importContacts(db, valid.map((r) => r.data)).created : valid.length;
        let left = created;
        for (const r of p.rows) {
          if (r.check !== 'valid') r.status = 'skipped';
          else r.status = left-- > 0 ? 'applied' : 'skipped';
        }
        p.status = 'completed';
        p.counts = { ...p.counts, applied: created, skipped: p.rows.length - created, failed: 0 };
        return { plan_id: p.id, status: 'completed', applied: created, skipped: p.counts.skipped, failed: 0, job_id: null };
      },
    },
    'transfer.cancel': {
      execute: (_db: unknown, i: { plan_id: string }) => {
        const p = own(i.plan_id);
        if (p.status === 'draft') p.status = 'cancelled';
        return { plan_id: p.id, status: p.status };
      },
    },
  };
}

/** GET /data-transfer/capabilities · /plans/:id · /plans/:id/rows (cùng shape `@appchat/shared`; transport mở `{ data }` như http). */
export function dataTransferRoute(path: string) {
  if (path === '/data-transfer/capabilities')
    return () =>
      TRANSFER_ENTITIES.map((entity) => ({
        entity,
        import: { supported: true, reason: null, formats: ['xlsx', 'csv'], fields: transferSpec(entity).fields.map((f) => ({ key: f.key, required: !!f.required })) },
        export: { supported: true, reason: null, action_id: transferSpec(entity).exportAction },
      }));
  const m = path.match(/^\/data-transfer\/plans\/([^/]+)(\/rows)?$/);
  if (!m) return undefined;
  return (_db: unknown, q: Record<string, unknown> = {}) => {
    const p = own(decodeURIComponent(m[1]!));
    if (!m[2]) return view(p);
    const after = Number(q.cursor ?? 0);
    const limit = Math.min(Number(q.limit ?? 50) || 50, 100);
    const rows = p.rows.filter((r) => (!q.check || r.check === q.check) && r.row_no > after);
    const page = rows.slice(0, limit);
    return { data: structuredClone(page), next_cursor: rows.length > limit ? String(page.at(-1)!.row_no) : null };
  };
}
