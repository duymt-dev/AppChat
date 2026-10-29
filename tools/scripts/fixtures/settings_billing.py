# Dữ liệu Gói & thanh toán + Ví AppChat + popup Nâng cấp / Nạp credit (prototype L5947–5990, L6463–6610, L905–1030; renderVals
# L7873–7885, L9829–9950, L10018–10027) cho gen-settings.py.
# Chỉnh theo quyết định (thắng prototype):
# - Ví tính bằng credit (REQ-L01, Blueprint §2.2 credit_wallet = credit gói + credit mua thêm), không phải số dư VND;
# - bỏ "tự nạp" (REQ-L07, COMMERCE §10) → nhắc khi đã dùng 80% / 95%; bỏ "hết credit tự chuyển model tiết kiệm" → chặn AI (D09);
# - chỉ VietQR / chuyển khoản (COMMERCE §10): lịch sử ví bỏ VNPAY / MoMo; trạng thái hoá đơn theo billing_invoice
#   (pending / pending_review / paid / expired / cancelled);
# - gói và bảng so sánh bỏ hạng mục OUT (Gọi điện, Workflow, Báo cáo, ZBS / SMS, white-label, API) — prototype-parity §6;
# - mua thêm chỉ credit + tài nguyên (người dùng, kênh) — billing_invoice.kind plan | credits | addon.

PLANS = {
    "personal": [
        ["free", "Miễn phí", "0", "", "Bắt đầu trải nghiệm AppChat", False,
         ["1 người dùng", "1 kênh kết nối", "1 AI Agent", "500 credit / tháng", "CRM cơ bản · 500 liên hệ", "Hỗ trợ cộng đồng"]],
        ["personal", "Cá nhân", "2030000", "year", "Cá nhân hoá & bán hàng đa kênh", False,
         ["1 người dùng", "3 kênh kết nối", "AI tiêu chuẩn + nâng cao", "3.000 credit / tháng", "CRM + pipeline + báo giá", "Tickets cơ bản · Quick-reply"]],
        ["personal_pro", "Cá nhân Pro", "5090000", "year", "Toàn bộ sức mạnh cho cá nhân", True,
         ["1 người dùng", "8 kênh kết nối", "AI toàn bộ cấp độ", "10.000 credit / tháng", "Marketing + Loyalty", "Ưu tiên hỗ trợ 24/7"]],
        ["personal_max", "Cá nhân Max", "10190000", "year", "Cá nhân chuyên nghiệp tối đa", False,
         ["1 người dùng", "19 kênh kết nối", "AI toàn bộ cấp độ", "25.000 credit / tháng", "AI Governance + RAG mở rộng", "Hỗ trợ ưu tiên cao nhất"]],
    ],
    "business": [
        ["team", "Team", "5900000", "month", "Đội nhóm nhỏ bắt đầu đa kênh", False,
         ["5 người dùng", "5 kênh kết nối", "2 AI Agent", "20.000 credit / tháng", "CRM + Loyalty đầy đủ", "Hỗ trợ trong giờ"]],
        ["business", "Business", "12900000", "month", "Vận hành chuyên nghiệp đa phòng ban", True,
         ["8 người dùng", "10 kênh kết nối", "5 AI Agent", "50.000 credit / tháng", "Marketing + phân khúc", "Hỗ trợ ưu tiên"]],
        ["ultimate", "Ultimate", "24900000", "month", "Toàn bộ năng lực cho doanh nghiệp", False,
         ["15 người dùng", "Kênh không giới hạn", "AI Agent không giới hạn", "200.000 credit / tháng", "AI Governance + RAG mở rộng", "CSM riêng · SLA 99.9%"]],
        ["enterprise", "Enterprise", None, "", "Triển khai riêng theo nhu cầu", False,
         ["User tuỳ chỉnh", "Hạ tầng riêng", "AI Governance ISO 42001", "Credit tuỳ chỉnh", "Tích hợp sâu ERP", "CSM + onsite"]],
    ],
}

# nhóm → [tính năng, 4 cột Cá nhân, 4 cột Doanh nghiệp]
COMPARE = [
    ["platform", [
        ["Người dùng", ["1", "1", "1", "1"], ["5", "8", "15", "Tuỳ chỉnh"]],
        ["Kênh kết nối", ["1", "3", "8", "19"], ["5", "10", "Không giới hạn", "Không giới hạn"]],
        ["Phân quyền vai trò", ["—", "—", "✓", "✓"], ["✓", "✓", "✓", "✓"]],
        ["Nền tảng kết nối", ["—", "Cơ bản", "✓", "✓"], ["✓", "✓", "✓", "✓ + tuỳ biến"]],
    ]],
    ["dashboard", [
        ["Dashboard tổng quan", ["✓", "✓", "✓", "✓"], ["✓", "✓", "✓", "✓"]],
    ]],
    ["assistant", [
        ["Chat ra lệnh nghiệp vụ", ["✓", "✓", "✓", "✓"], ["✓", "✓", "✓", "✓"]],
        ["Gợi ý xử lý theo ngữ cảnh", ["—", "✓", "✓", "✓"], ["✓", "✓", "✓", "✓"]],
        ["Phiên trò chuyện & nhật ký", ["✓", "✓", "✓", "✓"], ["✓", "✓", "✓", "✓"]],
    ]],
    ["inbox", [
        ["Hộp thư hợp nhất đa kênh", ["✓", "✓", "✓", "✓"], ["✓", "✓", "✓", "✓"]],
        ["Gán & phân luồng hội thoại", ["—", "✓", "✓", "✓"], ["✓", "✓", "✓", "✓"]],
        ["Quick-reply / mẫu trả lời", ["Cơ bản", "✓", "✓", "✓"], ["✓", "✓", "✓", "✓"]],
    ]],
    ["crm", [
        ["Liên hệ (CRM)", ["500", "Pipeline", "Nâng cao", "Không giới hạn"], ["✓", "✓", "✓", "✓"]],
        ["Báo giá · Hợp đồng · Đơn", ["—", "✓", "✓", "✓"], ["✓", "✓", "✓", "✓"]],
        ["Sản phẩm", ["—", "✓", "✓", "✓"], ["✓", "✓", "✓", "✓"]],
        ["Loyalty", ["—", "—", "✓", "✓"], ["✓", "✓", "✓", "✓"]],
    ]],
    ["tickets", [
        ["Tạo & xử lý ticket", ["Cơ bản", "✓", "✓", "✓"], ["✓", "✓", "✓", "✓"]],
        ["SLA & leo thang", ["—", "✓", "✓", "✓"], ["✓", "✓", "✓", "✓"]],
    ]],
    ["marketing", [
        ["Email Marketing", ["—", "✓", "✓", "✓"], ["✓", "✓", "✓", "✓"]],
        ["Phân khúc khách hàng", ["—", "✓", "✓", "✓"], ["—", "✓", "✓", "✓"]],
    ]],
    ["booking", [
        ["Đặt & quản lý lịch hẹn", ["—", "✓", "✓", "✓"], ["✓", "✓", "✓", "✓"]],
        ["Nhắc lịch tự động", ["—", "✓", "✓", "✓"], ["✓", "✓", "✓", "✓"]],
    ]],
    ["agents", [
        ["Số AI Agent", ["1", "2", "5", "Không giới hạn"], ["2", "5", "Không giới hạn", "Không giới hạn"]],
        ["Mức AI", ["Tiêu chuẩn", "Tiêu chuẩn + Nâng cao", "Toàn bộ", "Toàn bộ"], ["Toàn bộ", "Toàn bộ", "Toàn bộ", "Toàn bộ"]],
        ["Credit / tháng", ["500", "3.000", "10.000", "25.000"], ["20.000", "50.000", "200.000", "Tuỳ chỉnh"]],
        ["AI Governance", ["—", "—", "✓", "✓"], ["—", "Cơ bản", "✓", "✓ + audit"]],
    ]],
    ["service", [
        ["Kênh hỗ trợ", ["Cộng đồng", "Trong giờ", "24/7", "Ưu tiên cao"], ["Trong giờ", "Ưu tiên", "CSM riêng", "CSM + onsite"]],
        ["SLA cam kết", ["—", "—", "99.5%", "99.5%"], ["99%", "99.5%", "99.9%", "99.95%"]],
    ]],
]

CREDIT_PACKS = [["credit_500", 500, "500000", 0, False], ["credit_1000", 1050, "1000000", 5, True],
                ["credit_2000", 2200, "2000000", 10, False], ["credit_5000", 5750, "5000000", 15, False]]
ADDONS = [["addon_user", "user", "150000", "month"], ["addon_channel", "channel", "200000", "month"]]

# mã, mô tả, ngày, số tiền, phương thức, trạng thái
# mã, mô tả, ngày, số tiền, phương thức, trạng thái, loại, mặt hàng
INVOICES = [
    ["INV-2026-0612", "Ultimate · 12 tháng", "2025-12-20", "90000000", "bank_transfer", "paid", "plan", "ultimate"],
    ["INV-2026-0588", "Mua thêm 5 người dùng", "2026-04-12", "9000000", "qr", "paid", "addon", "addon_user"],
    ["INV-2026-0541", "Nạp 5.750 credit", "2026-03-01", "5000000", "qr", "paid", "credit", "credit_5000"],
    ["INV-2026-0712", "Nạp 2.200 credit", "2026-06-05", "2000000", "bank_transfer", "pending", "credit", "credit_2000"],
    ["INV-2026-0488", "Mua thêm 3 kênh kết nối", "2026-02-14", "1800000", "qr", "paid", "addon", "addon_channel"],
    ["INV-2025-1102", "Business · 6 tháng (gói cũ)", "2025-06-20", "23400000", "bank_transfer", "paid", "plan", "business"],
    ["INV-2025-0931", "Nạp 1.050 credit", "2025-09-02", "1000000", "qr", "expired", "credit", "credit_1000"],
]

# thời điểm, nội dung, loại (credit_ledger.kind), nguồn, delta credit
LEDGER = [
    ["2026-06-28T14:20:00+07:00", "Nạp 2.200 credit · INV-2026-0627", "topup", "VietQR", 2200],
    ["2026-06-27T09:12:00+07:00", "AI trả lời hội thoại · 4.120 token", "usage", "Hộp thư", -37],
    ["2026-06-26T16:40:00+07:00", "Chiến dịch email · 1.200 người nhận", "usage", "Marketing", -120],
    ["2026-06-25T11:05:00+07:00", "Trợ lý AI · soạn báo giá", "usage", "Trợ lý AI", -18],
    ["2026-06-24T08:30:00+07:00", "Nạp 1.050 credit · INV-2026-0624", "topup", "Chuyển khoản", 1050],
    ["2026-06-01T00:00:00+07:00", "Cấp credit gói Ultimate · tháng 6", "grant", "Gói", 1200],
]


def build_billing():
    plans = {
        seg: [{"key": k, "name": n, "price": p, "period": per, "desc": d, "popular": pop, "features": f} for k, n, p, per, d, pop, f in rows]
        for seg, rows in PLANS.items()
    }
    return {
        "billing": {
            "current": {"plan_key": "ultimate", "plan_name": "Ultimate", "status": "active", "activated_at": "2025-12-20",
                        "expires_at": "2026-12-20", "days_left": 192, "period_pct": 62,
                        "users": {"used": 12, "max": 15}, "channels": {"used": 9, "max": 12},
                        "credits_month": 200000},
            "plans": plans,
            "compare": [{"group": g, "rows": [{"feature": f, "personal": a, "business": b} for f, a, b in rows]} for g, rows in COMPARE],
            "credit_packs": [{"key": k, "credits": c, "price": p, "bonus": b, "popular": pop} for k, c, p, b, pop in CREDIT_PACKS],
            "addons": [{"key": k, "kind": kind, "price": p, "period": per} for k, kind, p, per in ADDONS],
            "invoices": [{"id": i, "code": i, "desc": d, "date": dt, "amount": a, "method": m, "status": s, "kind": k, "item": it}
                         for i, d, dt, a, m, s, k, it in INVOICES],
            "bank": {"bank": "Vietcombank — CN HCM", "account_no": "0071 000 888 999", "account_name": "CTY CP MEDIASOFT VN"},
            "vat": {"tax_code": "0314783952", "legal_name": "MediaSoft Vietnam Corp.", "address": "81 Cách Mạng Tháng 8, Q.1, TP.HCM",
                    "email": "admin@mediasoft.vn"},
        },
        "wallet": {
            "plan_balance": 101150, "topup_balance": 2450, "days_estimate": 18, "low_alert": True,
            "ledger": [{"id": f"cl_{k + 1}", "at": at, "desc": d, "kind": kind, "source": s, "delta": dl}
                       for k, (at, d, kind, s, dl) in enumerate(LEDGER)],
        },
    }
