// API công khai của domain booking cho apps/api + test (TIP-033).
export { CalendarReadService, type CalendarViewer, type CalendarFilter } from './services/calendar-read.service';
export { BookingPlace } from './services/booking-place';
export { expireHolds, remindAppointments } from './services/booking-system';
export { sweepBooking, BOOKING_SWEEP_JOB, BOOKING_SCHEDULER_QUEUE } from './jobs/booking.jobs.module';
// TIP-033c: gợi ý tạo đơn từ lịch hẹn — bộ đọc dùng chung (Hộp thư, Trợ lý). Sales chuyển đổi import thẳng `order-suggestions/preview`
// (file lá, không kéo BookingModule → không vòng booking ↔ sales).
export { readSuggestions, type SuggestionCard, type SuggestionPage, type SuggestionQuery } from './order-suggestions/read';
