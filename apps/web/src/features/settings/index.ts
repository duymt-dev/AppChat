// Public API của module settings.
export { SettingsScreen } from './screens/SettingsScreen';
// Hộp Tuỳ chỉnh Hồ sơ 360° (REQ-F12) — dùng chung từ Panel360 (Hộp thư) qua nút ⚙.
export { ProfileLayoutEditor } from './components/ProfileLayoutEditor';
export { useProfileLayoutUi } from './profile-layout-store';
export { profileLayoutsQuery, channelsQuery, connectorsQuery, kbQuery } from './api';
