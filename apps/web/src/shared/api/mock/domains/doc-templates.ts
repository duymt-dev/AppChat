// Mock Mẫu chứng từ (Blueprint §2.2 doc_template, §4.4 GET /doc-templates?kind=; D30, standards/documents/templates.md) — cùng schema
// `docTemplatesListSchema` với API thật (TIP-028). Ghi: doc_template.create / update (if_version) / delete (mặc định không xoá được),
// doc_template.detect_fields (mock của AI: gợi ý cố định theo loại + bảng kiểm). Biến lạ → 422 như server (`templateVars`).
// Xem trước: trang HTML điền dữ liệu minh hoạ bằng `renderRich` dùng chung (server ra PDF qua LibreOffice).
import {
  ApiRequestError,
  LEGAL_CHECKLIST,
  NOT_VAT_LINE,
  htmlPage,
  htmlText,
  legalChecklist,
  renderRich,
  sanitizeTemplateHtml,
  templateVars,
  validateTemplateVars,
  type DocData,
  type DocKind,
  type DocTemplateRow,
} from '@appchat/shared';
import type { MockHandler } from '../handlers';
import type { MockRoute } from '../routes';

export type DocTemplate = DocTemplateRow & { deleted?: boolean };
type Field = DocTemplate['fields'][number];

const AT = '2026-06-20T10:00:00+07:00';
const NOT_VAT = NOT_VAT_LINE.vi;
const tpl = (t: Omit<DocTemplate, 'checklist_missing'>): DocTemplate => ({ ...t, checklist_missing: [] });
const SEED: DocTemplate[] = [
  tpl({ id: 'tpl_q1', kind: 'quote', name: 'Báo giá chuẩn', source: 'rich', body: '<h2>BÁO GIÁ {{doc.code}}</h2><p>Kính gửi: {{customer.name}}</p>{{#items}}<p>{{name}} · {{amount}}</p>{{/items}}<p>Hiệu lực đến {{doc.valid_until}}</p>', fields: [], is_default: true, version: 3, updated_by: 'Thùy Trâm', updated_at: AT }),
  tpl({ id: 'tpl_q2', kind: 'quote', name: 'Báo giá liệu trình spa', source: 'docx', file_name: 'bao-gia-lieu-trinh.docx', file_id: 'file_q2', fields: [{ placeholder: 'Kính gửi: ……', variable: 'customer.name' }, { placeholder: 'Bảng dịch vụ', variable: 'items' }, { placeholder: 'Tổng cộng: ……', variable: 'totals.total' }], is_default: false, version: 1, updated_by: 'Thùy Trâm', updated_at: '2026-06-12T15:30:00+07:00' }),
  tpl({ id: 'tpl_c1', kind: 'contract', name: 'Hợp đồng dịch vụ', source: 'docx', file_name: 'hop-dong-dich-vu.docx', file_id: 'file_c1', fields: [{ placeholder: 'BÊN B: ……', variable: 'customer.name' }, { placeholder: 'Giá trị hợp đồng: ……', variable: 'contract.value' }, { placeholder: 'Thời hạn: từ …… đến ……', variable: 'contract.start' }], is_default: true, version: 2, updated_by: 'Thùy Trâm', updated_at: AT }),
  tpl({ id: 'tpl_p1', kind: 'payment_request', name: 'Đề nghị thanh toán', source: 'rich', body: `<h2>ĐỀ NGHỊ THANH TOÁN {{doc.code}}</h2><p>{{payment.vietqr}}</p><p>${NOT_VAT}</p>`, fields: [], is_default: true, version: 1, updated_by: 'Hệ thống', updated_at: AT }),
  tpl({ id: 'tpl_r1', kind: 'receipt', name: 'Phiếu thu', source: 'rich', body: `<h2>PHIẾU THU {{doc.code}}</h2><p>Đã nhận của {{customer.name}}: {{totals.total}}</p><p>${NOT_VAT}</p>`, fields: [], is_default: true, version: 1, updated_by: 'Hệ thống', updated_at: AT }),
];

/** Gợi ý AI theo loại (mock của model — templates.md §4). */
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

const missingOfRich = (kind: DocKind, body: string) =>
  legalChecklist(kind, htmlText(body), templateVars(kind, body).vars)
    .filter((c) => !c.ok)
    .map((c) => c.key);
const missingOfDocx = (kind: DocKind) => LEGAL_CHECKLIST[kind].filter((k) => MISSING.has(k));

export const createDocTemplatesState = () => ({
  list: structuredClone(SEED).map((t) => ({ ...t, checklist_missing: t.source === 'rich' ? missingOfRich(t.kind as DocKind, t.body ?? '') : missingOfDocx(t.kind as DocKind) })),
  seq: SEED.length,
});
export type DocTemplatesState = ReturnType<typeof createDocTemplatesState>;

type Db = { docTemplates: DocTemplatesState };
const live = (db: Db) => db.docTemplates.list.filter((x) => !x.deleted);
const find = (db: Db, id: string) => {
  const t = live(db).find((x) => x.id === id);
  if (!t) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: id });
  return t;
};
const invalid = (field: string, code: string) => new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: code, fields: { [field]: code } });
const checkBody = (kind: DocKind, raw: string) => {
  const body = sanitizeTemplateHtml(raw);
  const { vars, unknown } = templateVars(kind, body);
  if (unknown.length) throw invalid('body', `unknown_vars:${unknown.join(',')}`);
  if (!vars.length) throw invalid('body', 'no_vars');
  return body;
};
const checkFields = (kind: DocKind, fields: Field[] = []) => {
  if (!fields.length) throw invalid('fields', 'required');
  const bad = validateTemplateVars(kind, fields.map((f) => f.variable));
  if (bad.length) throw invalid('fields', `unknown_vars:${bad.join(',')}`);
};
const setDefault = (db: Db, t: DocTemplate) => {
  for (const x of live(db)) if (x.kind === t.kind) x.is_default = x.id === t.id;
};

export const docTemplatesRoutes: Record<string, MockRoute> = {
  '/doc-templates': (db, p) => {
    const kind = p.kind ? String(p.kind) : null;
    const rows = live(db)
      .filter((x) => !kind || x.kind === kind)
      .map((x) => {
        const { deleted: _d, ...row } = x;
        return row;
      });
    return { data: rows, next_cursor: null };
  },
};

const SAMPLE: DocData = {
  business: { legal_name: 'Spa Hoa Sen', tax_code: '0301234567', address: '12 Lê Lợi, Q1', representative: 'Thùy Trâm', logo: '', bank_account: '0123456789 · Vietcombank' },
  customer: { name: 'Công ty TNHH Khách Hàng Mẫu', tax_code: '0312345678', address: '12 Nguyễn Huệ, Q1', phone: '0901 234 567', email: 'khachhang@example.com', representative: 'Nguyễn Văn A' },
  doc: { code: 'BG-0001', date: '30/10/2026', valid_until: '14/11/2026', owner: 'Thùy Trâm' },
  items: [
    { no: '1', name: 'Liệu trình chăm sóc da 10 buổi', unit: 'gói', qty: '1', price: '6.500.000₫', discount: '10%', tax_rate: '8%', amount: '5.850.000₫' },
    { no: '2', name: 'Serum phục hồi B5', unit: 'chai', qty: '2', price: '680.000₫', discount: '', tax_rate: '8%', amount: '1.360.000₫' },
  ],
  totals: { subtotal: '7.860.000₫', discount: '650.000₫', vat: '576.800₫', total: '7.786.800₫', total_words: 'Bảy triệu bảy trăm tám mươi sáu nghìn tám trăm đồng' },
  contract: { kind: 'Hợp đồng dịch vụ', value: '7.786.800₫', start: '30/10/2026', end: '28/04/2027' },
  payment: { vietqr: '[Mã VietQR]', transfer_note: 'Thanh toan BG-0001' },
  signatures: { seller: '(Ký, ghi rõ họ tên)', buyer: '(Ký, ghi rõ họ tên)' },
};

/** `GET /doc-templates/:id/preview` của mock: HTML đã điền (mẫu DOCX: bảng vị trí → giá trị). null = không có. */
export function docTemplatePreview(db: Db, path: string): string | null {
  const m = path.match(/^\/doc-templates\/([^/]+)\/preview$/);
  const t = m ? live(db).find((x) => x.id === m[1]) : undefined;
  if (!t) return null;
  if (t.source === 'rich') return htmlPage(t.name, renderRich(t.kind as DocKind, t.body ?? '', SAMPLE, NOT_VAT));
  const rows = t.fields.map((f) => `<tr><td>${f.placeholder}</td><td>{{${f.variable}}}</td></tr>`).join('');
  return htmlPage(t.name, renderRich(t.kind as DocKind, `<h2>${t.file_name ?? t.name}</h2><table>${rows}</table>`, SAMPLE, NOT_VAT));
}

type In = { kind: DocKind; name: string; source: 'rich' | 'docx'; body?: string; file_name?: string; file_id?: string; fields?: Field[]; is_default?: boolean };

export const docTemplatesHandlers: Record<string, MockHandler> = {
  'doc_template.create': {
    execute: (db, i: In) => {
      const body = i.source === 'rich' ? checkBody(i.kind, i.body ?? '') : undefined;
      if (i.source === 'docx') {
        if (!i.file_id) throw invalid('file_id', 'required');
        checkFields(i.kind, i.fields);
      }
      db.docTemplates.seq += 1;
      const t: DocTemplate = {
        id: `tpl_${db.docTemplates.seq}`,
        kind: i.kind,
        name: i.name,
        source: i.source,
        ...(body !== undefined ? { body } : { file_name: i.file_name ?? 'mau.docx', file_id: i.file_id }),
        fields: i.source === 'docx' ? (i.fields ?? []) : [],
        checklist_missing: body !== undefined ? missingOfRich(i.kind, body) : missingOfDocx(i.kind),
        is_default: false,
        version: 1,
        updated_by: db.shell.me.user.name,
        updated_at: new Date().toISOString(),
      };
      db.docTemplates.list.push(t);
      if (i.is_default) setDefault(db, t);
      return { template_id: t.id };
    },
  },
  'doc_template.update': {
    execute: (db, i: { template_id: string; name?: string; body?: string; fields?: Field[]; is_default?: boolean; if_version?: number }) => {
      const t = find(db, i.template_id);
      if (i.if_version !== undefined && i.if_version !== t.version) throw new ApiRequestError(409, { code: 'STALE_VERSION', message: t.id });
      const kind = t.kind as DocKind;
      let changed = false;
      if (i.name) (t.name = i.name), (changed = true);
      if (t.source === 'rich' && i.body !== undefined) {
        t.body = checkBody(kind, i.body);
        t.checklist_missing = missingOfRich(kind, t.body);
        changed = true;
      }
      if (t.source === 'docx' && i.fields) {
        checkFields(kind, i.fields);
        t.fields = i.fields;
        changed = true;
      }
      if (i.is_default) setDefault(db, t);
      if (changed) t.version += 1;
      t.updated_at = new Date().toISOString();
      return { template_id: t.id, version: t.version };
    },
  },
  'doc_template.delete': {
    execute: (db, i: { template_id: string }) => {
      const t = find(db, i.template_id);
      if (t.is_default) throw new ApiRequestError(409, { code: 'CONFLICT', message: 'default template', fields: { template_id: 'is_default' } });
      t.deleted = true;
      return { ok: true };
    },
    undo: (db, i: { template_id: string }) => {
      const t = db.docTemplates.list.find((x) => x.id === i.template_id);
      if (t) t.deleted = false;
    },
  },
  'doc_template.detect_fields': {
    execute: (_db, i: { kind: DocKind; file_id: string }) => ({
      fields: DETECT[i.kind],
      checklist: LEGAL_CHECKLIST[i.kind].map((key) => ({ key, ok: !MISSING.has(key) })),
    }),
  },
};
