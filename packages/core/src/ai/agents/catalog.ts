// Danh mục tĩnh của AI Agents (TIP-021) — sinh MỘT LẦN từ fixtures/prototype-parity/agents.json (prototype L2227–2450), như
// catalog gói (TIP-009). Mẫu agent là seed của bảng `agent_template` (DB nền tảng, idempotent theo key — Quản trị nền tảng sửa ở
// TIP-040); taxonomy / emoji / ý định / mẫu prompt / gợi ý là cấu hình hiển thị của Builder (`GET /v1/agents/meta`).
import { channelRegistry } from '@appchat/channels';

export type AgentRole = 'sales' | 'cs' | 'booking' | 'marketing' | 'accounting' | 'ops' | 'custom';

export interface AgentTemplateSeed {
  key: string;
  name: string;
  desc: string;
  tag: string;
  group: string | null;
  role: AgentRole;
  color: string;
  tint: string;
  icon: string;
}

const T = (key: string, name: string, desc: string, tag: string, group: string | null, role: AgentRole, color: string, tint: string, icon: string): AgentTemplateSeed => ({ key, name, desc, tag, group, role, color, tint, icon });

export const AGENT_TEMPLATES: AgentTemplateSeed[] = [
  T("tpl_1", "Sales Agent · Bán lẻ", "Tư vấn sản phẩm, báo giá, chốt đơn theo kịch bản bán lẻ.", "Bán hàng", "Bán lẻ & TMĐT", "sales", "#1F9C4F", "#EDFAF3", "ic-chart"),
  T("tpl_2", "CSKH Agent · Dịch vụ", "Trả lời FAQ, tạo ticket, theo dõi SLA và hài lòng khách.", "CSKH", "Dịch vụ & CSKH", "cs", "#2563EB", "#EFF6FF", "ic-users"),
  T("tpl_3", "Marketing Agent", "Gợi ý chiến dịch, soạn nội dung ZNS/Email, phân khúc khách.", "Marketing", "Tiếp thị & Tăng trưởng", "marketing", "#DB2777", "#FDF2F8", "ic-spark"),
  T("tpl_4", "Booking Agent · Spa/Clinic", "Tư vấn dịch vụ, đặt lịch hẹn, nhắc hẹn tự động.", "Lịch hẹn", "Dịch vụ & CSKH", "booking", "#6E48E6", "#F5F3FF", "ic-cal"),
  T("tpl_5", "Lead Qualify Agent", "Sàng lọc lead theo tiêu chí, chấm điểm và chuyển sales.", "Lead", "Tiếp thị & Tăng trưởng", "sales", "#0891B2", "#ECFEFF", "ic-flow"),
  T("tpl_6", "Đơn hàng & Vận đơn", "Tra cứu đơn, cập nhật trạng thái, xử lý đổi/trả.", "Đơn hàng", "Bán lẻ & TMĐT", "sales", "#EA580C", "#FFF7ED", "ic-box"),
  T("tpl_7", "Thu hồi công nợ", "Nhắc thanh toán theo lịch, gửi nhắc nhở lịch sự.", "Kế toán", "Tài chính & Kế toán", "accounting", "#B45309", "#FFFBEB", "ic-doc"),
  T("tpl_8", "Giữ chân & Loyalty", "Phát hiện khách nguội, đề xuất ưu đãi tái mua.", "Loyalty", "Tiếp thị & Tăng trưởng", "cs", "#0F766E", "#F0FDFA", "ic-gift"),
  T("tpl_9", "Tổng đài & Gọi ra", "Gọi tự động, ghi âm, tóm tắt cuộc gọi và gán vào khách.", "Gọi điện", "Vận hành nội bộ", "ops", "#7C3AED", "#F5F3FF", "ic-mega"),
  T("tpl_10", "Báo cáo & Phân tích", "Tổng hợp số liệu, phát hiện bất thường, gửi báo cáo định kỳ.", "Báo cáo", "Vận hành nội bộ", "ops", "#0369A1", "#F0F9FF", "ic-chart"),
  T("tpl_11", "Tư vấn sản phẩm · TMĐT", "Gợi ý sản phẩm theo nhu cầu, so sánh, upsell combo.", "TMĐT", "Bán lẻ & TMĐT", "sales", "#0D9488", "#F0FDFA", "ic-box"),
  T("tpl_12", "Bất động sản Agent", "Tư vấn dự án, lọc nhu cầu, hẹn xem nhà, gửi bảng giá.", "BĐS", "Bất động sản", "sales", "#7C3AED", "#F5F3FF", "ic-grid"),
  T("tpl_13", "Giáo dục & Tuyển sinh", "Tư vấn khoá học, học phí, đăng ký học thử, nhắc nhập học.", "Giáo dục", "Giáo dục", "sales", "#2563EB", "#EFF6FF", "ic-doc"),
  T("tpl_14", "Nhà hàng & Đặt bàn", "Nhận đặt bàn, gợi ý món, xác nhận và nhắc giờ đến.", "F&B", "F&B & Du lịch", "booking", "#EA580C", "#FFF7ED", "ic-cal"),
  T("tpl_15", "Du lịch & Tour", "Tư vấn tour, báo giá lịch trình, giữ chỗ và nhắc thanh toán.", "Du lịch", "F&B & Du lịch", "booking", "#0891B2", "#ECFEFF", "ic-mega"),
  T("tpl_16", "Bảo hành & Kỹ thuật", "Tiếp nhận lỗi, hướng dẫn xử lý, tạo phiếu bảo hành.", "Kỹ thuật", "Dịch vụ & CSKH", "cs", "#DC2626", "#FEF2F2", "ic-cog"),
  T("tpl_17", "Tuyển dụng & HR", "Sàng lọc CV, trả lời JD, hẹn phỏng vấn, nhắc ứng viên.", "Nhân sự", "Vận hành nội bộ", "ops", "#DB2777", "#FDF2F8", "ic-users"),
  T("tpl_18", "Khảo sát & Phản hồi", "Gửi khảo sát, thu phản hồi, tổng hợp điểm hài lòng.", "CSKH", "Dịch vụ & CSKH", "cs", "#B45309", "#FFFBEB", "ic-spark"),
  T("tpl_19", "Nhắc tái mua định kỳ", "Nhận biết chu kỳ dùng, nhắc mua lại đúng thời điểm.", "Giữ chân", "Tiếp thị & Tăng trưởng", "cs", "#0F766E", "#F0FDFA", "ic-gift"),
  T("tpl_20", "Kiểm duyệt & An toàn", "Phát hiện spam, nội dung xấu, khách khiếu nại gay gắt.", "Vận hành", "Vận hành nội bộ", "ops", "#6B7280", "#F3F4F6", "ic-ticket"),
  T("tpl_21", "Vận đơn & Giao hàng", "Tra cứu vận đơn, cập nhật trạng thái giao, xử lý sự cố.", "Đơn hàng", "Bán lẻ & TMĐT", "sales", "#0E9B94", "#ECFDF9", "ic-cart"),
  T("tpl_22", "Thu hồi công nợ", "Nhắc hạn thanh toán, gửi sao kê, đối soát chứng từ.", "Kế toán", "Tài chính & Kế toán", "accounting", "#B45309", "#FFFBEB", "ic-doc"),
  T("tpl_23", "Chăm sóc sau bán", "Hỏi thăm sau sử dụng, thu phản hồi, gợi ý mua lại.", "Giữ chân", "Tiếp thị & Tăng trưởng", "cs", "#DB2777", "#FDF2F8", "ic-gift"),
  T("tpl_24", "Tuyển sinh & Tư vấn khoá học", "Tư vấn lộ trình học, học phí, giữ chỗ và nhắc nhập học.", "Giáo dục", "Giáo dục", "sales", "#2563EB", "#EFF6FF", "ic-users"),
  T("tpl_25", "Điều phối tổng đài", "Phân luồng cuộc gọi, gọi ra nhắc hẹn, ghi nhận kết quả.", "Gọi điện", "Vận hành nội bộ", "ops", "#6E48E6", "#F5F3FF", "ic-phone"),
  T("tpl_26", "Tư vấn thời trang · Size", "Gợi ý size, phối đồ, đổi trả theo chính sách shop.", "Bán hàng", "Bán lẻ & TMĐT", "sales", "#1F9C4F", "#EDFAF3", "ic-cart"),
  T("tpl_27", "Livestream & Chốt đơn", "Trả bình luận livestream, ghi nhận đơn, gửi link thanh toán.", "TMĐT", "Bán lẻ & TMĐT", "sales", "#E8602C", "#FFF4EF", "ic-mega"),
  T("tpl_28", "Săn deal & Khuyến mãi", "Thông báo ưu đãi, mã giảm giá, nhắc hạn dùng voucher.", "TMĐT", "Bán lẻ & TMĐT", "sales", "#E8602C", "#FFF4EF", "ic-gift"),
  T("tpl_29", "Xử lý đổi trả & Hoàn tiền", "Tiếp nhận yêu cầu đổi trả, kiểm tra điều kiện, tạo phiếu hoàn.", "Đơn hàng", "Bán lẻ & TMĐT", "sales", "#0E9B94", "#ECFDF9", "ic-doc"),
  T("tpl_30", "Trực đêm & Ngoài giờ", "Trả lời ngoài giờ hành chính, ghi nhận yêu cầu cho ca sáng.", "CSKH", "Dịch vụ & CSKH", "cs", "#2563EB", "#EFF6FF", "ic-inbox"),
  T("tpl_31", "Xử lý khiếu nại", "Xoa dịu, phân loại mức độ, leo thang đúng người phụ trách.", "CSKH", "Dịch vụ & CSKH", "cs", "#2563EB", "#EFF6FF", "ic-shield"),
  T("tpl_32", "Nhắc lịch & Xác nhận hẹn", "Nhắc trước giờ hẹn, xác nhận/đổi lịch, giảm no-show.", "Lịch hẹn", "Dịch vụ & CSKH", "booking", "#7C3AED", "#F5F3FF", "ic-cal"),
  T("tpl_33", "Nội dung mạng xã hội", "Lên lịch bài đăng, viết caption, đề xuất hashtag theo kênh.", "Marketing", "Tiếp thị & Tăng trưởng", "marketing", "#DB2777", "#FDF2F8", "ic-mega"),
  T("tpl_34", "Email & ZNS Automation", "Dựng chuỗi email/ZNS, cá nhân hoá nội dung, đo mở-click.", "Marketing", "Tiếp thị & Tăng trưởng", "marketing", "#DB2777", "#FDF2F8", "ic-send"),
  T("tpl_35", "Nuôi dưỡng lead nguội", "Chạm lại lead cũ, phân loại nhu cầu, hẹn tư vấn.", "Lead", "Tiếp thị & Tăng trưởng", "sales", "#F59E0B", "#FFFBEB", "ic-users"),
  T("tpl_36", "Ưu đãi sinh nhật & Hạng", "Tự động tặng quà theo hạng, nhắc đổi điểm sắp hết hạn.", "Loyalty", "Tiếp thị & Tăng trưởng", "cs", "#B45309", "#FFFBEB", "ic-gift"),
  T("tpl_37", "Cảnh báo khách rời bỏ", "Phát hiện dấu hiệu rời bỏ, đề xuất kịch bản giữ chân.", "Giữ chân", "Tiếp thị & Tăng trưởng", "cs", "#DB2777", "#FDF2F8", "ic-shield"),
  T("tpl_38", "Tư vấn dự án BĐS", "Giới thiệu dự án, chính sách vay, hẹn xem nhà.", "BĐS", "Bất động sản", "sales", "#0F766E", "#ECFDF9", "ic-box"),
  T("tpl_39", "Chăm sóc học viên", "Nhắc lịch học, gửi tài liệu, theo dõi tiến độ và điểm danh.", "Giáo dục", "Giáo dục", "sales", "#2563EB", "#EFF6FF", "ic-doc"),
  T("tpl_40", "Đặt bàn & Gọi món", "Nhận đặt bàn, tư vấn thực đơn, xác nhận và nhắc giờ.", "F&B", "F&B & Du lịch", "booking", "#EA580C", "#FFF7ED", "ic-cal"),
  T("tpl_41", "Tư vấn tour & Đặt chỗ", "Tư vấn hành trình, báo giá tour, giữ chỗ và nhắc khởi hành.", "Du lịch", "F&B & Du lịch", "booking", "#0891B2", "#ECFEFF", "ic-globe"),
  T("tpl_42", "Bảo hành & Sửa chữa", "Tra cứu bảo hành, đặt lịch kỹ thuật, theo dõi tiến độ sửa.", "Kỹ thuật", "Dịch vụ & CSKH", "cs", "#475569", "#F1F5F9", "ic-cog"),
  T("tpl_43", "Đối soát thanh toán", "Đối chiếu giao dịch, phát hiện lệch, lập báo cáo thu chi.", "Kế toán", "Tài chính & Kế toán", "accounting", "#B45309", "#FFFBEB", "ic-doc"),
  T("tpl_44", "Onboarding nhân sự mới", "Gửi tài liệu, checklist ngày đầu, giải đáp chính sách nội bộ.", "Nhân sự", "Vận hành nội bộ", "ops", "#DB2777", "#FDF2F8", "ic-users"),
  T("tpl_45", "Tổng hợp báo cáo tự động", "Tóm tắt số liệu ngày/tuần, cảnh báo bất thường, gửi ban điều hành.", "Báo cáo", "Vận hành nội bộ", "ops", "#6E48E6", "#F5F3FF", "ic-chart"),
];

export const AGENT_TAXONOMY: { group: string; industries: string[] }[] = [{"group":"Bán lẻ & TMĐT","industries":["Bán hàng","TMĐT","Đơn hàng"]},{"group":"Dịch vụ & CSKH","industries":["CSKH","Lịch hẹn","Kỹ thuật"]},{"group":"Tiếp thị & Tăng trưởng","industries":["Marketing","Lead","Loyalty","Giữ chân"]},{"group":"Bất động sản","industries":["BĐS"]},{"group":"Giáo dục","industries":["Giáo dục"]},{"group":"F&B & Du lịch","industries":["F&B","Du lịch"]},{"group":"Tài chính & Kế toán","industries":["Kế toán"]},{"group":"Vận hành nội bộ","industries":["Gọi điện","Báo cáo","Nhân sự","Vận hành"]}];
export const AGENT_EMOJIS: string[] = ["🤖","💬","✨","🎧","🛍️","📞","🧑‍💼","📅","💡","🛟","🌸","⚡"];
/** Nhóm ý định (index lưu ở `ai_agent.intents`). */
export const AGENT_INTENTS: string[] = ["Hỏi giá","Tư vấn sản phẩm","Hỗ trợ / CSKH","Khiếu nại","Đổi / Trả","Đặt lịch hẹn","Theo dõi đơn","Chăm sóc sau bán"];
/** Màu chip kênh trong Builder — đọc trực tiếp từ channelRegistry manifest (STD-channels-adapter-2). */
export const CHANNEL_COLORS: Record<string, string> = Object.fromEntries(
  channelRegistry
    .manifests()
    .filter((m) => channelRegistry.isConnectable(m.type))
    .map((m) => [m.type, m.display.color]),
);
export const PROMPT_TEMPLATES: { label: string; text: string }[] = [{"label":"CSKH đa kênh","text":"# VAI TRÒ & PHONG CÁCH\nBạn là trợ lý CSKH thân thiện, lịch sự, trả lời ngắn gọn bằng tiếng Việt. Luôn xưng \"em\" và gọi khách là \"anh/chị\".\n\n# NHIỆM VỤ\n- Chào hỏi, xác định nhu cầu của khách.\n- Tra cứu Knowledge Base để trả lời chính xác về sản phẩm, đơn hàng, chính sách.\n- Khi không chắc chắn (confidence < 70%), chuyển cho nhân viên.\n\n# GIỚI HẠN\n- Không bịa thông tin. Không hứa hẹn ngoài chính sách."},{"label":"Tư vấn bán hàng","text":"# VAI TRÒ\nBạn là chuyên viên tư vấn bán hàng nhiệt tình, hiểu sản phẩm và biết chốt đơn.\n\n# NHIỆM VỤ\n- Khai thác nhu cầu, gợi ý sản phẩm/liệu trình phù hợp.\n- Báo giá rõ ràng, nêu ưu đãi đang chạy.\n- Tạo cơ hội (CRM) và đề xuất đặt lịch/đặt cọc.\n\n# PHONG CÁCH\n- Tự tin, đồng cảm, không gây áp lực."},{"label":"Đặt lịch hẹn","text":"# VAI TRÒ\nBạn là trợ lý đặt lịch hẹn cho spa/phòng khám.\n\n# NHIỆM VỤ\n- Hỏi dịch vụ, thời gian khách mong muốn.\n- Kiểm tra slot trống và đề xuất 2–3 khung giờ.\n- Xác nhận và tạo lịch hẹn, gửi nhắc trước 24h."},{"label":"Hỗ trợ kỹ thuật","text":"# VAI TRÒ\nBạn là kỹ thuật viên hỗ trợ sản phẩm/phần mềm.\n\n# NHIỆM VỤ\n- Thu thập mô tả lỗi, các bước tái hiện.\n- Hướng dẫn xử lý theo Knowledge Base.\n- Nếu không giải quyết được, tạo ticket ưu tiên và chuyển đội kỹ thuật."}];
/** Khối định dạng "Tối ưu prompt" thêm khi model không trả được bản viết lại (model giả / lỗi định dạng). */
export const OPTIMIZE_SUFFIX = "\n\n# ĐỊNH DẠNG TRẢ LỜI\n- Câu ngắn, xuống dòng rõ ràng, dùng bullet khi liệt kê.\n- Mỗi tin tối đa 3–4 câu; chủ động hỏi lại để làm rõ.\n- Kết thúc bằng một câu hỏi mở hoặc đề xuất bước tiếp theo.";
export const TEST_SEED = "Dạ em chào anh/chị! Em là trợ lý AI vừa cấu hình. Em có thể giúp gì cho mình hôm nay ạ?";
