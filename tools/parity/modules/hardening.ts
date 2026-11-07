// Parity TIP-045b: điểm vào UI mới của hardening trên các màn đã có trong prototype. Nút "Chuyển quyền Chủ sở hữu" (annex A3) ở đầu
// Thành viên và thanh lọc Audit log (annex A2: hành động / bảo mật / trạng thái / ngày) chờ đúng phần tử mới rồi so cả vùng nội dung với
// prototype L6141+ (≤ 5%). Prototype không có hai điểm vào này (PD-014); modal đổi Chủ sở hữu, ẩn trường theo vai trò và việc nền kiểm
// ở e2e/hardening.spec.ts (mock + http) — không có khung prototype để so pixel.
import type { ParityEntry } from '../parity.manifest';

const ST_MAIN = { x: 360, y: 64, width: 1080, height: 836 };
const settings = (tab: string) => ({ ac_module: 'settings', ac_settings: tab });

export const hardeningEntries = (settingsProto: NonNullable<ParityEntry['proto']>): ParityEntry[] => [
  {
    id: 'hardening:members-transfer',
    route: '/settings/members',
    protoStorage: settings('members'),
    appWait: '[data-testid="st-transfer"]',
    proto: settingsProto,
    clip: ST_MAIN,
  },
  {
    id: 'hardening:audit-filters',
    route: '/settings/audit',
    protoStorage: settings('audit'),
    appWait: '[data-testid="st-audit-action"]',
    proto: settingsProto,
    clip: ST_MAIN,
  },
];
