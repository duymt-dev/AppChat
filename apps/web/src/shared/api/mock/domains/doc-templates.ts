// Mock Mẫu chứng từ (Blueprint §2.3 doc_template, §4.2 GET /doc-templates?kind=; D30, standards/documents/templates.md).
// Ghi: doc_template.create / update / delete (mặc định của loại không xoá được), doc_template.detect_fields (AI nhận diện biến trong DOCX:
// mock trả gợi ý cố định theo loại + bảng kiểm). Biến lạ → 422 VALIDATION_FAILED (registry @appchat/shared).
import { ApiRequestError, LEGAL_CHECKLIST, NOT_VAT_KINDS, validateTemplateVars, type DocKind } from '@appchat/shared';
import type { MockHandler } from '../handlers';
import type { MockRoute } from '../routes';

export interface DocTemplate {
  id: string;
  kind: DocKind;
  name: string;
  source: 'rich' | 'docx';
  body?: string;
  file_name?: string;
  fields: { placeholder: string; variable: string }[];
  is_default: boolean;
  version: number;
  updated_by: string;
  updated_at: string;
  deleted?: boolean;
}

const AT = '2026-06-20T10:00:00+07:00';
const NOT_VAT = 'Chứng từ này không thay thế hoá đơn giá trị gia tăng.';
const SEED: DocTemplate[] = [
  { id: 'tpl_q1', kind: 'quote', name: 'Báo giá chuẩn', source: 'rich', body: '<h2>BÁO GIÁ {{doc.code}}</h2><p>Kính gửi: {{customer.name}}</p>{{#items}}{{/items}}<p>Hiệu lực đến {{doc.valid_until}}</p>', fields: [], is_default: true, version: 3, updated_by: 'Thùy Trâm', updated_at: AT },
  { id: 'tpl_q2', kind: 'quote', name: 'Báo giá liệu trình spa', source: 'docx', file_name: 'bao-gia-lieu-trinh.docx', fields: [{ placeholder: 'Kính gửi: ……', variable: 'customer.name' }, { placeholder: 'Bảng dịch vụ', variable: 'items' }, { placeholder: 'Tổng cộng: ……', variable: 'totals.total' }], is_default: false, version: 1, updated_by: 'Thùy Trâm', updated_at: '2026-06-12T15:30:00+07:00' },
  { id: 'tpl_c1', kind: 'contract', name: 'Hợp đồng dịch vụ', source: 'docx', file_name: 'hop-dong-dich-vu.docx', fields: [{ placeholder: 'BÊN B: ……', variable: 'customer.name' }, { placeholder: 'Giá trị hợp đồng: ……', variable: 'contract.value' }, { placeholder: 'Thời hạn: từ …… đến ……', variable: 'contract.start' }], is_default: true, version: 2, updated_by: 'Thùy Trâm', updated_at: AT },
  { id: 'tpl_p1', kind: 'payment_request', name: 'Đề nghị thanh toán', source: 'rich', body: `<h2>ĐỀ NGHỊ THANH TOÁN {{doc.code}}</h2><p>{{payment.vietqr}}</p><p>${NOT_VAT}</p>`, fields: [], is_default: true, version: 1, updated_by: 'Hệ thống', updated_at: AT },
  { id: 'tpl_r1', kind: 'receipt', name: 'Phiếu thu', source: 'rich', body: `<h2>PHIẾU THU {{doc.code}}</h2><p>Đã nhận của {{customer.name}}: {{totals.total}}</p><p>${NOT_VAT}</p>`, fields: [], is_default: true, version: 1, updated_by: 'Hệ thống', updated_at: AT },
];

/** Gợi ý AI theo loại (mock của generateObject — templates.md §4). */
const DETECT: Record<DocKind, { placeholder: string; variable: string; confidence: number }[]> = {
  quote: [
    { placeholder: 'Kính gửi: ……', variable: 'customer.name', confidence: 0.96 },
    { placeholder: 'Số: ……', variable: 'doc.code', confidence: 0.91 },
    { placeholder: 'Bảng hàng hoá / dịch vụ', variable: 'items', confidence: 0.88 },
    { placeholder: 'Tổng cộng: ……', variable: 'totals.total', confidence: 0.84 },
    { placeholder: 'Báo giá có hiệu lực đến ……', variable: 'doc.valid_until', confidence: 0.62 },
  ],
  contract: [
    { placeholder: 'BÊN A: ……', variable: 'business.legal_name', confidence: 0.95 },
    { placeholder: 'BÊN B: ……', variable: 'customer.name', confidence: 0.95 },
    { placeholder: 'Mã số thuế: ……', variable: 'customer.tax_code', confidence: 0.81 },
    { placeholder: 'Giá trị hợp đồng: ……', variable: 'contract.value', confidence: 0.9 },
    { placeholder: 'Thời hạn: từ …… đến ……', variable: 'contract.start', confidence: 0.58 },
  ],
  payment_request: [
    { placeholder: 'Kính gửi: ……', variable: 'customer.name', confidence: 0.94 },
    { placeholder: 'Số tiền: ……', variable: 'totals.total', confidence: 0.9 },
    { placeholder: 'Mã QR', variable: 'payment.vietqr', confidence: 0.77 },
  ],
  receipt: [
    { placeholder: 'Họ tên người nộp: ……', variable: 'customer.name', confidence: 0.93 },
    { placeholder: 'Số tiền: ……', variable: 'totals.total', confidence: 0.91 },
  ],
};
/** Mục bảng kiểm mock coi là thiếu trong file mẫu (để người dùng thấy cảnh báo — không chặn lưu). */
const MISSING = new Set(['dispute', 'vat_note']);

export const createDocTemplatesState = () => ({ list: structuredClone(SEED), seq: SEED.length });
export type DocTemplatesState = ReturnType<typeof createDocTemplatesState>;

const live = (db: { docTemplates: DocTemplatesState }) => db.docTemplates.list.filter((x) => !x.deleted);
const find = (db: { docTemplates: DocTemplatesState }, id: string) => {
  const t = live(db).find((x) => x.id === id);
  if (!t) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: id });
  return t;
};
const checkVars = (kind: DocKind, fields: { variable: string }[] = []) => {
  const bad = validateTemplateVars(kind, fields.map((f) => f.variable));
  if (bad.length) throw new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: bad.join(', '), fields: { fields: bad.join(', ') } });
};
const setDefault = (db: { docTemplates: DocTemplatesState }, t: DocTemplate) => {
  for (const x of live(db)) if (x.kind === t.kind) x.is_default = x.id === t.id;
};

export const docTemplatesRoutes: Record<string, MockRoute> = {
  '/doc-templates': (db, p) => {
    const kind = p.kind ? String(p.kind) : null;
    return { data: live(db).filter((x) => !kind || x.kind === kind), next_cursor: null };
  },
};

type In = { kind: DocKind; name: string; source: 'rich' | 'docx'; body?: string; file_name?: string; fields?: DocTemplate['fields']; is_default?: boolean };

export const docTemplatesHandlers: Record<string, MockHandler> = {
  'doc_template.create': {
    execute: (db, i: In) => {
      checkVars(i.kind, i.fields);
      db.docTemplates.seq += 1;
      const body = i.body && NOT_VAT_KINDS.includes(i.kind) && !i.body.includes(NOT_VAT) ? `${i.body}<p>${NOT_VAT}</p>` : i.body;
      const t: DocTemplate = { id: `tpl_${db.docTemplates.seq}`, kind: i.kind, name: i.name, source: i.source, body, file_name: i.file_name, fields: i.fields ?? [], is_default: false, version: 1, updated_by: db.shell.me.user.name, updated_at: AT };
      db.docTemplates.list.push(t);
      if (i.is_default) setDefault(db, t);
      return { template_id: t.id };
    },
  },
  'doc_template.update': {
    execute: (db, i: { template_id: string; name?: string; body?: string; fields?: DocTemplate['fields']; is_default?: boolean }) => {
      const t = find(db, i.template_id);
      checkVars(t.kind, i.fields);
      if (i.name) t.name = i.name;
      if (i.body !== undefined) t.body = i.body;
      if (i.fields) t.fields = i.fields;
      if (i.is_default) setDefault(db, t);
      t.version += 1;
      return { template_id: t.id };
    },
  },
  'doc_template.delete': {
    execute: (db, i: { template_id: string }) => {
      const t = find(db, i.template_id);
      if (t.is_default) throw new ApiRequestError(409, { code: 'CONFLICT', message: 'default template' });
      t.deleted = true;
      return { ok: true };
    },
    undo: (db, i: { template_id: string }) => {
      const t = db.docTemplates.list.find((x) => x.id === i.template_id);
      if (t) t.deleted = false;
    },
  },
  'doc_template.detect_fields': {
    execute: (_db, i: { kind: DocKind; file_name: string }) => ({
      fields: DETECT[i.kind],
      checklist: LEGAL_CHECKLIST[i.kind].map((key) => ({ key, ok: !MISSING.has(key) })),
    }),
  },
};
