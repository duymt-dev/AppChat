// Nguồn Hộp thư của chứng từ (TIP-025b §D.3): form tạo báo giá / đơn / hợp đồng / ticket / lịch hẹn giữ `conversation_id` +
// `source_message_id` từ prefill và gửi kèm input — server kiểm thấy được + khớp khách (sai → lỗi rõ, không tự bỏ). Mở form ngoài Hộp
// thư (không có ngữ cảnh) → rỗng, giữ hành vi cũ.
export interface SourceLink {
  conversation_id?: string;
  source_message_id?: string;
}

const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined);

export function sourceLinkOf(prefill?: Record<string, unknown> | null): SourceLink {
  const c = str(prefill?.conversation_id);
  const m = str(prefill?.source_message_id);
  return { ...(c ? { conversation_id: c } : {}), ...(m ? { source_message_id: m } : {}) };
}
