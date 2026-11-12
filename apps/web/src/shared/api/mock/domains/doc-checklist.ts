// Bảng kiểm pháp lý trong preview gửi / duyệt chứng từ — mock (TIP-028b, cùng hình server `docChecklist`): lấy mẫu mặc định của loại
// trong state mẫu mock, chấm theo luật `legalChecklist` (rich: thân mẫu; DOCX: các mục mock coi là thiếu). Mục chưa đạt có `hint: template`.
// Cảnh báo, không chặn (DC-444). Gắn vào preview của action đã có handler (không đổi execute). Như server (preview kiểm trạng thái / ngưỡng
// / kênh cùng lỗi với execute), preview chạy thử execute trên BẢN SAO dữ liệu — lỗi (vượt ngưỡng, khách chưa nhắn Zalo…) báo ngay, không
// hiện hộp xác nhận cho thứ sẽ hỏng.
import { LEGAL_CHECKLIST, htmlText, legalChecklist, templateVars, type DocKind } from '@appchat/shared';
import type { MockHandler } from '../handlers';
import type { MockDb } from '../store';

/** Mục bảng kiểm mock coi là thiếu trong file DOCX mẫu (giống doc-templates.ts). */
const MISSING = new Set(['dispute', 'vat_note']);

export function mockChecklist(db: MockDb, kind: DocKind): { code: string; ok: boolean; hint?: string }[] | undefined {
  const t = db.docTemplates.list.find((x) => !x.deleted && x.kind === kind && x.is_default && !x.contract_kind) ?? db.docTemplates.list.find((x) => !x.deleted && x.kind === kind && x.is_default);
  if (!t) return undefined;
  const base = t.source === 'rich' ? legalChecklist(kind, htmlText(t.body ?? ''), templateVars(kind, t.body ?? '').vars) : LEGAL_CHECKLIST[kind].map((key) => ({ key, ok: !MISSING.has(key) }));
  return base.map((c) => (c.ok ? { code: c.key, ok: true } : { code: c.key, ok: false, hint: 'template' }));
}

const KIND: Record<string, DocKind> = {
  'quote.send': 'quote',
  'contract.submit': 'contract',
  'contract.approve_and_sign': 'contract',
  'contract.send_for_signature': 'contract',
  'invoice.send_payment_qr': 'payment_request',
};

const NO_DRY_RUN = new Set(['contract.approve_and_sign']);

/** Thêm `checklist` vào preview của action gửi / duyệt chứng từ (handler gốc giữ nguyên). */
export function withDocChecklist(handlers: Record<string, MockHandler>): Record<string, MockHandler> {
  return Object.fromEntries(
    Object.entries(handlers).map(([id, h]) => {
      const kind = KIND[id];
      if (!kind) return [id, h];
      const preview = (db: MockDb, input: never) => {
        // Duyệt & ký: server không kiểm OTP ở preview (OTP dùng một lần, mock giữ ngoài db) → không chạy thử.
        if (!NO_DRY_RUN.has(id)) h.execute(structuredClone(db), input);
        // Hợp đồng tải tệp lên (source = file) không có mẫu → không bảng kiểm (như server contractChecklist).
        const cid = (input as { contract_id?: string }).contract_id;
        const fromFile = kind === 'contract' && db.contracts.contracts.find((c) => c.id === cid)?.source === 'file';
        return { ...(h.preview?.(db, input) ?? { summary: id }), ...(fromFile ? {} : { checklist: mockChecklist(db, kind) }) };
      };
      return [id, { ...h, preview }];
    }),
  );
}
