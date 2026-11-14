// Mock nhập dữ liệu dùng chung (TIP-038b; server: packages/core/src/data-transfer/*). Tệp CSV "đã tải" (`importTexts` — upload purpose
// import / attachment) → kế hoạch: ánh xạ đoán theo registry (`guessTransferMapping`), kiểm tối thiểu (bắt buộc / SĐT / email / tiền) giống
// server, dòng trùng trong tệp → duplicate. Commit khách hàng gọi đúng handler `contact.import` (cùng luật trùng / khách người khác) — thực
// thể khác: mock chỉ đếm applied (không dựng chứng từ). Kiểu cấu trúc, không import store / handlers (tránh vòng).
import {
  ApiRequestError,
  CATEGORY_LABELS_MAX,
  categoryKey,
  labelError,
  normalizeCategoryLabel,
  DATASETS_OF,
  exportOnly,
  TRANSFER_ENTITIES,
  datasetAllowed,
  foldText,
  guessTransferMapping,
  normalizePhone,
  targetOf,
  transferSpec,
  type ErrorCode,
  type TransferDataset,
  type TransferEntity,
  type TransferTarget,
  type TransferPlanDto,
  type TransferRowDto,
} from '@appchat/shared';
import { importTexts } from './product-import';

type Plan = TransferPlanDto & { file_id: string; rows: TransferRowDto[] };
const targetOfPlan = (p: Pick<TransferPlanDto, 'entity' | 'dataset'>) => targetOf(p.entity, p.dataset);
/** Tập bỏ trống = base; tập không thuộc thực thể → 422 như server. */
function resolve(entity: TransferEntity, dataset?: TransferDataset): TransferTarget {
  const d = dataset ?? 'base';
  if (!datasetAllowed(entity, d)) throw bad(422, 'VALIDATION_FAILED', { dataset: 'unsupported' });
  const t = targetOf(entity, d);
  // Tập chỉ xuất (liệu trình — TIP-033b §5.1): nhập dừng trước khi đọc tệp, như server.
  if (exportOnly(t)) throw bad(422, 'VALIDATION_FAILED', { dataset: 'export_only' });
  return t;
}
const sameDataset = (p: Plan, sent?: TransferDataset) => {
  if (sent !== undefined && sent !== p.dataset) throw bad(409, 'CONFLICT', { dataset: 'mismatch' });
};
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

function check(entity: TransferTarget, columns: string[], cells: string[][], mapping: Record<string, string>): TransferRowDto[] {
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
      const val = f.type === 'phone' ? normalizePhone(v) : f.type === 'email' ? (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v.toLowerCase() : null) : f.type === 'money' ? (/^[\d.,\s]+$/.test(v) ? v.replace(/\D/g, '') : null) : f.type === 'enum' ? (f.options?.find((o) => o === foldText(v)) ?? f.optionAliases?.[foldText(v)] ?? null) : v;
      if (val === null) errors[f.key] = 'invalid';
      else data[f.key] = val;
    }
    if (entity === 'contact' && !data.phone && !data.email && !Object.keys(errors).length) errors.contact = 'required';
    // Tập hoạt động CRM (TIP-026b §5): khách bằng mã / SĐT / email; việc nhập luôn mở; cơ hội won / lost bị từ chối; dòng có id xuất → loại.
    if (entity !== 'contact' && entity.startsWith('contact_')) {
      if (!data.contact_code && !data.contact_phone && !data.contact_email) errors.contact = 'required';
      if (entity === 'contact_tasks' && data.state && data.state !== 'open') errors.state = 'readonly';
      if (entity === 'contact_opportunities' && (data.stage === 'won' || data.stage === 'lost')) errors.stage = 'terminal';
      if (data.id && !Object.keys(errors).length) errors.id_warning = 'exported_record';
    }
    // TIP-034b §4: nhãn danh mục theo validator dùng chung (trùng không phân biệt hoa thường, ≤ 60 ký tự, ≤ 100 nhãn) — cả tệp một bộ.
    if (entity === 'ticket_category_suggestions' && data.label !== undefined && !errors.label) {
      data.label = normalizeCategoryLabel(data.label);
      const e = labelError(data.label) ?? (seen.has(categoryKey(data.label)) ? 'duplicate' : i >= CATEGORY_LABELS_MAX ? 'too_many' : null);
      if (e) errors.label = e;
      seen.add(categoryKey(data.label));
    }
    const key = entity === 'contact' ? (data.phone ?? data.email) : undefined;
    const dup = !Object.keys(errors).length && !!key && seen.has(key);
    if (key) seen.add(key);
    const hard = Object.keys(errors).filter((k) => !k.endsWith('_warning')).length;
    return { row_no: i + 1, data, check: hard ? 'invalid' : dup || errors.id_warning ? 'duplicate' : 'valid', errors, status: 'pending', result_id: null, result_code: null };
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
      execute: (_db: unknown, i: { entity: TransferEntity; dataset?: TransferDataset; file_id: string }) => {
        const target = resolve(i.entity, i.dataset);
        const t = table(i.file_id);
        const spec = transferSpec(target);
        return {
          dataset: spec.dataset,
          file_name: t.name,
          sheets: [],
          sheet: null,
          columns: t.columns,
          total_rows: t.rows.length,
          sample: t.rows.slice(0, 20),
          fields: spec.fields.map((f) => ({ key: f.key, type: f.type, required: !!f.required, ...(f.hint ? { hint: f.hint } : {}), ...(f.warnings ? { warnings: [...f.warnings] } : {}) })),
          mapping: guessTransferMapping(target, t.columns),
          import_supported: spec.importReady,
        };
      },
    },
    'transfer.plan': {
      preview: (_db: unknown, i: { entity: string }) => ({ summary: `transfer.plan · ${i.entity}` }),
      execute: (_db: unknown, i: { entity: TransferEntity; dataset?: TransferDataset; file_id: string; mapping?: Record<string, string> }) => {
        const target = resolve(i.entity, i.dataset);
        const t = table(i.file_id);
        const mapping = i.mapping ?? guessTransferMapping(target, t.columns);
        const rows = check(target, t.columns, t.rows, mapping);
        const now = new Date();
        const spec = transferSpec(target);
        const p: Plan = {
          id: `0190f000-0000-7000-8000-${String(++seq).padStart(12, '0')}`,
          entity: i.entity,
          dataset: spec.dataset,
          dataset_schema_version: spec.schemaVersion,
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
      execute: (_db: unknown, i: { plan_id: string; if_version: number; dataset?: TransferDataset; mapping?: Record<string, string>; row_policy?: 'all_valid' | 'only_valid' }) => {
        const p = own(i.plan_id);
        sameDataset(p, i.dataset);
        if (p.status !== 'draft') throw bad(409, 'INVALID_STATE', { status: p.status });
        if (p.version !== i.if_version) throw bad(409, 'CONFLICT', { if_version: 'stale' });
        const t = table(p.file_id);
        if (i.mapping) p.mapping = i.mapping;
        if (i.row_policy) p.row_policy = i.row_policy;
        p.rows = check(targetOfPlan(p), t.columns, t.rows, p.mapping);
        p.counts = counts(p.rows);
        p.version += 1;
        return view(p);
      },
    },
    'transfer.commit': {
      preview: (_db: unknown, i: { plan_id: string; dataset?: TransferDataset }) => {
        const p = own(i.plan_id);
        sameDataset(p, i.dataset);
        const skip = p.counts.duplicates + (p.row_policy === 'only_valid' ? p.counts.invalid : 0);
        return { summary: `${p.file_name} · ${p.counts.valid}`, count: p.counts.valid, ...(skip ? { warnings: [`skipped:${skip}`] } : {}) };
      },
      execute: (db: D, i: { plan_id: string; if_version: number; dataset?: TransferDataset }) => {
        const p = own(i.plan_id);
        sameDataset(p, i.dataset);
        if (p.version !== i.if_version) throw bad(409, 'CONFLICT', { if_version: 'stale' });
        if (p.status !== 'draft') throw bad(409, 'INVALID_STATE', { status: p.status });
        if (!p.counts.valid) throw bad(409, 'INVALID_STATE', { rows: 'none_valid' });
        if (p.row_policy === 'all_valid' && p.counts.invalid) throw bad(409, 'INVALID_STATE', { rows: 'has_invalid' });
        const valid = p.rows.filter((r) => r.check === 'valid');
        const created = targetOfPlan(p) === 'contact' ? importContacts(db, valid.map((r) => r.data)).created : valid.length;
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
      TRANSFER_ENTITIES.flatMap((entity) =>
        DATASETS_OF[entity].map((dataset) => {
          const spec = transferSpec(targetOf(entity, dataset));
          return {
            entity,
            dataset,
            import: { supported: spec.importReady, reason: spec.importReady ? null : 'not_available', formats: ['xlsx', 'csv'], fields: spec.fields.map((f) => ({ key: f.key, required: !!f.required })) },
            export: { supported: true, reason: null, action_id: spec.exportAction },
          };
        }),
      );
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
