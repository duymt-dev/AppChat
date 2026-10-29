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
    }


if __name__ == "__main__":
    out = os.path.join(os.path.dirname(__file__), "..", "..", "..", "fixtures", "prototype-parity", "settings.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(build(), f, ensure_ascii=False, indent=2)
        f.write("\n")
