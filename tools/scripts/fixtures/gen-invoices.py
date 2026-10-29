# Sinh fixtures/prototype-parity/invoices.json từ prototype invRows / ivDetail / invStats L11385–11418.
# Ngoại lệ theo COMMERCE-DECISIONS §5 (thắng prototype): "Hóa đơn" → "Đề nghị thanh toán" (mã TT-00xxxx, tên kỹ thuật invoice);
# trạng thái draft / sent / partial / paid / overdue / void; ngày dời về trước ngày mock 24/06/2026 để "Quá hạn" đúng nghĩa;
# thêm tài khoản nhận tiền (VietQR) + 2 giao dịch ngân hàng "Cần đối soát" (thiếu mã / sai số tiền).
import json

OWNER = {"Minh": "u_minh", "Trâm": "u_tram", "Khoa": "u_khoa", "Hương": "u_huong"}
CONTACT = {"Chị Lan Nguyễn": "ct_lan", "Phương Vy": "ct_vy", "Anh Dũng": "ct_dung", "Cty Bảo An": "ct_baoan", "Mai Anh": "ct_maianh"}
PHONE = {"ct_lan": "0903 123 456", "ct_vy": "0978 456 789", "ct_dung": "0912 345 678", "ct_baoan": "028 7300 5588", "ct_maianh": "0934 222 111"}
# code, khách, nội dung, giá trị, trạng thái, ngày phát hành, người lập, hạn, đã thu
RAW = [
    ["2041", "Chị Lan Nguyễn", "Combo HIFU 8 buổi", 18500000, "paid", "2026-06-20", "Trâm", "2026-06-27", 18500000],
    ["2040", "Cty Bảo An", "Dịch vụ AI 12 tháng", 48000000, "sent", "2026-06-18", "Minh", "2026-07-02", 0],
    ["2039", "Anh Dũng", "Gói triệt lông năm", 22000000, "overdue", "2026-06-02", "Khoa", "2026-06-12", 10000000],
    ["2038", "Phương Vy", "Chăm sóc da mặt", 9500000, "paid", "2026-05-28", "Trâm", "2026-06-04", 9500000],
    ["2037", "Mai Anh", "Gói chăm sóc 3 tháng", 6200000, "draft", "2026-06-15", "Hương", None, 0],
]
AI = {
    "paid": ["Đề nghị đã thu đủ. Khách thanh toán đúng hạn — đủ điều kiện gợi ý gói gia hạn.", ["Gợi ý gói gia hạn", "Gửi khảo sát hài lòng"]],
    "sent": ["Khả năng thanh toán đúng hạn 78%. Khách doanh nghiệp thường thanh toán vào 3 ngày cuối kỳ.", ["Gửi nhắc trước hạn 3 ngày", "Hẹn lịch gọi xác nhận"]],
    "overdue": ["Quá hạn 12 ngày, còn 12.000.000đ. Rủi ro nợ khó đòi trung bình — nên nhắc qua Zalo và gọi trực tiếp.", ["Gửi nhắc công nợ qua Zalo", "Giao AI Agent nhắc công nợ", "Tạo ticket thu hồi"]],
    "draft": ["Đề nghị còn ở dạng nháp — chưa gửi khách.", ["Hoàn tất và gửi khách"]],
}


def ts(d, hm="09:00"):
    return f"{d}T{hm}:00+07:00"


invoices = []
for code, cust, svc, value, st, at, by, due, paid in RAW:
    cid = CONTACT[cust]
    payments, events = [], [{"type": "created", "at": ts(at), "actor": by}]
    if st != "draft":
        events.append({"type": "sent", "at": ts(at, "09:05"), "actor": by, "channel": "zalo_personal"})
    if st == "paid":
        payments.append({"id": f"pay_{code}_1", "kind": "payment", "amount": str(value), "method": "bank_transfer",
                         "reference": f"FT26{code}771", "status": "confirmed", "at": ts(at, "15:30"), "by": "system",
                         "receipt_code": f"PT-00{code}1", "auto": True})
    if st == "overdue":
        payments.append({"id": f"pay_{code}_1", "kind": "payment", "amount": str(paid), "method": "bank_transfer",
                         "reference": f"FT26{code}402", "status": "confirmed", "at": ts("2026-06-05", "10:12"), "by": "system",
                         "receipt_code": f"PT-00{code}1", "auto": True})
        events.append({"type": "reminded", "at": ts("2026-06-13", "08:00"), "actor": "system", "channel": "zalo_personal"})
    for p in payments:
        events.append({"type": "payment", "at": p["at"], "actor": p["by"], "amount": p["amount"]})
    invoices.append({
        "id": "inv_" + code, "code": "TT-00" + code, "transfer_code": "TT00" + code,
        "order_id": None, "order_code": "", "kind": "full",
        "contact_id": cid, "contact_name": cust, "phone": PHONE[cid],
        "owner_user_id": OWNER[by], "owner_name": by, "title": svc,
        "amount": str(value), "paid_amount": str(paid), "status": st,
        "issued_at": ts(at), "due_date": due or "", "sent_at": ts(at, "09:05") if st != "draft" else "",
        "void_reason": "", "payments": payments, "events": events,
        "ai": {"text": AI[st][0], "acts": AI[st][1]},
    })

out = {
    "invoices": invoices,
    # Tài khoản nhận tiền của DN (payment_account — Cài đặt › Thanh toán) — nguồn VietQR.
    "payment_account": {"bank": "Vietcombank", "bin": "970436", "account_no": "0071000123456",
                        "account_name": "CONG TY TNHH AN NHIEN SPA"},
    # Giao dịch ngân hàng khớp không chắc chắn → hàng "Cần đối soát" (COMMERCE §5).
    "bank_txs": [
        {"id": "btx_881", "amount": "6200000", "content": "CK MAI ANH GOI CHAM SOC", "occurred_at": ts("2026-06-23", "16:20"),
         "provider": "sepay", "reason": "missing_code", "suggested_invoice_id": "inv_2037", "status": "needs_review"},
        {"id": "btx_882", "amount": "5000000", "content": "TT002039 ANH DUNG DOT 2", "occurred_at": ts("2026-06-24", "08:41"),
         "provider": "sepay", "reason": "amount_mismatch", "suggested_invoice_id": "inv_2039", "status": "needs_review"},
    ],
    "crm": {"total": 4, "on_time": "75%"},
    "files": [
        {"name": "Đề nghị thanh toán.pdf", "ext": "pdf", "by": "system", "at": "2026-06-20", "size": "84 KB"},
        {"name": "Bill chuyển khoản.png", "ext": "png", "by": "customer", "at": "2026-06-20", "size": ""},
    ],
}
with open("fixtures/prototype-parity/invoices.json", "w", encoding="utf8") as f:
    json.dump(out, f, ensure_ascii=False, indent=2)
    f.write("\n")
