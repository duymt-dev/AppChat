// Nhãn tab Hồ sơ 360°: tab mặc định dịch theo ngôn ngữ người dùng (`inbox.p360.tabs.*`), tab tuỳ biến dùng tên người cấu hình đặt.
import type { LayoutTab } from '../types';
import { TABS_360 } from './Profile360Content';

export const tabLabel = (x: LayoutTab, t: (k: `tabs.${'overview' | 'crm' | 'ai' | 'files' | 'history'}`) => string) =>
  x.builtin && TABS_360.includes(x.key) ? t(`tabs.${x.key as 'overview'}`) : x.label;
