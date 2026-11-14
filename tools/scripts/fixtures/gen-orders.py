# Sinh fixtures/prototype-parity/orders.json từ prototype state.orders L7788 + odStats / odDetail / odAiRun L8081, L9487–9512.
# Ngoại lệ theo COMMERCE-DECISIONS (thắng prototype): đơn có 2 trục (§4) — `st` của prototype tách thành status (tiến độ)
# + thanh toán suy ra từ paid_total / cọc; thuế 0% để giá trị đơn khớp prototype; thêm 1 đơn từ sàn (D31 — badge nguồn, khoá dòng hàng);
# mã đơn `DH-{n}` (D52 — bỏ tiền tố SP của prototype, trùng mã sản phẩm), giữ số để đối chiếu.
import json

OWNER = {"Minh": "u_minh", "Trâm": "u_tram", "Khoa": "u_khoa", "Hương": "u_huong"}
CONTACT = {"Chị Lan": "ct_lan", "Phương Vy": "ct_vy", "Anh Dũng": "ct_dung", "Cty Bảo An": "ct_baoan", "Mai Anh": "ct_maianh"}
HINTS = [
    ["Nên chăm sóc lại — 18 ngày chưa liên hệ", False],
    ["Gửi ưu đãi giữ chân khách", False],
    ["Nhắc thanh toán / theo dõi đơn", True],
    ["Đề xuất upsell combo phù hợp", False],
    ["Phản hồi gấp theo SLA", False],
    ["Đặt lịch follow-up tuần này", False],
]
# code, khách, sđt, status, giá trị, dịch vụ, người tạo, ngày, đã thu, cọc yêu cầu, kênh
RAW = [
    ["DH-290411", "Chị Lan", "0903 123 456", "processing", 12800000, "HIFU 8 buổi", "Minh", "2026-06-24T09:10:00+07:00", 6400000, 6400000, "zalo_personal"],
    ["DH-290410", "Mai Anh", "0934 222 111", "completed", 4200000, "Triệt lông nách", "Hương", "2026-06-24T08:20:00+07:00", 4200000, 0, "webchat"],
    ["DH-290409", "Phương Vy", "0978 456 789", "new", 9500000, "Combo da mặt", "Trâm", "2026-06-23T15:40:00+07:00", 0, 2850000, "zalo_personal"],
    ["DH-290408", "Cty Bảo An", "028 7300 5588", "completed", 48000000, "Gói AI 12 tháng", "Minh", "2026-06-22T10:00:00+07:00", 48000000, 0, "email"],
    ["DH-290407", "Anh Dũng", "0912 345 678", "cancelled", 22000000, "Gói triệt lông năm", "Khoa", "2026-06-20T14:30:00+07:00", 0, 0, "zalo_personal"],
]

orders = []
for i, (code, cust, phone, status, value, svc, by, at, paid, dep, channel) in enumerate(RAW):
    ev = [{"type": "created", "at": at, "actor": by}]
    if status in ("processing", "completed"):
        ev.append({"type": "confirmed", "at": at, "actor": by})
    if paid:
        ev.append({"type": "deposit" if paid < value else "paid", "at": at, "actor": "system", "amount": str(paid)})
    if status == "completed":
        ev.append({"type": "completed", "at": at, "actor": by, "points": value // 10000})
    if status == "cancelled":
        ev.append({"type": "cancelled", "at": at, "actor": by, "reason": "Khách đổi ý"})
    orders.append({
        "id": "ord_" + code[3:], "code": code, "source": "manual", "channel": channel, "external": None,
        "locked_lines": False, "contact_id": CONTACT[cust], "contact_name": cust, "phone": phone,
        "owner_user_id": OWNER[by], "owner_name": by, "quote_id": None, "quote_code": "",
        "contract_id": None, "contract_code": "", "status": status,
        "deposit_required": dep > 0, "deposit_amount": str(dep), "paid_total": str(paid), "refund_pending": False,
        "items": [{"name": svc, "qty": 1, "unit_price": str(value), "tax_rate": 0}], "header_discount": None,
        "created_at": at, "cancel_reason": "Khách đổi ý" if status == "cancelled" else "",
        "points_earned": value // 10000 if status == "completed" else 0,
        "shipping": {"carrier": "", "tracking": "", "eta": "", "address": "", "receiver": "", "receiver_phone": ""},
        "note": "", "events": ev, "ai": {"hint": HINTS[i][0], "wait": HINTS[i][1]},
    })

# D31 — đơn từ sàn (Shopee) đã nhập qua OrderSyncProvider mock: dòng hàng khoá, thanh toán qua sàn, không tích điểm.
mk_at = "2026-06-19T11:05:00+07:00"
orders.append({
    "id": "ord_290405", "code": "DH-290405", "source": "marketplace", "channel": "marketplace",
    "external": {"platform": "shopee", "external_id": "240619SHP7731", "platform_status": "READY_TO_SHIP"},
    "locked_lines": True, "contact_id": "ct_shopee_7731", "contact_name": "Khách Shopee ***31", "phone": "",
    "owner_user_id": "u_tram", "owner_name": "Trâm", "quote_id": None, "quote_code": "",
    "contract_id": None, "contract_code": "", "status": "processing",
    "deposit_required": False, "deposit_amount": "0", "paid_total": "690000", "refund_pending": False,
    "items": [{"name": "Serum phục hồi B5", "qty": 1, "unit_price": "690000", "tax_rate": 0}], "header_discount": None,
    "created_at": mk_at, "cancel_reason": "", "points_earned": 0,
    "shipping": {"carrier": "SPX Express", "tracking": "SPXVN0461177", "eta": "2026-06-26", "address": "", "receiver": "", "receiver_phone": ""},
    "note": "", "events": [
        {"type": "imported", "at": mk_at, "actor": "system"},
        {"type": "paid", "at": mk_at, "actor": "system", "amount": "690000"},
    ], "ai": {"hint": HINTS[5][0], "wait": HINTS[5][1]},
})

out = {
    "orders": orders,
    "crm": {"ltv": "86500000", "total": 14, "tier": "Kim cương", "points": 24800},
    "insight": "Khách hạng Kim cương, đơn giá trị cao. Đề xuất upsell combo dưỡng da (+3.2tr) và mời tham gia gói năm để tăng LTV.",
    "files": [
        {"name": "Đề nghị thanh toán.pdf", "ext": "pdf", "by": "system", "at": "2026-06-24", "size": "86 KB"},
        {"name": "Phiếu thu cọc.pdf", "ext": "pdf", "by": "Trâm", "at": "2026-06-24", "size": "42 KB"},
        {"name": "Ảnh chuyển khoản.jpg", "ext": "jpg", "by": "customer", "at": "2026-06-24", "size": ""},
    ],
    "ai_runs": {
        "risk": "Rà soát 6 đơn hàng: DH-290409 (Phương Vy) chờ cọc quá 24h — đề xuất nhắc đặt cọc kèm ưu đãi. DH-290407 đã huỷ — nên hỏi lý do để win-back.",
        "upsell": "AI gợi ý upsell: Chị Lan (HIFU 8 buổi) phù hợp combo dưỡng da 4 buổi (+3.2tr, xác suất 71%). Mai Anh nên mời gói năm.",
        "collect": "2 đơn đang chờ thanh toán (Chị Lan còn 6,4tr; Phương Vy chờ cọc 2,85tr). Đề xuất gửi đề nghị thanh toán kèm VietQR + nhắc sau 24h.",
        "analyze": "Doanh thu đã thu tháng này: 59,3tr. Tỉ lệ thanh toán đủ 64%. Đơn huỷ chủ yếu do chậm chốt cọc — đề xuất bật nhắc tự động.",
    },
}
with open("fixtures/prototype-parity/orders.json", "w", encoding="utf8") as f:
    json.dump(out, f, ensure_ascii=False, indent=2)
    f.write("\n")
