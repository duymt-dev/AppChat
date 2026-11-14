// Parity Cơ hội / Sales Pipeline (TIP-026c, D60): thẻ "Cơ hội / Sales Pipeline" ở Hồ sơ 360° (prototype L2386–2417) và drawer "Cơ hội ·
// Sales Pipeline 360°" (L2852–2915). So theo khung phần tử (clipTo). Mask có mã:
// - PD-901 (mức 1): bỏ tên "Pipeline Bán lẻ & SME" + nhãn MỚI; gợi ý AI / bước tiếp theo / "mở 2 lần" chỉ khi có số liệu thật; lịch sử cơ hội
//   và lịch sử drawer là dữ liệu thật (`contact_opportunity_event`), khác 3 dòng mẫu của prototype.
// - Mức 4 (trích luật): "Hóa đơn HD-" → "Đề nghị thanh toán TT-" (COMMERCE §5, prototype-parity §6); "Khách duyệt" → "Khách chốt" (COMMERCE §3);
//   nhãn giai đoạn theo D60; Khách hàng 360° đọc công nợ / đã mua thật (customerDebt, LTV).
import type { ParityEntry } from '../parity.manifest';

const crm = { ac_module: 'customers' };
const LAN_PROTO = (p: Parameters<NonNullable<ParityEntry['proto']>>[0]) => p.locator('.row', { hasText: 'Nguyễn Thị Lan' }).first().click();
const CARD_PROTO = 'div[style*="box-shadow: rgba(45, 197, 106, 0.18) 0px 0px 0px 2px"]';
const LAN_APP = (p: Parameters<NonNullable<ParityEntry['app']>>[0]) => p.locator('[data-contact="ct_lan"]').first().click();

export const SALES_PIPELINE: ParityEntry[] = [
  {
    // Thẻ cuộn lên đầu vùng cuộn của Hồ sơ 360° ở cả hai bên (thẻ "Công nợ · Tài chính" phía trên thuộc TIP-032e, ra khỏi khung đo). Đo
    // khung thẻ từ đầu tới dòng Sản phẩm; phần dưới (báo giá "mở 2 lần", bước tiếp theo, gợi ý AI, lịch sử) là dữ liệu mẫu cứng — PD-901,
    // cùng bố cục với drawer `deal:drawer` (đo đủ) và kiểm bằng unit OpportunityPanel + E2E sales-pipeline.
    id: 'customers:360-pipeline',
    route: '/customers',
    protoStorage: crm,
    proto: async (p) => {
      await LAN_PROTO(p);
      await p.locator(CARD_PROTO).first().evaluate((n) => n.scrollIntoView({ block: 'start' }));
    },
    app: async (p) => {
      await LAN_APP(p);
      await p.getByTestId('p360-opportunity').evaluate((n) => n.scrollIntoView({ block: 'start' }));
    },
    clip: { x: 1061, y: 90, width: 367, height: 290 },
    mask: [
      { x: 175, y: 10, width: 50, height: 24, reason: 'PD-901 bỏ nhãn "MỚI" của đầu thẻ (một pipeline thật, không phải tính năng mới)' },
      { x: 55, y: 64, width: 260, height: 22, reason: 'PD-901 bỏ tên "Pipeline Bán lẻ & SME" (D60 #8 một pipeline)' },
    ],
  },
  {
    id: 'deal:drawer',
    route: '/customers',
    protoStorage: crm,
    proto: async (p) => {
      await LAN_PROTO(p);
      await p.locator('button', { hasText: 'Mở cơ hội' }).first().click();
    },
    app: async (p) => {
      await LAN_APP(p);
      await p.getByTestId('opp-open').click();
      await p.getByTestId('opp-drawer-name').waitFor();
    },
    clipTo: { proto: 'div[role="dialog"][aria-label="Cơ hội · Sales Pipeline 360°"]', app: '[data-testid="opp-drawer"] [role="dialog"]' },
    mask: [],
  },
];
