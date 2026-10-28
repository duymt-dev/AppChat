# Sinh fixtures/prototype-parity/contracts.json từ prototype state.contracts L7795 + ctStats / ctDetail / ctAiRun L8088, L9466–9485.
# Ngoại lệ theo COMMERCE-DECISIONS §9 (thắng prototype): trạng thái pending → pending_signature; "Ký số" → "Ký điện tử";
# loại HĐ theo i % 3 (service / sale / framework); báo giá liên quan BG-(2040+i); có token ký công khai cho HĐ chờ ký.
import json

OWNER = {"Minh": "u_minh", "Trâm": "u_tram", "Khoa": "u_khoa", "Hương": "u_huong"}
CONTACT = {"Chị Lan": "ct_lan", "Phương Vy": "ct_vy", "Anh Dũng": "ct_dung", "Cty Bảo An": "ct_baoan", "Mai Anh": "ct_maianh"}
KINDS = ["service", "sale", "framework"]
HINTS = [
    ["Nên chăm sóc lại — 18 ngày chưa liên hệ", False],
    ["Gửi ưu đãi giữ chân khách", False],
    ["Nhắc thanh toán / theo dõi đơn", True],
    ["Đề xuất upsell combo phù hợp", False],
    ["Phản hồi gấp theo SLA", False],
]
ST = {"signed": "signed", "pending": "pending_signature", "draft": "draft", "expired": "expired"}
RAW = [
    ["HĐ-1180", "Chị Lan", "0903 123 456", "signed", "12800000", "Liệu trình HIFU 8 buổi", "Minh", "2026-06-16", "2026-06-16", "2026-12-16"],
    ["HĐ-1181", "Phương Vy", "0978 456 789", "pending", "9500000", "Combo chăm sóc da mặt", "Trâm", "2026-06-17", None, None],
    ["HĐ-1182", "Anh Dũng", "0912 345 678", "draft", "22000000", "Gói triệt lông năm", "Khoa", "2026-06-18", None, None],
    ["HĐ-1179", "Cty Bảo An", "028 7300 5588", "signed", "48000000", "Dịch vụ AI 12 tháng", "Minh", "2026-06-02", "2026-06-02", "2027-06-02"],
    ["HĐ-1178", "Mai Anh", "0934 222 111", "expired", "6200000", "Gói chăm sóc 3 tháng", "Hương", "2026-03-10", "2026-03-10", "2026-06-10"],
]

def ts(d, hm="09:00"):
    return f"{d}T{hm}:00+07:00"

contracts = []
for i, (code, cust, phone, st, value, svc, by, at, start, end) in enumerate(RAW):
    n = code.split("-")[1]
    status = ST[st]
    signed = status in ("signed", "expired")
    events = [{"type": "created_from_quote", "at": ts(at, "08:30"), "actor": by}]
    if status != "draft":
        events += [
            {"type": "submitted", "at": ts(at, "08:40"), "actor": by},
            {"type": "approved_signed", "at": ts(at, "08:50"), "actor": "Chủ sở hữu"},
            {"type": "sent", "at": ts(at, "09:00"), "actor": by},
        ]
    if signed:
        events += [
            {"type": "opened", "at": ts(at, "10:05"), "actor": cust},
            {"type": "otp_ok", "at": ts(at, "10:07"), "actor": cust},
            {"type": "signed", "at": ts(at, "10:08"), "actor": cust},
        ]
    if status == "expired":
        events.append({"type": "expired", "at": ts(end, "00:00"), "actor": "system"})
    contracts.append({
        "id": "ctr_" + n,
        "code": code,
        "number": f"{n}/2026/HĐDV" if KINDS[i % 3] == "service" else "",
        "kind": KINDS[i % 3],
        "contact_id": CONTACT[cust],
        "contact_name": cust,
        "phone": phone,
        "quote_id": None,
        "quote_code": f"BG-{2040 + i}",
        "title": svc,
        "value": value,
        "signed_date": at,
        "start_date": start,
        "end_date": end,
        "owner_user_id": OWNER[by],
        "owner_name": by,
        "status": status,
        "created_at": ts(at, "08:30"),
        "sent_at": ts(at, "09:00") if status != "draft" else None,
        "signed_by_customer_at": ts(at, "10:08") if signed else None,
        "sign_token": f"tk_{n}_demo" if status == "pending_signature" else None,
        "sign_link_expires_at": "2026-06-24T15:00:00+07:00" if status == "pending_signature" else None,
        "otp_fails": 0,
        "signed_sha256": None,
        "renewal_of_id": None,
        "terminated_reason": "",
        "note": "",
        "file_name": "",
        "events": events,
        "ai": {"hint": HINTS[i][0], "wait": HINTS[i][1]},
    })

out = {
    "contracts": contracts,
    "crm": {"ltv": "86500000", "total": 4, "tier": "Kim cương", "debt": "0",
            "others": [{"code": "HĐ-1102", "title": "HIFU 4 buổi", "value": "6400000"},
                       {"code": "HĐ-1044", "title": "Combo da", "value": "9500000"}]},
    "insight": "Hợp đồng hiệu lực tốt, khách hạng Kim cương — xác suất gia hạn ~82%. Đề xuất chào gói nâng cấp trước khi hết hạn 30 ngày.",
    "suggestions": ["Đặt nhắc gia hạn trước 30 ngày", "Gửi khảo sát hài lòng sau ký"],
    "files": [
        {"name": "Hợp đồng dịch vụ đã ký.pdf", "ext": "pdf", "by": "esign", "at": "2026-10-23", "size": "320 KB"},
        {"name": "Phụ lục bảng giá.xlsx", "ext": "xlsx", "by": "Trâm", "at": "2026-10-22", "size": "48 KB"},
        {"name": "CCCD đại diện.jpg", "ext": "jpg", "by": "customer", "at": "2026-10-21", "size": ""},
    ],
    "ai_runs": {
        "risk": "Rà soát 5 hợp đồng: HĐ-1178 (Mai Anh) đã hết hạn 10/06 — đề xuất gia hạn kèm ưu đãi -10%. HĐ-1181 (Phương Vy) chờ ký quá 24h, nên nhắc lại.",
        "draft": "Đã soạn dự thảo hợp đồng từ báo giá đã duyệt: thông tin bên A/B, phạm vi dịch vụ, giá trị, điều khoản thanh toán 50% cọc, hiệu lực 6 tháng. Bấm \"Tạo hợp đồng\" để lưu nháp.",
        "renew": "2 hợp đồng sắp hết hạn trong 30 ngày (Cty Bảo An còn 11 tháng — chưa cần; Mai Anh đã hết). Đề xuất chiến dịch gia hạn qua Zalo / Email.",
        "analyze": "Tổng giá trị hợp đồng đang hiệu lực: 60.8tr. Tỉ lệ ký thành công 68%. Hợp đồng rớt chủ yếu do chậm gửi ký — đề xuất bật nhắc tự động sau 24h.",
    },
}
with open("fixtures/prototype-parity/contracts.json", "w", encoding="utf8") as f:
    json.dump(out, f, ensure_ascii=False, indent=2)
    f.write("\n")
