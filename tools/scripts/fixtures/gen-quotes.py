# Sinh fixtures/prototype-parity/quotes.json từ prototype state.quotes L7802 + quoteStats / qDetail L9401–9449.
# Ngoại lệ theo COMMERCE-DECISIONS (thắng prototype): không trừ điểm loyalty trên báo giá (§3); trạng thái theo §3
# (won → accepted, revision → revision_requested); thuế 8% đặt theo từng dòng; hiệu lực 15 ngày.
import json

OWNER = {"Minh": "u_minh", "Trâm": "u_tram", "Khoa": "u_khoa"}
HINTS = [
    ["Nên chăm sóc lại — 18 ngày chưa liên hệ", False],
    ["Gửi ưu đãi giữ chân khách", False],
    ["Nhắc thanh toán / theo dõi đơn", True],
]
RAW = [
    {
        "code": "BG-2041", "cust": "Chị Lan", "contact_id": "ct_lan", "phone": "0903 123 456", "st": "approved", "disc": 5,
        "note": "Khách VIP · ưu tiên", "by": "Minh", "at": "2026-06-24T09:42:00+07:00", "rev": 2, "old": True,
        "gift": "Tặng 1 buổi chăm sóc da", "items": [["HIFU nâng cơ", 8, "1500000", "Vùng mặt"], ["Chăm sóc da", 2, "400000", "Da dầu"]],
        "cmts": [["Sale · Minh", "Khách đồng ý nâng combo, chốt sớm", "2026-06-24T09:45:00+07:00"], ["Kế toán · Hà", "Đã trừ 120k điểm tích lũy, OK", "2026-06-24T10:10:00+07:00"]],
    },
    {
        "code": "BG-2040", "cust": "Phương Vy", "contact_id": "ct_vy", "phone": "0978 456 789", "st": "sent", "disc": 0,
        "note": "", "by": "Trâm", "at": "2026-06-24T08:18:00+07:00", "rev": 1, "old": False, "gift": "",
        "items": [["Combo da mặt", 1, "9500000", "Liệu trình 60 phút"]], "cmts": [],
    },
    {
        "code": "BG-2039", "cust": "Anh Dũng", "contact_id": "ct_dung", "phone": "0912 345 678", "st": "draft", "disc": 10,
        "note": "Cần duyệt chiết khấu", "by": "Khoa", "at": "2026-06-23T16:30:00+07:00", "rev": 3, "old": True, "gift": "",
        "items": [["Triệt lông toàn thân", 1, "22000000", "Gói 12 buổi"]],
        "cmts": [["QL · Trâm", "Chiết khấu 10% cần mình duyệt nhé", "2026-06-23T17:00:00+07:00"]],
    },
]

quotes = []
for i, q in enumerate(RAW):
    qid = "q_" + q["code"].split("-")[1]
    quotes.append({
        "id": qid,
        "code": q["code"],
        "version": q["rev"],
        "root_id": qid,
        "contact_id": q["contact_id"],
        "contact_name": q["cust"],
        "phone": q["phone"],
        "returning": q["old"],
        "owner_user_id": OWNER[q["by"]],
        "owner_name": q["by"],
        "status": q["st"],
        "items": [{"name": n, "variant": v, "qty": qty, "unit_price": p, "tax_rate": 8} for n, qty, p, v in q["items"]],
        "header_discount": {"kind": "pct", "value": q["disc"]} if q["disc"] else None,
        "valid_days": 15,
        "created_at": q["at"],
        "sent_at": q["at"] if q["st"] == "sent" else None,
        "note": q["note"],
        "gift": q["gift"],
        "payment_terms": "",
        "comments": [{"who": w, "text": t, "at": at} for w, t, at in q["cmts"]],
        "ai": {"hint": HINTS[i][0], "wait": HINTS[i][1]},
        "off_catalog": False,
        "converted": None,
    })

out = {
    "quotes": quotes,
    # quoteStats L9401: "Tỉ lệ chốt" là số phân tích (mock)
    "close_rate": "62%",
    "crm_stats": [["ltv", "86,5tr", "#16A34A"], ["orders", "14", "#2563EB"], ["quotes", "3", "#6E48E6"], ["close", "62%", "#C9820B"]],
    "timeline": [["sent", "2026-06-22T10:20:00+07:00", "#0068FF", "ic-inbox"], ["opened", "2026-06-23T09:05:00+07:00", "#6E48E6", "ic-mail"], ["call", "2026-06-23T14:30:00+07:00", "#2DC56A", "ic-phone"], ["ask", "2026-06-24T08:50:00+07:00", "#C9820B", "ic-doc"]],
    "todos": [["send", True, "yesterday"], ["call", True, "today"], ["price", False, "today"], ["contract", False, "none"]],
    "history": [["create", "#6B7280"], ["lines", "#2563EB"], ["send", "#0068FF"], ["open", "#6E48E6"], ["current", "#157A40"]],
    # quoteAiRun L8095 — kết quả mẫu của Trợ lý AI · Báo giá (mock, không gọi LLM)
    "ai_runs": {
        "sugg": "Dựa trên lịch sử Chị Lan (đã mua HIFU): đề xuất combo \"HIFU 8 buổi + Chăm sóc da 4 buổi\" giá 18.5tr (tiết kiệm 2.3tr). Tỉ lệ chốt dự kiến ~74%.",
        "followup": "Có 1 báo giá (Phương Vy · Combo da mặt 9.5tr) chờ phản hồi quá 3 ngày. Đề xuất gửi tin Zalo nhắc kèm ưu đãi -10% nếu chốt trong 48h.",
        "analyze": "Tỉ lệ chốt hiện 62%. Báo giá rớt chủ yếu do (1) giá cao hơn đối thủ ~8%, (2) chậm follow-up. Đề xuất: thêm mốc giá \"combo tiết kiệm\" và auto-nhắc sau 48h.",
    },
}
with open("fixtures/prototype-parity/quotes.json", "w", encoding="utf8") as f:
    json.dump(out, f, ensure_ascii=False, indent=2)
    f.write("\n")
print(len(quotes), "quotes")
