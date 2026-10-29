# Sinh fixtures/prototype-parity/settings.json từ prototype Cài đặt (L5754–7421, state L7674–7871, renderVals L9810–10760).
# Chỉnh theo quyết định (thắng prototype):
# - 5 vai trò hệ thống Blueprint §3.5 (owner / manager / sales / cs / accountant) thay 6 vai trò mẫu; vai trò chỉ đọc ở P0 (D27);
# - mục Cài đặt OUT ẩn (prototype-parity §6); kênh chỉ theo manifest (Zalo cá nhân, Website, Email); connector theo manifest, còn lại "Sắp có" (D28);
# - AI Models hiện mức AI, không tên model (D29); bỏ "tự nạp" ví và "tự chuyển model tiết kiệm".
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from settings_ai import build_ai  # noqa: E402
from settings_ops import build_ops  # noqa: E402

NOW = "2026-06-24T09:00:00+07:00"

WORKSPACE = {
    "id": "ms-vn-2026",
    "name": "MediaSoft Vietnam",
    "initial": "MS",
    "legal_name": "MediaSoft Vietnam Corp.",
    "website": "https://mediasoft.vn",
    "tax_code": "0314783952",
    "address": "81 Cách Mạng Tháng 8, Q.1, TP.HCM",
    "support_phone": "+84 28 3823 4567",
    "admin_email": "admin@mediasoft.vn",
    "locale": "vi",
    "timezone": "Asia/Ho_Chi_Minh",
    "date_format": "DD/MM/YYYY",
    "currency": "VND",
}

# tên, mã, gói, seat, màu, đang dùng
WORKSPACES = [
    ["MediaSoft Vietnam", "ms-vn-2026", "Ultimate", "12/15", "#1B9E5A", True],
    ["Spa Hương Sen", "spa-hs-2026", "Business", "5/8", "#DB2777", False],
    ["Nha khoa Minh Châu", "nk-mc-2026", "Team", "3/5", "#2563EB", False],
]

# id, tên, email, vai trò (hệ thống), phòng ban, màu, hoạt động cuối, trạng thái
MEMBERS = [
    ["u_ngoc", "Mai Đình Ngọc", "ngocmd@mediasoft.vn", "owner", "Ban giám đốc", "#16A34A", "online", "active"],
    ["u_tram", "Nguyễn Thùy Trâm", "tramnt@appchat.vn", "manager", "Kinh doanh", "#7C3AED", "online", "active"],
    ["u_minh", "Lê Quốc Minh", "minhlq@appchat.vn", "manager", "Vận hành", "#16A34A", "online", "active"],
    ["u_huong", "Phạm Thu Hương", "huongpt@appchat.vn", "cs", "CS", "#2563EB", "2h", "offline"],
    ["u_huyen", "Đỗ Thị Huyền", "huyendt@appchat.vn", "sales", "Marketing", "#16A34A", "online", "active"],
    ["u_khanh", "Trần Văn Khánh", "khanhtv@appchat.vn", "accountant", "Kế toán", "#2563EB", "3d", "pending"],
]

# Kênh theo prototype L7674 + chanMeta L7981; trạng thái theo channel registry (omnichannel-adapter): chỉ zalo_personal / webchat / email
# có manifest → kết nối được, còn lại "Sắp có". Zalo cá nhân + Website + Email đã kết nối trong dữ liệu mẫu.
# type, tên, ký hiệu, màu, đã kết nối, tài khoản, hội thoại, FRT, sức khoẻ, agent, nhóm, nhãn (pop/beta/''), có manifest
CHANNELS = [
    ["zalo_oa", "Zalo OA", "Z", "#0068FF", False, "", 0, "—", "off", "", "msg", "pop", False],
    ["zalo_personal", "Zalo cá nhân", "Z", "#0068FF", True, "Trâm · 0907 711 888", 412, "1'12", "good", "Sales Agent (AI)", "msg", "", True],
    ["facebook", "Facebook Page", "f", "#1877F2", False, "", 0, "—", "off", "", "msg", "pop", False],
    ["messenger", "Messenger", "f", "#1877F2", False, "", 0, "—", "off", "", "msg", "pop", False],
    ["instagram", "Instagram", "◎", "#E1306C", False, "", 0, "—", "off", "", "msg", "pop", False],
    ["whatsapp", "WhatsApp", "W", "#25D366", False, "", 0, "—", "off", "", "msg", "pop", False],
    ["whatsapp_business", "WhatsApp Business (API)", "W", "#25D366", False, "", 0, "—", "off", "", "msg", "pop", False],
    ["telegram", "Telegram", "✈", "#229ED9", False, "", 0, "—", "off", "", "msg", "", False],
    ["tiktok_messaging", "TikTok Messaging", "♪", "#111111", False, "", 0, "—", "off", "", "msg", "beta", False],
    ["viber", "Viber", "V", "#7360F2", False, "", 0, "—", "off", "", "msg", "", False],
    ["line", "LINE", "L", "#06C755", False, "", 0, "—", "off", "", "msg", "", False],
    ["wechat", "WeChat", "微", "#07C160", False, "", 0, "—", "off", "", "msg", "", False],
    ["email", "Email", "@", "#1F8A4D", True, "cskh@appchat.vn", 88, "42'", "good", "", "web", "", True],
    ["tiktok_shop", "TikTok Shop", "♪", "#111111", False, "", 0, "—", "off", "", "shop", "", False],
    ["shopee", "Shopee", "S", "#EE4D2D", False, "", 0, "—", "off", "", "shop", "", False],
    ["webchat", "Website Chat", "⌘", "#2DC56A", True, "appchat.vn", 324, "0'48", "good", "Sales Agent (AI)", "web", "pop", True],
]

# Nền tảng kết nối (prototype integGroups L10364; provider-ports.md, D28). Chỉ connector có manifest; Tổng đài (module OUT) bỏ;
# SMS (P2) và ZBS (OUT) bỏ. GA: SePay, Casso (đối soát), Brevo (mail), SMTP; còn lại "Sắp có" + "Đăng ký quan tâm".
# key, tên, nhóm, màu, trạng thái, đã kết nối, mở mục (web_widget) hoặc None, các trường xác thực
CONNECTORS = [
    ["web_widget", "Trợ lý AI", "channels_studio", "#2DC56A", "ga", True, "web_widget", []],
    ["brevo", "Brevo", "marketing", "#0B996E", "ga", True, None, ["api_key"]],
    ["smtp", "Google Workspace", "marketing", "#4285F4", "ga", False, None, ["host", "username", "password"]],
    ["mailgun", "Mailgun", "marketing", "#C02021", "coming_soon", False, None, []],
    ["sepay", "SePay", "payments", "#0E7C66", "ga", True, None, ["api_key", "account_number"]],
    ["casso", "Casso", "payments", "#1E5BBF", "ga", False, None, ["api_key"]],
    ["kiotviet", "KiotViet", "commerce", "#1763F4", "coming_soon", False, None, []],
    ["sapo", "Sapo", "commerce", "#1565C0", "coming_soon", False, None, []],
    ["haravan", "Haravan", "commerce", "#0066FF", "coming_soon", False, None, []],
    ["woocommerce", "WooCommerce", "commerce", "#7F54B3", "coming_soon", False, None, []],
    ["google_sheets", "Google Sheets", "productivity", "#0F9D58", "coming_soon", False, None, []],
    ["gcs", "Google Cloud Storage", "productivity", "#4285F4", "coming_soon", False, None, []],
    ["misa_meinvoice", "MISA meInvoice", "erp", "#E2231A", "coming_soon", False, None, []],
    ["matbao_minvoice", "Mắt Bão M-Invoice", "erp", "#D71920", "coming_soon", False, None, []],
    ["vnpt_invoice", "VNPT Invoice", "erp", "#0068B7", "coming_soon", False, None, []],
    ["viettel_sinvoice", "Viettel S-Invoice", "erp", "#EE0033", "coming_soon", False, None, []],
    ["odoo", "Odoo", "erp", "#714B67", "coming_soon", False, None, []],
    ["fast", "Fast", "erp", "#E8602C", "coming_soon", False, None, []],
]

# Trợ lý AI website (prototype L7184–7301, state wgItems L7768, wg* L10049–10120). KPI tính từ 4 widget mẫu như prototype.
EMBED_NL = chr(10)
WG_ITEMS = [[3420, 512, True], [1880, 642, True], [940, 301, True], [1240, 288, False]]
WIDGET = {
    "name": "Trợ lý AppChat",
    "greeting": "Xin chào 👋 Spa hỗ trợ gì cho mình ạ?",
    "ai_chat": True,
    "prechat": True,
    "actions": [{"key": "order", "color": "#C9820B", "on": False}, {"key": "faq", "color": "#0E9B94", "on": False}],
    "ai_on": True,
    "agents": ["Sales Agent", "Support Agent", "Marketing Agent"],
    "agent": "Sales Agent",
    "handoff": 70,
    "knowledge": ["catalog", "price", "policy", "faq", "company", "process", "website"],
    "knowledge_on": ["catalog", "price", "faq"],
    "tone": "friendly",
    "mode": "hybrid",
    "collect": ["answer", "lead", "ticket", "booking", "quote", "contract", "debt"],
    "collect_on": ["lead", "ticket", "answer"],
    "kpis": {
        "clicks": sum(c for c, _, _ in WG_ITEMS),
        "chats": sum(h for _, h, _ in WG_ITEMS),
        "running": sum(1 for *_, on in WG_ITEMS if on),
        "total": len(WG_ITEMS),
    },
    "embed": EMBED_NL.join([
        '<script src="https://cdn.appchat.vn/w.js"',
        '  data-id="w1" data-pos="br"',
        '  data-channels="zalo,webchat,email"></script>',
    ]),
}

TAG_AT = "2026-07-21T14:48:00+07:00"
TAGS = [
    ["tg_vip", "VIP", "#DB2777", 342], ["tg_new", "Khách mới", "#2563EB", 1280], ["tg_care", "Cần chăm sóc", "#F5A830", 86],
    ["tg_bought", "Đã mua", "#1B9E5A", 2140], ["tg_churn", "Nguy cơ rời bỏ", "#DC2626", 54], ["tg_hot", "Hot lead", "#E8602C", 128],
    ["tg_cared", "Đã chăm sóc", "#0E9B94", 412], ["tg_potential", "Tiềm năng", "#7C3AED", 196],
]
TAG_PALETTE = ["#DC2626", "#F59E0B", "#2563EB", "#16A34A", "#7C3AED", "#0E9B94", "#DB2777", "#E8602C", "#6B7280", "#06B6D4"]

REPLIES = [
    ["Chào & xin lỗi", "/chao", "Chào khách lần đầu", "Dạ em chào anh/chị {tên} 👋 Em là trợ lý của AppChat, em có thể hỗ trợ gì cho mình ạ?"],
    ["Chào & xin lỗi", "/xinloi", "Xin lỗi khi khách chờ lâu", "Dạ em xin lỗi đã để anh/chị chờ ạ. Em đang kiểm tra và phản hồi mình ngay trong ít phút nhé!"],
    ["Chào & xin lỗi", "/cam_on", "Cảm ơn khách đã mua hàng", "Em cảm ơn anh/chị đã tin tưởng đặt hàng ạ 🎉 Đơn của mình đang được xử lý, em sẽ cập nhật tình trạng giao hàng sớm nhất."],
    ["Thông tin sản phẩm", "/gia", "Gửi bảng giá tổng", "Dạ em gửi anh/chị bảng giá dịch vụ ạ. Hiện bên em đang có ưu đãi cho khách mới, anh/chị quan tâm gói nào để em tư vấn chi tiết nhé?"],
    ["Thông tin sản phẩm", "/size", "Hướng dẫn chọn size", "Để chọn size chuẩn, anh/chị cho em xin chiều cao & cân nặng, em sẽ tư vấn size phù hợp nhất ạ."],
    ["Thông tin sản phẩm", "/chat_lieu", "Giải thích chất liệu", "Sản phẩm dùng chất liệu cao cấp, thoáng mát, co giãn tốt và bền màu sau nhiều lần giặt ạ."],
    ["Vận chuyển & thanh toán", "/ship", "Phí ship từng khu vực", "Nội thành: 20.000₫ · Ngoại thành & tỉnh: 30.000₫ · Miễn phí ship cho đơn từ 500.000₫ ạ."],
    ["Vận chuyển & thanh toán", "/cod", "Chính sách COD", "Bên em hỗ trợ thanh toán khi nhận hàng (COD) toàn quốc, anh/chị được kiểm tra hàng trước khi thanh toán ạ."],
    ["Vận chuyển & thanh toán", "/doi_tra", "Chính sách đổi trả 7 ngày", "Anh/chị được đổi/trả trong 7 ngày nếu sản phẩm lỗi hoặc chưa sử dụng, còn nguyên tem mác ạ."],
]

# Trường dữ liệu theo module (prototype cfData L7733): kiểu map sang enum Blueprint §2 custom_field_def; vai trò "Quản trị" → owner.
FT = {"Text": "text", "Phone": "phone", "Email": "email", "Select": "picklist", "Currency": "currency", "Date": "date", "Paragraph": "textarea", "Number": "number"}
PL = ["list", "kanban", "form", "filter", "detail", "export"]
ALL_ON = "111111"
FIELDS = {
    "contact": [
        ["full_name", "Họ tên", "Text", "", 1, 0, 1, ALL_ON, [], ""],
        ["phone", "Số điện thoại", "Phone", "", 1, 0, 1, "101111", [], ""],
        ["email", "Email", "Email", "", 0, 0, 1, "101111", [], ""],
        ["kind", "Phân loại", "Select", "Cá nhân/Doanh nghiệp", 0, 0, 0, ALL_ON, [], ""],
        ["tax_code", "Mã số thuế", "Text", "", 0, 0, 0, "001011", ["owner", "manager"], "Hiển thị khi Phân loại = Doanh nghiệp"],
        ["tier", "Tier khách", "Select", "VIP/Gold/Regular", 0, 0, 0, ALL_ON, [], ""],
        ["ltv", "LTV dự kiến", "Currency", "", 0, 0, 0, "001011", ["owner", "manager"], ""],
        ["birthday", "Ngày sinh", "Date", "", 0, 0, 0, "001011", [], ""],
        ["ai_note", "Ghi chú AI", "Paragraph", "", 0, 1, 0, "001010", [], ""],
    ],
    "ticket": [
        ["title", "Tiêu đề", "Text", "", 1, 0, 1, ALL_ON, [], ""],
        ["priority", "Mức ưu tiên", "Select", "Cao/Trung bình/Thấp", 1, 0, 1, ALL_ON, [], ""],
        ["kind", "Loại yêu cầu", "Select", "Sự cố/Yêu cầu/Khiếu nại", 0, 0, 0, ALL_ON, [], ""],
        ["sla", "SLA cam kết", "Number", "", 0, 0, 0, "001011", ["owner", "manager"], ""],
        ["product", "Sản phẩm liên quan", "Text", "", 0, 0, 0, "001011", [], ""],
        ["ai_summary", "AI tóm tắt", "Paragraph", "", 0, 1, 0, "000010", [], ""],
    ],
    "order": [
        ["code", "Mã đơn", "Text", "", 1, 0, 1, ALL_ON, [], ""],
        ["amount", "Giá trị đơn", "Currency", "", 1, 0, 1, ALL_ON, [], ""],
        ["pay_status", "Trạng thái TT", "Select", "Đã thanh toán/Đã cọc/Chờ cọc", 0, 0, 0, ALL_ON, [], ""],
        ["pay_method", "Phương thức", "Select", "Chuyển khoản/Tiền mặt/COD", 0, 0, 0, "001111", [], ""],
        ["coupon", "Mã giảm giá", "Text", "", 0, 0, 0, "001011", [], ""],
    ],
    "product": [
        ["name", "Tên sản phẩm", "Text", "", 1, 0, 1, ALL_ON, [], ""],
        ["category", "Danh mục", "Select", "Liệu trình/Combo/Gói năm/Dịch vụ lẻ", 1, 0, 0, ALL_ON, [], ""],
        ["price", "Giá niêm yết", "Currency", "", 1, 0, 1, "101111", [], ""],
        ["duration", "Thời lượng", "Number", "", 0, 0, 0, "001011", [], "Hiển thị khi Danh mục = Liệu trình"],
        ["warranty", "Bảo hành", "Text", "", 0, 0, 0, "001011", [], ""],
    ],
}


def field_rows(rows):
    return [
        {"key": k, "label": n, "type": FT[t], "options": o, "required": bool(r), "ai": bool(a), "sys": bool(sy),
         "visible_in": {p: v == "1" for p, v in zip(PL, vis)}, "roles": roles, "condition": c}
        for k, n, t, o, r, a, sy, vis, roles, c in rows
    ]


ROLE_COLORS = {"owner": "#DC2626", "manager": "#7C3AED", "sales": "#2DC56A", "cs": "#F59E0B", "accountant": "#2563EB"}


def build():
    return {
        "now": NOW,
        "workspace": WORKSPACE,
        "workspaces": [
            {"name": n, "id": i, "plan": p, "seats": s, "color": c, "current": cur} for n, i, p, s, c, cur in WORKSPACES
        ],
        "members": [
            {"id": i, "name": n, "email": e, "role": r, "dept": d, "color": c, "last": l, "status": st}
            for i, n, e, r, d, c, l, st in MEMBERS
        ],
        "member_total": 12,
        "seat_limit": 15,
        "role_colors": ROLE_COLORS,
        "channels": [
            {"type": t, "name": n, "short": sh, "color": c, "connected": on, "account": acc, "convs": cv, "frt": frt,
             "health": h, "agent": ag, "group": g, "label": lb, "available": av}
            for t, n, sh, c, on, acc, cv, frt, h, ag, g, lb, av in CHANNELS
        ],
        "widget": WIDGET,
        "connectors": [
            {"key": k, "name": n, "group": g, "color": c, "status": st, "connected": on, "opens": op, "fields": f, "interest": False}
            for k, n, g, c, st, on, op, f in CONNECTORS
        ],
        "tags": [
            {"id": i, "name": n, "color": c, "emoji": "", "description": "", "count": cnt, "created_by": "Ngọc Mai", "source": "user",
             "created_at": TAG_AT, "updated_by": None, "updated_at": TAG_AT}
            for i, n, c, cnt in TAGS
        ],
        "tag_palette": TAG_PALETTE,
        "replies": [
            {"id": f"rp_{k + 1}", "category": g, "shortcut": sc, "title": n, "body": b} for k, (g, sc, n, b) in enumerate(REPLIES)
        ],
        "fields": {e: field_rows(rows) for e, rows in FIELDS.items()},
        **build_ai(),
        **build_ops(),
    }


if __name__ == "__main__":
    out = os.path.join(os.path.dirname(__file__), "..", "..", "..", "fixtures", "prototype-parity", "settings.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(build(), f, ensure_ascii=False, indent=2)
        f.write("\n")
