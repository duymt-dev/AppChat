// Public API của module calendar (Lịch hẹn).
export { CalendarScreen } from './screens/CalendarScreen';
// Dùng từ Hồ sơ 360° (REQ-F11: 6 nút mở form tại chỗ — Lịch hẹn luôn tạo mới).
export { AppointmentFormModal } from './components/AppointmentFormModal';
export { useCalendarUi } from './calendar-store';
export { calendarMetaQuery } from './api';
export { prefillCalendarForm } from './ui-commands';
