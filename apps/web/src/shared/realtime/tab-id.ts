// Mã tab trình duyệt (TIP-006c): sinh ngẫu nhiên một lần mỗi lần tải trang — gửi kèm handshake `/ws` (`auth.tab_id`) và mỗi lượt Trợ lý
// (`tab_id`) để server gửi `ui.command` chỉ tới đúng tab đã ra lệnh. Không lưu trình duyệt (tab mới / F5 = mã mới), không phải bí mật.
'use client';

let tab: string | null = null;

export function tabId(): string {
  tab ??= `t${crypto.randomUUID().replace(/-/g, '')}`;
  return tab;
}
