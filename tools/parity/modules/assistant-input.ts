// Parity đầu vào tệp Trợ lý (TIP-023f P4): ô soạn màn chào khi khay có một tệp đã sẵn sàng. Prototype (L1201–1222) không có khay tệp /
// trạng thái đọc nội dung / khung xem lại ảnh chụp / đọc chính tả → mask đúng dải khay phía trên ô nhập (PD-026); phần ô soạn còn lại
// (ô nhập, ＋, ⚡, chế độ, mức AI, mic, gửi) vẫn so pixel với prototype.
import type { ParityEntry } from '../parity.manifest';

const asst = { ac_module: 'assistant' };

export const ASSISTANT_INPUT: ParityEntry[] = [
  {
    id: 'assistant-input:tray',
    route: '/assistant',
    protoStorage: asst,
    app: async (p) => {
      await p.getByTestId('asst-attach-input').setInputFiles({ name: 'bao-gia.txt', mimeType: 'text/plain', buffer: Buffer.from('Báo giá gói chăm sóc da') });
      await p.getByTestId('asst-attachment').and(p.locator('[data-status="ready"]')).waitFor({ timeout: 10_000 });
    },
    clip: { x: 380, y: 300, width: 680, height: 200 },
    mask: [
      { x: 846, y: 355, width: 150, height: 32, reason: 'D29 mức AI thay tên model' },
      { x: 380, y: 300, width: 680, height: 48, reason: 'PD-026 khay tệp đính kèm (TIP-023f) — không có trong prototype' },
    ],
  },
];
