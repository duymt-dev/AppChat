// Luật thông báo / realtime của các domain phải có trong tiến trình chạy consumer `notify` / `realtime` (ROLE=jobs). Mỗi file luật
// tự đăng ký khi được import; module domain (ChannelsModule, InboxModule) không nạp ở ROLE=jobs → nạp tường minh ở đây.
// File luật chỉ phụ thuộc shared + notify (không kéo service / DB của domain). Domain mới có luật → thêm một dòng.
import '../../channels/events/channels.rules';
import './security.rules';
import '../../inbox/events/inbox.rules';
import '../../ai/events/kb.rules';
import '../../ai/events/kb-suggestion.rules';
import '../../ai/events/agents.rules';
import '../../ai/events/reply.rules';
import '../../sales/payments/events/package-notification.rules';
// TIP-037: chiến dịch chờ duyệt / kết quả duyệt + WS campaign.updated.
import '../../marketing/events/campaign.rules';
// TIP-015d: thông báo chuyển phụ trách hai bên (chiếu theo quyền hiện tại).
import '../../crm/events/ownership.rules';
// TIP-015f: WS vòng đời khách (xoá mềm / khôi phục) — làm mới danh sách / 360 / Hộp thư.
import '../../crm/events/lifecycle.rules';
