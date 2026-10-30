# Sinh fixtures/prototype-parity/{assistant,agents}.json từ prototype: Trợ lý L1178–1504 + state L7700, renderVals L8340–8366,
# L8890–8932, L9266–9272, L10489–10523, L11198–11316; AI Agents L2227–2450 + L8447–8486, L9306–9380, L9776–9790, L10980–11033.
# Mẫu agent (45) trích nguyên văn L9307–9351 sang agent-templates.json.
# Ngoại lệ (prototype-parity §6, D29): tên model → mức AI (standard / advanced / max); Workflow, Báo cáo, Gọi điện, ZNS / SMS là OUT;
# kênh agent theo channel registry (Zalo cá nhân, Web chat, Email).
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "..", "..", "fixtures", "prototype-parity")
TIER = {"Haiku 4.5": "standard", "Sonnet 4.5": "advanced", "Opus 4.6": "max", "Claude Haiku 4.5": "standard", "Claude Sonnet 4.5": "advanced"}

think_cards = [
    ["Lên ý tưởng", "Ý tưởng chiến dịch, nội dung, ưu đãi — brainstorm nhiều hướng để chọn.", "#DB2777", "ic-spark", "Sáng tạo", "Gợi ý cho tôi 5 ý tưởng chiến dịch cho tháng này"],
    ["Lập kế hoạch", "Kế hoạch tuần/tháng, phân rã công việc, mốc thời gian.", "#2563EB", "ic-cal", "Kế hoạch", "Lập kế hoạch kinh doanh tháng này theo tuần"],
    ["Phân tích & đề xuất", "Đọc số liệu → nhận định → khuyến nghị hành động.", "#0E9B94", "ic-chart", "Phân tích", "Phân tích tình hình kinh doanh tuần này và đề xuất việc cần làm"],
    ["Soạn nội dung", "Email, ZNS, kịch bản gọi, bài đăng — nhiều biến thể.", "#C9820B", "ic-doc", "Nội dung", "Soạn 3 biến thể tin nhắn chào khách mới"],
    ["Ra quyết định", "So sánh phương án, ưu/nhược, chọn hướng đi.", "#6E48E6", "ic-flow", "Quyết định", "So sánh 2 phương án ưu đãi và khuyến nghị nên chọn cái nào"],
]
cowork_cards = [
    ["ag_sales", "Sales Agent", "Tư vấn sản phẩm, gửi báo giá, chốt đơn theo kịch bản.", "Sonnet 4.5", "active", "#1F9C4F", "ic-trend"],
    ["ag_service", "CSKH Agent", "Trả lời FAQ, xử lý ticket, giữ SLA phản hồi.", "Sonnet 4.5", "active", "#C9820B", "ic-inbox"],
    ["ag_mkt", "Marketing Agent", "Soạn nội dung, lên chiến dịch, chạy A/B test.", "Opus 4.6", "active", "#DB2777", "ic-mega"],
    ["ag_booking", "Booking Agent", "Đặt lịch, xác nhận, nhắc hẹn tự động.", "Haiku 4.5", "active", "#2563EB", "ic-cal"],
    ["ag_acc", "Kế toán Agent", "Nhắc công nợ, đối soát thanh toán, xuất hoá đơn.", "Sonnet 4.5", "active", "#0E9B94", "ic-doc"],
    ["ag_ops", "Vận hành Agent", "Phân ca, tổng hợp báo cáo, cảnh báo bất thường.", "Sonnet 4.5", "paused", "#6E48E6", "ic-bolt"],
]
prompts = ["Tóm tắt tình hình kinh doanh hôm nay", "Khách nào cần chăm sóc gấp?", "Đề xuất 3 việc nên làm ngay", "Có bất thường nào trong dữ liệu không?",
           "So sánh kết quả hôm nay với hôm qua", "Cảnh báo nào cần xử lý trước?", "Doanh thu tuần này so với mục tiêu?", "Hội thoại nào AI chưa xử lý được?",
           "Tổng hợp lịch hẹn hôm nay", "Khách hàng mới trong 7 ngày qua", "Tỷ lệ chốt đơn tháng này thế nào?", "Việc gì đang quá hạn cần làm ngay?"]
# omiIntent (L8340) — chỉ giữ ý định có module IN; mỗi ý định trỏ action của Registry + route mở kết quả
intents = [
    {"key": "quote", "re": "báo giá|quote|chào giá", "icon": "ic-doc", "color": "#C9820B", "action_id": "quote.create", "route": "/quotes",
     "title": "Báo giá do AppChat AI soạn", "desc": "AppChat lấy giá từ danh mục, áp ưu đãi & voucher, tính VAT — anh duyệt rồi chốt sang Hợp đồng.", "dest": "Báo giá"},
    {"key": "agent", "re": "tạo.*agent|agent.*csk|dựng ai|tạo ai", "icon": "ic-spark", "color": "#0E9B7E", "action_id": "agent.create_and_publish", "route": "/agents",
     "title": "Tạo AI Agent", "desc": "AppChat sẽ tạo AI Agent CSKH (mức Nâng cao) gắn kênh Zalo cá nhân + Web chat, ngưỡng tin cậy 80%.", "dest": "AI Agents"},
    {"key": "campaign", "re": "chiến dịch|broadcast|gửi tin", "icon": "ic-mega", "color": "#DB2777", "action_id": "campaign.create", "route": "/marketing",
     "title": "Tạo chiến dịch Marketing", "desc": "AppChat sẽ tạo chiến dịch Zalo win-back cho 12 khách VIP nguội, chờ anh duyệt trước khi gửi.", "dest": "Marketing"},
    {"key": "ticket", "re": "giao việc|tạo task|nhắc việc|phân công|ticket", "icon": "ic-ticket", "color": "#C9820B", "action_id": "ticket.create", "route": "/tickets",
     "title": "Tạo công việc", "desc": "AppChat sẽ tạo task follow-up giao cho người phụ trách, hạn hôm nay.", "dest": "Hỗ trợ"},
]
replies = [
    {"re": "tóm tắt|tình hình|hôm nay", "text": "Hôm nay workspace có 177 hội thoại (▲12%), 42 đang chờ xử lý — cao hơn mức trung bình. Doanh thu attributed ~44 triệu (▲18%). AI tự xử lý đạt 63%. Em đề xuất bổ sung agent khung 10–11h và ưu tiên 8 ticket sắp quá SLA. Anh muốn em mở danh sách ticket đó không?"},
    {"re": "chăm sóc|nguội|cần gọi|vip", "text": "Em lọc được 12 khách VIP 60 ngày chưa tương tác và 5 khách CSAT < 3.5. Nhóm này đóng góp ~38% doanh thu kỳ trước. Em có thể tạo sẵn chiến dịch win-back qua Zalo + phân công cho đội Sale. Anh duyệt em chạy nhé?"},
    {"re": "deal|chốt|doanh thu|dự báo", "text": "Pipeline đang có 6 deal ở giai đoạn Proposal (~128 triệu). 2 deal quá hạn follow-up >2 ngày. Dự báo doanh thu cuối tháng: 312–340 triệu (xác suất 78%). Em nên nhắc đội Sale follow 2 deal nóng trước chứ ạ?"},
    {"re": "sla|csat|khiếu nại", "text": "Hiện có 8 ticket sắp chạm SLA (trong 1 giờ tới), tập trung ở danh mục Giao hàng. CSAT trung bình 4.7/5. Em đề xuất escalation 3 ticket ưu tiên Cao cho trưởng nhóm CSKH. Anh muốn xem chi tiết không?"},
]
fallback = "Em đã hiểu yêu cầu của anh. Dựa trên dữ liệu CRM, marketing và bán hàng hiện có, em sẽ phân tích và đề xuất phương án cụ thể. Anh cho em thêm chút ngữ cảnh (kênh, khoảng thời gian, nhóm khách) để em tư vấn chính xác hơn nhé."
cw_agents = [
    ["Marketing Agent", "Thu hút & nuôi dưỡng lead", 1480, "94%", "120k₫", True, "Haiku 4.5", "Marketing", ["Zalo OA", "Facebook"], 72],
    ["Sales Agent", "Tư vấn · báo giá · chốt đơn", 860, "91%", "180k₫", True, "Sonnet 4.5", "Kinh doanh", ["Zalo OA", "Website", "WhatsApp"], 78],
    ["Support Agent", "CSKH · ticket · FAQ", 1240, "89%", "96k₫", True, "Haiku 4.5", "CSKH", ["Web Chat", "Email"], 70],
    ["Operations Agent", "Đơn hàng · lịch hẹn", 420, "96%", "72k₫", True, "Haiku 4.5", "Vận hành", ["Nội bộ"], 80],
    ["Loyalty Agent", "Tích điểm & giữ chân", 310, "92%", "54k₫", True, "Haiku 4.5", "CSKH", ["Zalo OA"], 75],
    ["Retention Agent", "Win-back khách ngủ đông", 180, "88%", "60k₫", False, "Sonnet 4.5", "Marketing", ["Zalo ZBS", "SMS"], 68],
]
# kênh prototype → kênh có manifest (D28)
CH_MAP = {"Zalo OA": "Zalo cá nhân", "Facebook": "Website", "WhatsApp": "Email", "Website": "Website", "Web Chat": "Web chat", "Email": "Email",
          "Nội bộ": "Nội bộ", "Zalo ZBS": "Zalo cá nhân", "SMS": "Email"}
DEPT = {"Marketing": ["#EDE9FC", "#6E48E6"], "Kinh doanh": ["#EDFAF3", "#157A40"], "CSKH": ["#E7F0FF", "#2563EB"], "Vận hành": ["#FFF4E5", "#B45309"], "Tài chính": ["#FEF2F2", "#B91C1C"]}
tasks = [{"id": f"tk_{i + 1}", "name": n, "role": r, "runs": runs, "success": s, "cost": c, "active": a, "model_tier": TIER[m], "department": d,
          "channels": [CH_MAP[x] for x in ch], "conf": conf} for i, (n, r, runs, s, c, a, m, d, ch, conf) in enumerate(cw_agents)]
task_stats = [["total", "#2563EB", "ic-bot"], ["active", "#16A34A", "ic-check"], ["runs", "#6E48E6", "ic-flow"], ["auto", "#0E9B94", "ic-spark"], ["tokens", "#C8820B", "ic-gift"], ["attention", "#DC2626", "ic-bell"]]
task_templates = [["Báo cáo doanh thu tuần", "Báo cáo doanh thu tuần", "Lấy đơn hàng 7 ngày qua, nhóm theo sản phẩm, so với tuần trước, xuất file Excel và gửi tóm tắt cho tôi.", "Tài chính"],
                  ["Dọn dữ liệu khách trùng", "Dọn dữ liệu khách hàng trùng", "Quét danh sách khách hàng, tìm bản ghi trùng theo SĐT/email, đề xuất gộp và chờ tôi duyệt.", "Vận hành"],
                  ["Nhắc công nợ quá hạn", "Nhắc công nợ quá hạn", "Lọc đề nghị thanh toán quá hạn trên 7 ngày, soạn tin nhắc theo từng khách, chờ duyệt rồi gửi qua Zalo.", "Tài chính"]]
drawer = {
    "prompt": "Bạn là trợ lý AI của MediaSoft Spa, hỗ trợ khách hàng tư vấn liệu trình, báo giá và đặt lịch. Luôn xưng \"em\", gọi khách bằng \"anh/chị\". Khi không chắc chắn, bàn giao cho nhân viên.",
    "tools": [["Tạo báo giá", True], ["Đặt lịch hẹn", True], ["Tạo ticket", True], ["Gửi tin Zalo / Email", True], ["Chốt đơn ≤ 10tr", True], ["Gửi voucher / giảm giá", False], ["Chuyển người thật", True], ["Lập đề nghị thanh toán", False]],
    "knowledge": [["Catalogue BST Hè 2026", "12 tài liệu", True], ["Bảng giá & khuyến mãi", "5 tài liệu", True], ["Chính sách đổi trả", "3 tài liệu", True], ["FAQ dịch vụ", "28 mục", False]],
    "logs": [["10:24", "Tạo báo giá #BG-2043 cho chị Lan", "#16A34A"], ["10:19", "Trả lời hội thoại Zalo (tự động)", "#2563EB"], ["10:05", "Bàn giao cho Minh · confidence thấp", "#C8820B"], ["09:47", "Đặt lịch hẹn 14:00 · Khoa", "#16A34A"], ["09:30", "Gửi tin nhắc lịch · 42 khách", "#6E48E6"]],
}
# Nhật ký hành động L11297 — "Workflow" (OUT) → Ticket; "ZNS" → Zalo. Mốc giờ quanh FIXED_TIME parity (2026-06-24).
LOG = [
    ["create", "AI Agent \"CSKH Spa\"", "AI Agent", "today", "10:21", True, "done", "agent.create_and_publish"],
    ["create", "Ticket \"Khiếu nại giao hàng\"", "Hỗ trợ", "today", "09:48", True, "done", "ticket.create"],
    ["send", "Chiến dịch Zalo \"Flash Sale\"", "Marketing · 1.200 khách", "today", "09:30", False, "pending", "campaign.send"],
    ["export", "Báo cáo doanh thu tuần", "Tổng quan", "yesterday", "17:02", False, "done", "insight.query"],
    ["update", "Pipeline 9 cơ hội → \"Đang chăm\"", "Khách hàng / CRM", "yesterday", "15:40", True, "done", "contact.set_stage"],
    ["create", "Báo giá BG-2051 cho Spa Hương Sen", "Báo giá", "yesterday", "14:18", True, "done", "quote.create"],
    ["send", "Email cảm ơn 24 khách mua combo", "Marketing · 24 khách", "yesterday", "10:05", False, "done", "campaign.send"],
    ["update", "Gắn tag \"VIP nguội\" cho 42 khách", "Khách hàng / CRM", "2d", "16:12", True, "done", "contact.tag"],
    ["delete", "Gỡ 3 liên hệ trùng lặp", "Khách hàng / CRM", "2d", "11:30", True, "done", "contact.merge"],
    ["create", "Mục tiêu KPI Q3 cho đội Sales", "Tổng quan / KPI", "3d", "09:15", True, "done", "insight.query"],
]
action_logs = [{"id": f"al_seed_{i + 1}", "kind": k, "title": t, "object": o, "day": d, "time": tm, "undoable": u, "status": s, "action_id": a}
               for i, (k, t, o, d, tm, u, s, a) in enumerate(LOG)]
# Hàng chờ duyệt (Blueprint §2.2 approval_request, §3.3) — màn mới, không đo pixel
approvals = [
    {"id": "ap_1", "action_id": "campaign.send", "risk": "send", "permission": "campaign.approve", "agent": "Marketing Agent", "title": "Gửi chiến dịch Zalo \"Flash Sale\"",
     "summary": "Gửi 1.200 tin Zalo cá nhân cho nhóm khách Thân thiết + VIP.", "reason": "Gửi ra ngoài > 100 người nhận", "day": "today", "time": "09:30"},
    {"id": "ap_2", "action_id": "quote.send", "risk": "send", "permission": "quote.approve", "agent": "Sales Agent", "title": "Gửi báo giá BG-2058 cho Spa Hương Sen",
     "summary": "Tổng 24.800.000₫ · chiết khấu 8% — vượt ngưỡng 5%, tổng vượt 20 triệu.", "reason": "Vượt ngưỡng duyệt 20M / 5%", "day": "today", "time": "08:52"},
    {"id": "ap_3", "action_id": "payment.refund", "risk": "money", "permission": "payment.refund_approve", "agent": "Support Agent", "title": "Hoàn tiền 1.250.000₫ cho Lê Mạnh Hùng",
     "summary": "Đơn ĐH-1184 · khách trả lại 1 sản phẩm lỗi, đã có ảnh xác nhận.", "reason": "Thao tác tiền", "day": "yesterday", "time": "16:40"},
]
assistant = {
    "think_cards": [{"label": l, "desc": d, "color": c, "icon": i, "tag": t, "command": cmd} for l, d, c, i, t, cmd in think_cards],
    "cowork_cards": [{"id": i, "name": n, "desc": d, "model_tier": TIER[m], "status": s, "color": c, "icon": ic} for i, n, d, m, s, c, ic in cowork_cards],
    "prompts": prompts, "intents": intents, "replies": replies, "fallback": fallback,
    "tasks": tasks, "task_stats": [{"key": k, "color": c, "icon": i} for k, c, i in task_stats],
    "task_kpi": {"auto": "86%", "tokens": "1,42tr", "attention": "3"},
    "task_templates": [{"label": l, "name": n, "goal": g, "department": d} for l, n, g, d in task_templates],
    "departments": [{"key": k, "bg": v[0], "fg": v[1]} for k, v in DEPT.items()],
    "task_data": ["Khách hàng", "Đơn hàng", "Báo giá", "Đề nghị thanh toán", "Hội thoại", "Tệp đính kèm"],
    "task_tools": ["Đọc dữ liệu", "Tạo / sửa bản ghi", "Gửi tin nhắn", "Tạo file báo cáo", "Gửi email"],
    "drawer": {"prompt": drawer["prompt"], "tokens": "248k",
               "tools": [{"label": l, "on": o} for l, o in drawer["tools"]],
               "knowledge": [{"label": l, "meta": m, "on": o} for l, m, o in drawer["knowledge"]],
               "logs": [{"time": t, "text": a, "color": c} for t, a, c in drawer["logs"]]},
    "action_logs": action_logs, "approvals": approvals,
}

AGTAX = {"Bán lẻ & TMĐT": ["Bán hàng", "TMĐT", "Đơn hàng"], "Dịch vụ & CSKH": ["CSKH", "Lịch hẹn", "Kỹ thuật"], "Tiếp thị & Tăng trưởng": ["Marketing", "Lead", "Loyalty", "Giữ chân"],
         "Bất động sản": ["BĐS"], "Giáo dục": ["Giáo dục"], "F&B & Du lịch": ["F&B", "Du lịch"], "Tài chính & Kế toán": ["Kế toán"], "Vận hành nội bộ": ["Gọi điện", "Báo cáo", "Nhân sự", "Vận hành"]}
with open(os.path.join(HERE, "agent-templates.json"), encoding="utf-8") as f:
    TPL = json.load(f)
templates = [{"id": f"tpl_{i + 1}", "name": n, "desc": d, "tag": t, "color": c, "tint": ti, "icon": ic.replace("#", "")} for i, (n, d, t, c, ti, ic) in enumerate(TPL)]
my_agents = [
    ["ag_mkt", "Marketing Agent", "🤖", "marketing", "Thu hút & nuôi dưỡng lead", "active", 1480, 86, 4.5, "Sáng tạo, đúng phân khúc", "Claude Haiku 4.5", 3],
    ["ag_lead", "Lead Qualification Agent", "💡", "sales", "Chấm điểm & sàng lọc lead", "active", 642, 91, 4.6, "Phân tích, hỏi đúng trọng tâm", "Claude Sonnet 4.5", 2],
    ["ag_sales", "Sales Agent", "🛍️", "sales", "Tư vấn & chốt đơn", "active", 1284, 89, 4.6, "Nhiệt tình, chủ động chốt đơn", "Claude Haiku 4.5", 4],
    ["ag_service", "Service Agent", "🎧", "cs", "Xử lý ticket & chăm sóc", "active", 678, 82, 4.4, "Kiên nhẫn, empathy cao", "Claude Haiku 4.5", 2],
    ["ag_loyalty", "Loyalty Agent", "🌸", "cs", "Tích điểm & ưu đãi thành viên", "active", 396, 93, 4.7, "Chu đáo, cá nhân hoá", "Claude Sonnet 4.5", 1],
    ["ag_retention", "Retention Agent", "⚡", "marketing", "Giữ chân & kéo lại khách", "draft", 0, 0, 0, "Chủ động, đúng thời điểm", "Claude Sonnet 4.5", 0],
]
PROMPT_TPL = [
    ["CSKH đa kênh", "# VAI TRÒ & PHONG CÁCH\nBạn là trợ lý CSKH thân thiện, lịch sự, trả lời ngắn gọn bằng tiếng Việt. Luôn xưng \"em\" và gọi khách là \"anh/chị\".\n\n# NHIỆM VỤ\n- Chào hỏi, xác định nhu cầu của khách.\n- Tra cứu Knowledge Base để trả lời chính xác về sản phẩm, đơn hàng, chính sách.\n- Khi không chắc chắn (confidence < 70%), chuyển cho nhân viên.\n\n# GIỚI HẠN\n- Không bịa thông tin. Không hứa hẹn ngoài chính sách."],
    ["Tư vấn bán hàng", "# VAI TRÒ\nBạn là chuyên viên tư vấn bán hàng nhiệt tình, hiểu sản phẩm và biết chốt đơn.\n\n# NHIỆM VỤ\n- Khai thác nhu cầu, gợi ý sản phẩm/liệu trình phù hợp.\n- Báo giá rõ ràng, nêu ưu đãi đang chạy.\n- Tạo cơ hội (CRM) và đề xuất đặt lịch/đặt cọc.\n\n# PHONG CÁCH\n- Tự tin, đồng cảm, không gây áp lực."],
    ["Đặt lịch hẹn", "# VAI TRÒ\nBạn là trợ lý đặt lịch hẹn cho spa/phòng khám.\n\n# NHIỆM VỤ\n- Hỏi dịch vụ, thời gian khách mong muốn.\n- Kiểm tra slot trống và đề xuất 2–3 khung giờ.\n- Xác nhận và tạo lịch hẹn, gửi nhắc trước 24h."],
    ["Hỗ trợ kỹ thuật", "# VAI TRÒ\nBạn là kỹ thuật viên hỗ trợ sản phẩm/phần mềm.\n\n# NHIỆM VỤ\n- Thu thập mô tả lỗi, các bước tái hiện.\n- Hướng dẫn xử lý theo Knowledge Base.\n- Nếu không giải quyết được, tạo ticket ưu tiên và chuyển đội kỹ thuật."],
]
# Hành động agent (D51, D16) — quyền agent = tập action id thật của Registry (ai_agent.tool_ids, Blueprint §3.3b).
# bỏ mục OUT: Gửi ZNS/SMS, Kích hoạt workflow, Xử lý cuộc gọi, HTTP request (D29).
# D54: phạm vi kiến thức theo agent (thư mục kho chung). Agent không có dòng ở đây = scope rỗng.
KB_SCOPE = {"ag_service": ["f_cat", "f_policy"], "ag_sales": ["f_cat", "f_price"], "ag_mkt": ["f_cat"]}
DEFAULT_TOOLS = ["conversation.close", "conversation.assign", "ticket.create", "appointment.create"]
agents = {
    "taxonomy": [{"group": g, "industries": i} for g, i in AGTAX.items()],
    "templates": templates,
    "agents": [{"id": i, "name": n, "emoji": e, "role": role, "role_label": rl, "status": st, "conversations": conv, "resolve_rate": res, "csat": cs, "persona": p,
                "model_tier": TIER[m], "version": v, "intents": [0, 2], "channels": ["zalo_personal", "webchat"], "tools": DEFAULT_TOOLS,
                "language": "vi", "prompt": "", "threshold": 70, "handoff_to": "staff",
                "governance": {"grounding": True, "pii": True, "override": True, "audit": True},
                "kb_scope": {"folder_ids": KB_SCOPE.get(i, []), "tags": []}} for i, n, e, role, rl, st, conv, res, cs, p, m, v in my_agents],
    "emojis": ["🤖", "💬", "✨", "🎧", "🛍️", "📞", "🧑‍💼", "📅", "💡", "🛟", "🌸", "⚡"],
    "intents": ["Hỏi giá", "Tư vấn sản phẩm", "Hỗ trợ / CSKH", "Khiếu nại", "Đổi / Trả", "Đặt lịch hẹn", "Theo dõi đơn", "Chăm sóc sau bán"],
    "channels": [{"key": "zalo_personal", "color": "#0068FF"}, {"key": "webchat", "color": "#2DC56A"}, {"key": "email", "color": "#1F8A4D"}],
    "prompt_templates": [{"label": l, "text": t} for l, t in PROMPT_TPL],
    "optimize_suffix": "\n\n# ĐỊNH DẠNG TRẢ LỜI\n- Câu ngắn, xuống dòng rõ ràng, dùng bullet khi liệt kê.\n- Mỗi tin tối đa 3–4 câu; chủ động hỏi lại để làm rõ.\n- Kết thúc bằng một câu hỏi mở hoặc đề xuất bước tiếp theo.",
    "test_seed": "Dạ em chào anh/chị! Em là trợ lý AI vừa cấu hình. Em có thể giúp gì cho mình hôm nay ạ?",
    "test_replies": [
        {"re": "giá|bao nhiêu|chi phí", "text": "Dạ về giá, anh/chị quan tâm liệu trình mấy buổi để em báo giá chính xác nhất ạ? Hiện bên em đang có ưu đãi cho khách mới."},
        {"re": "lịch|đặt|hẹn", "text": "Dạ em hỗ trợ đặt lịch ngay ạ. Anh/chị muốn đến vào khung giờ nào, em kiểm tra slot trống giúp mình nhé?"},
    ],
    "test_fallback": "Dạ em đã ghi nhận yêu cầu của anh/chị. Em kiểm tra và phản hồi ngay trong ít phút ạ.",
    "ai_suggests": [
        {"key": "create", "color": "#2DC56A", "title": "Tạo AI Agent bằng hội thoại", "desc": "Mô tả vai trò, AppChat tự dựng kịch bản + kết nối kênh"},
        {"key": "optimize", "color": "#6E48E6", "title": "Tối ưu agent CSAT thấp", "desc": "Service Agent đang 4.4★ · gợi ý cải thiện prompt & knowledge"},
        {"key": "routing", "color": "#2563EB", "title": "Kiểm tra quy tắc phân luồng", "desc": "5 rule đang chạy · phát hiện trùng điều kiện"},
        {"key": "report", "color": "#157A40", "title": "Báo cáo hiệu suất AI Agents", "desc": "1.091 xử lý hôm nay · tin cậy 92% · escalate 15%"},
    ],
    "version_notes": ["Bản đầu tiên", "Thêm kiến thức bảng giá", "Đổi giọng điệu thân thiện hơn", "Hạ ngưỡng bàn giao về 70%"],
    # bản nháp Trợ lý soạn từ mô tả (D29 agent.draft_from_description) — mock trả cấu hình mẫu CSKH
    "ai_draft": {"name": "CSKH Spa", "emoji": "🎧", "role": "cs", "model_tier": "advanced", "channels": ["zalo_personal", "webchat"], "intents": [1, 2, 5],
                 "tools": ["conversation.assign", "ticket.create", "appointment.create", "conversation.tag"], "threshold": 80, "prompt_template": 0},
}
for name, data in (("assistant.json", assistant), ("agents.json", agents)):
    with open(os.path.join(OUT, name), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
print("ok", len(templates), "templates")
