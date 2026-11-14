// Parity thẻ xác nhận của Trợ lý sau TIP-023b (R2.8 / REQ-E03b): thẻ có thêm khối "đổi gì" (ActionPreview `changes` / cảnh báo) và nút
// Sửa — prototype L1260 ActionCard chỉ có tiêu đề + mô tả + Xác nhận / Huỷ. Đo khung thẻ; khối mới che có lý do (lệch có mã quyết định).
import type { ParityEntry } from '../parity.manifest';

export const ASSISTANT_COVERAGE: ParityEntry[] = [
  {
    id: 'assistant:card-preview',
    route: '/assistant',
    protoStorage: { ac_module: 'assistant' },
    proto: async (p) => {
      const ta = p.locator('textarea').first();
      await ta.fill('Tạo báo giá cho chị Lan');
      await ta.press('Enter');
      await p.waitForTimeout(900);
    },
    app: async (p) => {
      const ta = p.getByTestId('asst-composer').locator('textarea');
      await ta.fill('Tạo báo giá cho chị Lan');
      await ta.press('Enter');
      await p.getByTestId('asst-card').waitFor();
    },
    mask: [
      { x: 888, y: 842, width: 150, height: 32, reason: 'D29 mức AI thay tên model' },
      { x: 422, y: 290, width: 380, height: 150, reason: 'PD-008 (TIP-023b R2.8 / REQ-E03b): khối "đổi gì" + nút Sửa đẩy chân thẻ xuống — prototype chưa có; đầu thẻ vẫn so' },
    ],
  },
];
