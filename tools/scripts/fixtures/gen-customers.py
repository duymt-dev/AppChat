# Sinh fixtures/prototype-parity/customers.json từ dữ liệu prototype L2451–2984 + generator crmContacts L8606–8683.
# Ngoại lệ (prototype-parity §6): nguồn "Zalo OA / Facebook / TikTok" → kênh có manifest; "Claude Cowork" → "AI Cowork" (D29);
# "Tạo hóa đơn" → "Đề nghị thanh toán"; ZNS là mục OUT.
import json

CH = [["Zalo cá nhân", "#0068FF"], ["Email", "#1F8A4D"], ["Website", "#0E9B94"], ["Nhập tay", "#111111"], ["Giới thiệu", "#C9820B"]]
SRC_KEY = ["zalo_personal", "email", "website", "manual", "referral"]
CITY = [["TP.HCM", "Q.1"], ["TP.HCM", "Q.7"], ["Hà Nội", "Cầu Giấy"], ["Đà Nẵng", "Hải Châu"], ["TP.HCM", "Thủ Đức"], ["Hà Nội", "Đống Đa"]]
DD = ["08/06/2026", "09/06/2026", "10/06/2026", "11/06/2026", "12/06/2026", "13/06/2026"]
HH = ["09:12", "10:40", "11:25", "14:08", "15:33", "16:50"]
RAW = [
    ["Lan", "Nguyễn Thị", "lan@shopbena.vn", "+84 909 123 456", "Chủ shop", "Trâm"],
    ["Hiếu", "Nguyễn Trung", "hieu.nguyen@gmail.com", "+84 902 334 571", "—", "Minh"],
    ["Linh", "Phạm Thị", "linh.p@outlook.com", "+84 988 112 299", "Khách lẻ", "Hương"],
    ["Ashley", "Fowler", "ashley@adong-beauty.vn", "+1 415 882 4421", "Quản lý spa", "Trâm"],
    ["Khoa", "Trần Minh", "khoa.tm@gmail.com", "+84 977 445 008", "Quản lý phòng khám", "Khoa"],
    ["J.", "Rodriguez", "jrod@phongkhamquocte.vn", "+1 646 228 9013", "Customer", "Hương"],
    ["Hùng", "Lê Mạnh", "hung.le@giadungsg.vn", "+84 908 552 117", "Trưởng kinh doanh", "Minh"],
    ["Hạnh", "Trần Thị", "hanh.tran@mombaby.vn", "+84 903 552 221", "Founder", "Trâm"],
    ["Quân", "Phạm Quang", "quan.pham@ankhang.vn", "+84 912 448 773", "IT Director", "Minh"],
    ["Sophia", "Green", "sophia@bamboehome.com", "+1 312 775 3048", "Buyer", "AI Cowork"],
    ["Minh Anh", "Đỗ Thị", "minhanh@gmail.com", "+84 909 887 332", "Cá nhân", "AI Cowork"],
    ["Tuấn", "Lê Anh", "tuan.le@company.vn", "+84 988 002 115", "Giám đốc", "Trâm"],
]
MEMBERS = [
    {"id": "u_tram", "name": "Trâm", "role": "Sales Lead"},
    {"id": "u_minh", "name": "Minh", "role": "Sales"},
    {"id": "u_huong", "name": "Hương", "role": "CSKH"},
    {"id": "u_khoa", "name": "Khoa", "role": "Quản lý"},
]
OWNER_ID = {m["name"]: m["id"] for m in MEMBERS}
STAGES = ["lead", "potential", "consulting", "quote", "contract", "won"]
TYPES = ["individual", "business", "household"]
GROUPS = ["vip", "loyal", "new", "potential"]
STATUSES = ["active", "potential", "inactive"]
HINTS = ["Nên chăm sóc lại — 18 ngày chưa liên hệ", "Gửi ưu đãi giữ chân khách", "Nhắc thanh toán / theo dõi đơn", "Đề xuất upsell combo phù hợp", "Phản hồi gấp theo SLA", "Đặt lịch follow-up tuần này"]
AI_NAMES = ["Minh", "Hương", "Trâm", "Khoa", "Lan Anh", "Vy"]


def ai_state(i):
    m = i % 3
    if m == 0:
        return {"kind": "ai", "label": "AI xử lý"}
    if m == 1:
        return {"kind": "user", "label": AI_NAMES[i % len(AI_NAMES)]}
    return {"kind": "wait", "label": "Chờ xử lý"}


contacts = []
for idx, (first, last, email, phone, title, owner) in enumerate(RAW):
    i = len(first + last + "CT-10" + str(idx + 1))
    ch = (first + last).__len__() % len(CH)
    city, district = CITY[i % 6]
    contacts.append({
        "id": "ct_lan" if idx == 0 else f"kh_{1001 + idx}",
        "code": f"KH-{1001 + idx}",
        "full_name": f"{last} {first}",
        "first_name": first,
        "title": title,
        "initials": (first[0] + last[0]).upper(),
        "avatar_hue": (len(first + last) * 28) % 360,
        "reg_date": DD[i % 6],
        "reg_time": HH[i % 6],
        "type": TYPES[idx % 3],
        "group": GROUPS[idx % 4],
        "source": SRC_KEY[ch],
        "source_label": CH[ch][0],
        "source_color": CH[ch][1],
        "email": email,
        "phone": phone,
        "zalo": "0" + str(900000000 + (i * 37 % 99999999)),
        "city": city,
        "district": district,
        "status": STATUSES[idx % 3],
        "stage": STAGES[idx % 6],
        "owner_user_id": OWNER_ID.get(owner, "agent_cowork"),
        "owner_name": owner,
        "owner_hue": (len(owner) * 34) % 360,
        "ai": {**ai_state(idx), "hint": HINTS[idx % 6]},
        "tags": ["VIP"] if idx % 6 == 0 else ["Hot lead"] if idx % 6 == 2 else [],
        "web_bg": idx % 6,
    })

out = {
    "members": MEMBERS,
    "stats": [
        {"key": "total", "value": "1.284", "color": "#2563EB", "icon": "ic-users"},
        {"key": "leads", "value": "186", "color": "#16A34A", "icon": "ic-chart"},
        {"key": "deals", "value": "42", "color": "#6E48E6", "icon": "ic-spark"},
        {"key": "ltv", "value": "12.4tr", "color": "#C9820B", "icon": "ic-gift"},
    ],
    "stages": [
        {"key": "all", "color": "#6B7280", "count": 12},
        {"key": "lead", "color": "#2B9EF3", "count": 74},
        {"key": "potential", "color": "#F59E0B", "count": 52},
        {"key": "consulting", "color": "#7C3AED", "count": 38},
        {"key": "quote", "color": "#EC4899", "count": 21},
        {"key": "contract", "color": "#0F6E50", "count": 8},
        {"key": "won", "color": "#22C55E", "count": 48},
    ],
    "tag_defs": [
        {"label": "VIP", "line": "#FBBF24", "bg": "#FEF6E0", "fg": "#8A5A0C"},
        {"label": "Hot lead", "line": "#EF4444", "bg": "#FEF2F2", "fg": "#C8263A"},
        {"label": "Chăm sóc", "line": "#0EA5E9", "bg": "#E8F6FE", "fg": "#0369A1"},
        {"label": "Đơn hàng", "line": "#22C55E", "bg": "#EAFBF1", "fg": "#157A40"},
        {"label": "Quốc tế", "line": "#8B5CF6", "bg": "#F3EEFE", "fg": "#6E48E6"},
    ],
    "contacts": contacts,
    "custom_fields": [
        {"key": "size", "label": "Size áo", "type": "picklist", "options": "S/M/L/XL/XXL", "group": "Bán lẻ", "required": False, "visible": True},
        {"key": "tax_id", "label": "Tax ID", "type": "text", "options": "13 ký tự số", "group": "B2B", "required": True, "visible": True},
        {"key": "gift_pref", "label": "Birthday Gift Pref", "type": "multi", "options": "Voucher / Gift box / Trải nghiệm", "group": "Loyalty", "required": False, "visible": True},
        {"key": "vip_tier", "label": "VIP Tier", "type": "tier", "options": "Bạc / Vàng / Bạch kim / Kim cương", "group": "Loyalty", "required": False, "visible": True},
        {"key": "referrer", "label": "Referrer", "type": "lookup", "options": "Liên hệ giới thiệu", "group": "Marketing", "required": False, "visible": True},
        {"key": "school", "label": "School / Class", "type": "text", "options": "–", "group": "Edu / Trung tâm", "required": False, "visible": False},
        {"key": "allergies", "label": "Allergies", "type": "tags", "options": "Hải sản / Sữa / Gluten / …", "group": "F&B / Spa", "required": False, "visible": False},
    ],
    "duplicates": {
        "summary": {"groups": 12, "records": 28, "auto": 8},
        "groups": [
            {"id": "dg1", "pct": 96, "by": "Email · Số điện thoại",
             "a": {"name": "Lan Nguyễn Thị", "email": "lan@shopbena.vn", "phone": "+84 909 123 456", "src": "Zalo cá nhân · 12/03"},
             "b": {"name": "Nguyễn Thị Lan", "email": "lan@shopbena.vn", "phone": "0909 123 456", "src": "Form web · 03/04"}},
            {"id": "dg2", "pct": 88, "by": "Số điện thoại",
             "a": {"name": "Trần Quốc Bảo", "email": "bao.tran@gmail.com", "phone": "+84 938 222 110", "src": "Marketplace · 15/02"},
             "b": {"name": "Bảo Trần", "email": "b.tran@homestay.vn", "phone": "+84 938 222 110", "src": "Đơn hàng · 22/03"}},
            {"id": "dg3", "pct": 74, "by": "Tên + Công ty",
             "a": {"name": "Phạm Minh Tú", "email": "tu.pm@coffeev.vn", "phone": "—", "src": "Manual · 18/01"},
             "b": {"name": "Phạm M. Tú", "email": "phammt@coffeev.vn", "phone": "—", "src": "Email sync · 02/04"}},
        ],
    },
    "ai_runs": {
        "pipeline": {"text": "Pipeline: Lead 74 · Tiềm năng 52 · Tư vấn 38 · Báo giá 21 · Hợp đồng 8 · Đã mua 48. Chuyển đổi Lead→Mua 21%; điểm nghẽn ở Báo giá→Hợp đồng (38%).", "act": "kanban"},
        "churn": {"text": "Phát hiện 3 khách >60 ngày không tương tác: Anh Dũng Phạm, J. Rodriguez, Sophia Green. Đề xuất gửi ưu đãi giữ chân.", "act": None},
        "dedupe": {"text": "Có 12 nhóm nghi ngờ trùng (28 bản ghi); 8 nhóm hợp nhất tự động được (score >90).", "act": "dedupe"},
        "assign": {"text": "Đề xuất: TP.HCM → Trâm (32) · Hà Nội → Minh (18) · Đà Nẵng → Hương (9).", "act": None},
        "upsell": {"text": "12 khách LTV >20tr phù hợp upsell gói năm; tỉ lệ chốt dự đoán 64%.", "act": None},
    },
    "peek": [
        "Khách chưa được liên hệ 18 ngày — nên gửi tin chăm sóc lại.",
        "Có nhu cầu HIFU (theo lịch sử chat) — gợi ý báo giá combo.",
        "Sinh nhật trong 5 ngày — tự động gửi ưu đãi + tích điểm.",
        "Đề xuất gán cho Sales: Minh (tỷ lệ chốt cao với nhóm này).",
    ],
    # D32: khách 1 (Hiếu, Minh phụ trách) có Trâm đồng phụ trách — Sales Trâm thấy trong "Của tôi".
    "collaborators": {"kh_1002": [{"user_id": "u_tram", "role": "collaborator"}], "ct_lan": [{"user_id": "u_huong", "role": "watcher"}]},
}

with open("fixtures/prototype-parity/customers.json", "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=1)
print("ok", len(contacts))
