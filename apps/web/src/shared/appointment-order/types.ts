// Thẻ gợi ý tạo đơn từ lịch hẹn (TIP-033c §2) — shape của `appointment.order_suggestions` (packages/actions booking-config). Tiền là chuỗi VND.
export interface OrderSuggestion {
  appointment_id: string;
  code: string;
  /** version lịch · version dịch vụ · thế hệ khách — đổi → thẻ cũ không còn khớp, đọc lại. */
  revision: string;
  conversation_id: string | null;
  service_id: string;
  service_name: string;
  start_at: string;
  end_at: string;
  unit_price: string;
  tax_rate: number;
  tax_total: string;
  total: string;
  can_create: boolean;
}

export interface OrderSuggestionPage {
  data: OrderSuggestion[];
  next_cursor: string | null;
}

/** Nguồn thẻ: một lịch (Lịch hẹn) hoặc các lịch của một hội thoại (Hộp thư). */
export type OrderSuggestionSource = { appointmentId: string } | { conversationId: string };

/** Trạng thái hiển thị của một thẻ sau khi bấm (§2.3) — không có "thành công" khi chưa có biên nhận 200. */
export type CardState = { kind: 'idle' } | { kind: 'confirming' } | { kind: 'created'; orderId: string; code: string; reused: boolean } | { kind: 'changed' } | { kind: 'unavailable' };
