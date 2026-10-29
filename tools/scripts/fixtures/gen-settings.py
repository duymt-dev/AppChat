# Sinh fixtures/prototype-parity/settings.json từ prototype Cài đặt (L5754–7421, state L7674–7871, renderVals L9810–10760).
# Chỉnh theo quyết định (thắng prototype):
# - 5 vai trò hệ thống Blueprint §3.5 (owner / manager / sales / cs / accountant) thay 6 vai trò mẫu; vai trò chỉ đọc ở P0 (D27);
# - mục Cài đặt OUT ẩn (prototype-parity §6); kênh chỉ theo manifest (Zalo cá nhân, Website, Email); connector theo manifest, còn lại "Sắp có" (D28);
# - AI Models hiện mức AI, không tên model (D29); bỏ "tự nạp" ví và "tự chuyển model tiết kiệm".
import json
import os

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
    }


if __name__ == "__main__":
    out = os.path.join(os.path.dirname(__file__), "..", "..", "..", "fixtures", "prototype-parity", "settings.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(build(), f, ensure_ascii=False, indent=2)
        f.write("\n")
