// TIP-028b §2.2 — bảng kiểm pháp lý trong preview gửi / duyệt chứng từ (thuần hàm) + cổng "xin xem trước" ở policy (DC-444). Luồng DB
// thật (preview quote.send / contract.submit / invoice.send_payment_qr) ở apps/api/test/integration/doc-render.test.ts.
import { describe, expect, it } from 'vitest';
import { REQUESTABLE_PREVIEW_ACTIONS } from '@appchat/actions';
import type { DocData } from '@appchat/shared';
import { docChecklist } from '../src/documents/services/doc-checklist';
import { decidePolicy } from '../src/kernel/actions/policy';

const QUOTE_BODY = '<h2>BÁO GIÁ {{doc.code}}</h2><p>{{business.legal_name}} · MST {{business.tax_code}}</p><p>Ngày lập: {{doc.date}}</p>{{#items}}<p>{{name}}</p>{{/items}}<p>Tổng (đã gồm VAT): {{totals.total}}</p><p>Hiệu lực đến {{doc.valid_until}}</p>';
const rich = (kind: string, bodyHtml: string) => ({ kind, source: 'rich' as const, bodyHtml, fieldMap: [], checklistResult: [] });
const data = (business: Record<string, string>): DocData => ({
  business,
  customer: { name: 'Chị Lan' },
  doc: { code: 'BG-1', date: '12/11/2026', valid_until: '27/11/2026', owner: '' },
  items: [{ no: '1', name: 'HIFU', unit: '', qty: '1', price: '1', discount: '', tax_rate: '8%', amount: '1' }],
  totals: { total: '1' },
  contract: {},
  payment: {},
  signatures: {},
});

describe('docChecklist', () => {
  it('mẫu đủ mục + dữ liệu đủ → mọi mục đạt', async () => {
    const r = await docChecklist(rich('quote', QUOTE_BODY), async () => data({ legal_name: 'Spa An', tax_code: '0312345678' }));
    expect(r).toEqual([
      { code: 'seller_tax', ok: true },
      { code: 'date', ok: true },
      { code: 'validity', ok: true },
      { code: 'vat_note', ok: true },
    ]);
  });

  it('MST bên bán trống → mục seller_tax chưa đạt, lý do empty:business.tax_code; mục khác giữ nguyên', async () => {
    const r = await docChecklist(rich('quote', QUOTE_BODY), async () => data({ legal_name: 'Spa An', tax_code: '' }));
    expect(r.find((c) => c.code === 'seller_tax')).toEqual({ code: 'seller_tax', ok: false, hint: 'empty:business.tax_code' });
    expect(r.filter((c) => !c.ok).map((c) => c.code)).toEqual(['seller_tax']);
  });

  it('mẫu thiếu mục → hint template; không có biến cần kiểm thì không dựng dữ liệu', async () => {
    let built = 0;
    const r = await docChecklist(rich('quote', '<p>Kính gửi {{customer.name}}</p>'), async () => {
      built++;
      return data({});
    });
    expect(r.every((c) => !c.ok && c.hint === 'template')).toBe(true);
    expect(built).toBe(0);
  });

  it('DOCX dùng kết quả đã lưu lúc soạn; đề nghị thanh toán: dòng không thay thế HĐ GTGT luôn đạt', async () => {
    const docx = { kind: 'contract', source: 'docx' as const, bodyHtml: null, fieldMap: [{ placeholder: 'BÊN B', variable: 'customer.name' }], checklistResult: [{ key: 'parties', ok: true }, { key: 'dispute', ok: false }] };
    expect(await docChecklist(docx, async () => data({}))).toEqual([{ code: 'parties', ok: true }, { code: 'dispute', ok: false, hint: 'template' }]);
    expect(await docChecklist(rich('payment_request', '<p>{{doc.code}}</p>'), async () => data({}))).toEqual([{ code: 'not_vat', ok: true }]);
  });
});

describe('xin xem trước (policy, DC-444)', () => {
  it('ui / api xin xem trước action chứng từ → preview; không xin → chạy như cũ', () => {
    for (const id of REQUESTABLE_PREVIEW_ACTIONS) {
      expect(decidePolicy({ source: 'ui', risk: 'send', actionId: id, previewRequested: true })).toBe('preview');
      expect(decidePolicy({ source: 'api', risk: 'send', actionId: id, previewRequested: true })).toBe('preview');
      expect(decidePolicy({ source: 'ui', risk: 'send', actionId: id })).toBe('run');
    }
  });

  it('action ngoài danh sách không bị đổi; duyệt bắt buộc / cấm giữ nguyên dù xin xem trước', () => {
    expect(decidePolicy({ source: 'ui', risk: 'send', actionId: 'message.send', previewRequested: true })).toBe('run');
    expect(decidePolicy({ source: 'agent', risk: 'send', actionId: 'contract.send_for_signature', previewRequested: true })).toBe('approval');
    expect(decidePolicy({ source: 'agent', risk: 'config', actionId: 'quote.send', previewRequested: true })).toBe('forbidden');
    expect(decidePolicy({ source: 'system', risk: 'send', actionId: 'quote.send', previewRequested: true })).toBe('run');
  });
});
