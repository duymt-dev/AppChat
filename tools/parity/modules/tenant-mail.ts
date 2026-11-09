// Parity TIP-012c P5: Cài đặt › Email Marketing (prototype L7033) — mục ẩn mở từ thẻ Brevo / SMTP ở Nền tảng kết nối. So cả vùng nội dung
// với prototype (≤ 5%); thanh nhà cung cấp chỉ có connector có manifest (D28: Brevo / SMTP) và khối người gửi theo bằng chứng probe
// thay vì form khoá API của prototype — luồng kiểm ở e2e/tenant-mail.spec.ts.
import type { ParityEntry } from '../parity.manifest';

const ST_MAIN = { x: 360, y: 64, width: 1080, height: 836 };
const settings = (tab: string) => ({ ac_module: 'settings', ac_settings: tab });

export const tenantMailEntries = (settingsProto: NonNullable<ParityEntry['proto']>): ParityEntry[] => [
  {
    id: 'settings:email-mkt',
    route: '/settings/email_mkt',
    protoStorage: settings('email_mkt'),
    appWait: '[data-testid="st-em-card"]',
    proto: settingsProto,
    clip: ST_MAIN,
  },
];
