# Sinh fixtures/prototype-parity/tickets.json từ prototype TKDATA L8690–8705 (+ tkdMacros / tkAiSuggests L9171–9187).
# Ngoại lệ (thắng prototype):
# - kênh theo channel registry (prototype-parity §6): instagram/facebook/whatsapp/telegram → zalo_personal | webchat | email;
# - người phụ trách = user thật (u_huong / u_minh / u_tram) hoặc AI Agent (agent_cs); nhóm = team_id;
# - "resolved" → status closed + close_reason resolved (Blueprint §2.2 ticket); SLA lưu bằng hạn ttr_due_at so với giờ mock 24/06/2026 09:00.
import json
from datetime import datetime, timedelta

NOW = datetime.fromisoformat("2026-06-24T09:00:00+07:00")
CH = {"instagram": "zalo_personal", "facebook": "webchat", "zalo": "zalo_personal", "whatsapp": "zalo_personal",
      "telegram": "email", "email": "email", "web": "webchat"}
WHO = {"Hương": "u_huong", "Minh": "u_minh", "Trâm": "u_tram", "AI Agent": None}
TEAM = {"Nhóm Hỗ trợ 1": "t_sp1", "Nhóm Hỗ trợ 2": "t_sp2", "Nhóm Kế toán": "t_acc", "AI tự xử": "t_ai"}
# phút còn lại tới hạn TTR (âm = quá hạn); None = đã đóng
ROWS = [
    ["2041", "Khách yêu cầu đổi lịch hẹn liệu trình", "Refund", "instagram", "Cty Bảo An", "linhpham@baoan.vn", "open", "high", "Hương", "Nhóm Hỗ trợ 1", -150, 5],
    ["2040", "Đặt nhầm dịch vụ, cần điều chỉnh", "Delivery", "facebook", "Cty XYZ", "hieu@xyz.com", "in_progress", "high", "Minh", "Nhóm Hỗ trợ 2", 45, 15],
    ["2039", "Hỏi chính sách hoãn/huỷ lịch hẹn", "Policy", "zalo", "Khách lẻ", "lan.tran@gmail.com", "open", "medium", "AI Agent", "AI tự xử", 130, 30],
    ["2038", "Phản hồi chưa hài lòng sau liệu trình", "Return", "whatsapp", "Cty DEF", "jr@def.com", "waiting", "medium", "Hương", "Nhóm Hỗ trợ 1", 300, 60],
    ["2037", "Chưa nhận được xác nhận lịch hẹn", "Shipping", "telegram", "Cty GHI", "khoa@ghi.com", "closed", "low", "AI Agent", "AI tự xử", None, 120],
    ["2036", "Lỗi hiển thị lịch hẹn trên app", "Technical", "zalo", "Khách lẻ", "qanh@gmail.com", "closed", "low", "Minh", "Nhóm Hỗ trợ 2", None, 180],
    ["2035", "Yêu cầu xuất hoá đơn VAT", "Billing", "email", "Cty Minh An", "ketoan@minhan.vn", "in_progress", "medium", "Trâm", "Nhóm Kế toán", 80, 45],
    ["2034", "Liệu trình thiếu bước theo gói", "Delivery", "instagram", "Khách lẻ", "ha.do@gmail.com", "open", "high", "Hương", "Nhóm Hỗ trợ 1", 50, 10],
    ["2033", "Hỏi thời gian bảo hành sau điều trị", "Policy", "zalo", "Khách lẻ", "ducanh@gmail.com", "open", "low", "AI Agent", "AI tự xử", 360, 60],
    ["2032", "Khiếu nại thái độ tư vấn", "Complaint", "facebook", "Khách lẻ", "bich.ngo@gmail.com", "in_progress", "high", "Minh", "Nhóm Hỗ trợ 2", 60, 5],
    ["2031", "Đổi chi nhánh thực hiện dịch vụ", "Delivery", "telegram", "Cty JKL", "nam@jkl.com", "waiting", "medium", "Trâm", "Nhóm Hỗ trợ 1", 240, 120],
    ["2030", "Hoàn phí gói liệu trình chưa dùng", "Refund", "instagram", "Khách lẻ", "mai.trinh@gmail.com", "closed", "medium", "Hương", "Nhóm Hỗ trợ 1", None, 1440],
    ["2029", "Lỗi thanh toán QR", "Technical", "web", "Khách lẻ", "quang.bui@gmail.com", "closed", "high", "AI Agent", "AI tự xử", None, 1440],
    ["2028", "Tư vấn liệu trình phù hợp cho khách", "Policy", "zalo", "Khách lẻ", "cubin.mom@gmail.com", "closed", "low", "AI Agent", "AI tự xử", None, 2880],
]
TTR = {"high": 480, "medium": 960, "low": 1440}


def iso(d):
    return d.isoformat(timespec="seconds")


tickets = []
for code, title, cat, ch, company, email, status, prio, who, team, left, ago in ROWS:
    updated = NOW - timedelta(minutes=ago)
    created = updated - timedelta(minutes=20)
    due = NOW + timedelta(minutes=left) if left is not None else created + timedelta(minutes=TTR[prio])
    tickets.append({
        "id": f"tk_{code}",
        "code": f"TKT-{code}",
        "title": title,
        "description": f'Khách phản ánh: "{title}". Cần kiểm tra và phản hồi theo SLA cam kết.',
        "category": cat,
        "channel": CH[ch],
        "company": company,
        "email": email,
        "contact_id": None,
        "status": status,
        "priority": prio,
        "assignee_user_id": WHO[who],
        "assignee_agent_id": "agent_cs" if who == "AI Agent" else None,
        "team_id": TEAM[team],
        "sla_policy_name": "Mặc định",
        "frt_target_min": 30,
        "ttr_target_min": TTR[prio],
        "frt_min": 15,
        "ttr_due_at": iso(due),
        "paused_since": iso(updated) if status == "waiting" else None,
        "sla_result": "met" if status == "closed" else None,
        "close_reason": "resolved" if status == "closed" else None,
        "escalations": 0,
        "reopened_count": 0,
        "created_at": iso(created),
        "updated_at": iso(updated),
        "comments": [
            {"id": f"cm_{code}_1", "author_type": "contact", "author": company, "body": f'Khách phản ánh: "{title}". Cần kiểm tra và phản hồi theo SLA cam kết.', "internal": False, "at": iso(created)},
            {"id": f"cm_{code}_2", "author_type": "agent", "author": "AI Agent", "body": "Dạ em đã tiếp nhận và đang kiểm tra thông tin, em phản hồi anh/chị trong ít phút ạ.", "internal": False, "at": iso(created + timedelta(minutes=15))},
        ],
        "events": [
            {"type": "created", "by": "system", "at": iso(created)},
            {"type": "assigned", "by": "routing", "at": iso(created)},
            {"type": "status", "by": who, "status": status, "at": iso(updated)},
        ],
    })

data = {
    "now": iso(NOW),
    "teams": [{"id": v, "name": k} for k, v in TEAM.items()],
    "categories": ["Refund", "Delivery", "Policy", "Billing", "Technical", "Return", "Shipping", "Complaint"],
    "agent": {"id": "agent_cs", "name": "AI Agent"},
    "tickets": tickets,
    "trend": {"total": "+12%", "open": "+5%", "waiting": "+8%", "breach": "+20%", "closed": "+15%"},
    "ai": [
        ["overdue", "Tóm tắt ticket quá hạn hôm nay", "1 ticket quá hạn SLA + 3 sắp đến hạn · gợi ý xử lý ưu tiên"],
        ["reply", "Gợi ý phản hồi cho khiếu nại trị liệu", "Soạn phản hồi đồng cảm + hướng xử lý hoàn/đổi cho khách"],
        ["route", "Phân loại & định tuyến ticket tồn", "Tự gán nhóm xử lý theo danh mục & độ ưu tiên"],
        ["report", "Báo cáo SLA tuần này", "82% AI tự xử · thời gian xử lý TB 1.4h · 1 vi phạm SLA"],
    ],
}
with open("fixtures/prototype-parity/tickets.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
    f.write("\n")
print(len(tickets), "tickets")
