// Public API của module inbox.
export { InboxScreen } from './screens/InboxScreen';
// Hồ sơ 360° dùng lại ở drawer Khách hàng (Blueprint §7: Customer360Panel).
export { Profile360Content, TABS_360 } from './components/Profile360Content';
export { useProfileTabs } from './hooks/useProfileTabs';
export { tabLabel } from './components/tab-label';
export { Profile360Actions } from './components/Profile360Actions';
export type { Tab360 } from './inbox-store';
// Tài khoản kênh email + hồ sơ khách — dùng cho modal "Gửi email" dùng chung (shared/crm-forms).
export { accountsQuery, contactQuery } from './api';
