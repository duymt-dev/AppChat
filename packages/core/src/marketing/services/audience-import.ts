// Nhập danh sách người nhận từ Excel / CSV (TIP-037, PRO-marketing-wizupload): cột tên / SĐT / email (nhận tên cột tiếng Việt / Anh); mỗi
// dòng → khách THẬT: khớp khách người gọi thấy được (SĐT / email đã chuẩn hoá) → dùng id đó; khớp khách của người khác ngoài scope → báo
// "owned", KHÔNG lấy, không đổi chủ; khách đã huỷ nhận tin → báo, không tự đăng ký lại; chưa có → tạo mới (chỉ khi có crm.import — cùng
// đường createContact của CRM). Trùng trong file → báo. Kết quả chốt thành lô (id khách thật) — wizard dùng lô, không dùng tên file.
import { normalizePhone, AUDIENCE_IMPORT_MAX_ROWS, AppError, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { readTable } from '../../kernel/files/table';
import { accessOf } from '../../crm/services/access';

const COLS: Record<'name' | 'phone' | 'email', RegExp> = {
  name: /^(t[eê]n|h[oọ]\s*t[eê]n|name|full\s*name|kh[aá]ch\s*h[aà]ng)$/i,
  phone: /^(s[oố]?\s*[đd]i[eệ]n\s*tho[aạ]i|s[đd]t|phone|mobile|[đd]i[eệ]n\s*tho[aạ]i)$/i,
  email: /^(e-?mail|th[uư]\s*[đd]i[eệ]n\s*t[uử])$/i,
};
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ImportRow {
  row: number;
  name: string;
  phone: string | null;
  email: string | null;
}

export type RowKind = 'match' | 'create' | 'invalid' | 'duplicate' | 'owned' | 'opted_out';

export interface Classified extends ImportRow {
  kind: RowKind;
  contactId: string | null;
  reason?: string;
}

/** Bảng → dòng có số thứ tự (dòng 2 = dòng dữ liệu đầu, như Excel). Thiếu cột liên hệ → 422. */
export async function parseRows(file: { name: string; mime: string; body: Buffer }): Promise<ImportRow[]> {
  const t = await readTable(file.name, file.mime, file.body).catch(() => null);
  if (!t) throw new AppError('VALIDATION_FAILED', 422, { file_id: 'unsupported' });
  const idx = (k: keyof typeof COLS) => t.columns.findIndex((c) => COLS[k].test(c.trim()));
  const [n, p, e] = [idx('name'), idx('phone'), idx('email')];
  if (p < 0 && e < 0) throw new AppError('VALIDATION_FAILED', 422, { file_id: 'no_contact_column' });
  if (t.rows.length > AUDIENCE_IMPORT_MAX_ROWS) throw new AppError('VALIDATION_FAILED', 422, { file_id: `too_many_rows:${AUDIENCE_IMPORT_MAX_ROWS}` });
  return t.rows
    .map((r, i) => ({ row: i + 2, name: (n >= 0 ? r[n] : '')?.trim().slice(0, 120) ?? '', phone: p >= 0 ? r[p]?.trim() || null : null, email: e >= 0 ? r[e]?.trim().toLowerCase() || null : null }))
    .filter((r) => r.name || r.phone || r.email);
}

/** Phân loại từng dòng theo dữ liệu khách hiện có + quyền người gọi. Không ghi DB. */
export async function classifyRows(tx: TenantTx, authz: AuthzContext, rows: ImportRow[], canCreate: boolean): Promise<Classified[]> {
  const seen = new Set<string>();
  const out: Classified[] = [];
  for (const r of rows) {
    const phone = normalizePhone(r.phone);
    const email = r.email && EMAIL.test(r.email) ? r.email : null;
    if ((!phone && !email) || (r.email && !email)) {
      out.push({ ...r, kind: 'invalid', contactId: null, reason: r.email && !email ? 'email' : 'no_contact' });
      continue;
    }
    const keys = [phone && `p:${phone}`, email && `e:${email}`].filter((k): k is string => !!k);
    if (keys.some((k) => seen.has(k))) {
      out.push({ ...r, kind: 'duplicate', contactId: null });
      continue;
    }
    keys.forEach((k) => seen.add(k));
    const hit = await tx.contact.findFirst({ where: { deletedAt: null, OR: [...(phone ? [{ phoneNorm: phone }] : []), ...(email ? [{ email }] : [])] } });
    if (!hit) {
      out.push({ ...r, phone, email, kind: canCreate && r.name ? 'create' : 'invalid', contactId: null, ...(canCreate ? (r.name ? {} : { reason: 'no_name' }) : { reason: 'no_permission' }) });
      continue;
    }
    // Khách ngoài scope người gọi: không lộ là ai, không thêm vào danh sách gửi.
    if (!(await accessOf(tx, authz, hit))) out.push({ ...r, kind: 'owned', contactId: null });
    else if (hit.marketingOptOut) out.push({ ...r, kind: 'opted_out', contactId: null });
    else out.push({ ...r, kind: 'match', contactId: hit.id });
  }
  return out;
}

export const countKinds = (c: Classified[]) => {
  const n = (k: RowKind) => c.filter((x) => x.kind === k).length;
  return { rows: c.length, valid: n('match') + n('create'), invalid: n('invalid'), duplicate: n('duplicate'), opted_out: n('opted_out'), owned: n('owned'), create: n('create') };
};

/** Lỗi theo dòng (tối đa 200) — lý do mã hoá, không nội dung ô. */
export const rowErrors = (c: Classified[]) =>
  c.filter((x) => x.kind !== 'match' && x.kind !== 'create').slice(0, 200).map((x) => ({ row: x.row, reason: x.reason ? `${x.kind}:${x.reason}` : x.kind }));
