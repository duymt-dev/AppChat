# Sinh fixtures/prototype-parity/loyalty.json từ prototype lyOverview / lyChurn / lyRules L11475–11497, lyMembers L11689, lyDetail L11671.
# Chỉnh cho khớp COMMERCE §7 (thắng prototype):
# - 10.000đ = 1 điểm, cộng một lần khi đơn hoàn tất; hệ số hạng Thành viên ×1 · Bạc ×1 · Vàng ×1,5 · Kim cương ×2; đổi 1 điểm = 100đ;
# - chi tiêu thành viên tính lại cho khớp tổng điểm tích luỹ (prototype ghi chi tiêu nhỏ hơn số điểm có thể đạt);
# - lịch sử điểm của từng khách sinh theo hệ số hạng của khách đó (prototype dùng chung một danh sách).
import json

NOW = "2026-06-24T09:00:00+07:00"
TIERS = [["member", 0, 1], ["silver", 5000, 1], ["gold", 15000, 1.5], ["diamond", 40000, 2]]
MULT = {k: m for k, _, m in TIERS}

# id, tên, SĐT, hạng, điểm hiện có, tổng tích luỹ, trạng thái, tham gia
MEMBERS = [
    ["ct_lan", "Chị Lan", "0903 123 456", "diamond", 24800, 45600, "active", "03/2024"],
    ["ct_hieu", "Nguyễn T. Hiếu", "0978 456 789", "gold", 9200, 18500, "active", "06/2024"],
    ["ct_quynh", "Phạm Quỳnh", "0912 345 678", "gold", 8600, 15200, "inactive", "08/2024"],
    ["ct_ha", "Đỗ Thu Hà", "0987 654 321", "silver", 4200, 9800, "new", "11/2024"],
    ["ct_ducanh", "Vũ Đức Anh", "0909 876 543", "silver", 3100, 7200, "churn_risk", "01/2025"],
]

def ledger(mult):
    # (loại, mô tả, số tiền đơn hoặc điểm, thời điểm) — điểm tích = floor(tiền / 10.000) × hệ số hạng
    rows = [
        ["earn", "Tích điểm đơn DH-2418 · HIFU 8 buổi", 6_400_000, "Hôm nay · 10:24"],
        ["redeem", "Dùng điểm khi thanh toán đơn DH-2402", 2000, "3 ngày trước"],
        ["earn", "Tích điểm đơn DH-2395 · Combo da mặt", 4_750_000, "5 ngày trước"],
        ["adjust", "Điều chỉnh điểm (CSKH) · Đền bù sự cố", 500, "1 tuần trước"],
        ["earn", "Tích điểm đơn DH-2371 · Serum B5", 340_000, "2 tuần trước"],
        ["redeem", "Dùng điểm khi thanh toán đơn DH-2350", 4500, "3 tuần trước"],
    ]
    out = []
    for kind, text, v, at in rows:
        if kind == "earn":
            delta = int((v // 10000) * mult)
        elif kind == "redeem":
            delta = -v
        else:
            delta = v
        out.append({"kind": kind, "text": text, "delta": delta, "at": at})
    return out

members = []
for cid, name, phone, tier, cur, acc, st, joined in MEMBERS:
    used = acc - cur
    m = MULT[tier]
    # chi tiêu ≈ điểm tích luỹ / hệ số × 10.000đ (làm tròn triệu)
    spent = int(round(acc / m * 10000 / 1_000_000)) * 1_000_000
    members.append({
        "contact_id": cid, "name": name, "phone": phone, "tier": tier, "points": cur, "earned": acc, "used": used,
        "spent": str(spent), "status": st, "joined": joined, "expiring": 3200 if cid == "ct_lan" else 0,
        "ledger": ledger(m),
    })

data = {
    "now": NOW,
    "config": {
        "enabled": True, "earn_vnd_per_point": 10000, "redeem_vnd_per_point": 100, "max_redeem_pct": 50,
        "expiry_months": 12, "tier_window_months": 12, "tier_review": "quarterly", "marketplace_earn": False,
        "tiers": [{"key": k, "min": mn, "mult": m} for k, mn, m in TIERS],
    },
    "overview": [
        ["issued", "1.248.000", "pts", "+18.7%"], ["used", "762.300", "pts", "+10.4%"], ["redeemed", "326.400", "pts", "+9.1%"],
        ["return", "68,5%", "", "+5.2%"], ["revenue", "2,48 tỷ", "vnd", "+16.8%"],
    ],
    "churn": [
        ["Nguyễn Thị Hồng", "0912 448 902", "diamond", "high", 88, "Không đặt lịch 74 ngày · 3.200 điểm hết hạn 12/08", "74 ngày"],
        ["Trần Minh Quân", "0938 117 240", "gold", "high", 81, "Gói HIFU còn 5/8 buổi · hết hạn 20/08", "52 ngày"],
        ["Lê Phương Anh", "0907 553 118", "gold", "medium", 63, "Giảm tần suất mua · bỏ 2 lịch hẹn liên tiếp", "38 ngày"],
        ["Phạm Quốc Đạt", "0975 620 431", "silver", "medium", 57, "Mở tin nhưng không phản hồi 4 lần", "31 ngày"],
        ["Vũ Thu Trang", "0913 802 664", "silver", "low", 34, "Điểm chưa dùng 1.100 · chưa đến hạn", "22 ngày"],
    ],
    # Quy tắc: 2 quy tắc COMMERCE §7 đang chạy; các thưởng ngoài luật hiển thị "Sắp có" (không bật được).
    "rules": [
        ["earn", "order_completed", "all", "10.000đ = 1 điểm", "12 tháng", "on"],
        ["tier_mult", "order_completed", "tier", "Vàng × 1,5 · Kim cương × 2", "12 tháng", "on"],
        ["big_order", "order_completed", "big", "+ 1.000 điểm", "12 tháng", "soon"],
        ["birthday", "birthday", "all", "+ 500 điểm", "1 tháng", "soon"],
        ["signup", "signup", "new", "+ 200 điểm", "6 tháng", "soon"],
        ["referral", "referral", "all", "+ 300 điểm", "12 tháng", "soon"],
        ["rating", "rating", "five", "+ 100 điểm", "6 tháng", "soon"],
        ["package", "package", "all", "× 1,2 điểm", "12 tháng", "soon"],
    ],
    "files": [["Phiếu đổi quà voucher 200k.pdf", "pdf", "Hệ thống · 23/10"], ["Ảnh nhận quà sinh nhật.jpg", "jpg", "Trâm · 12/09"]],
    "members": members,
}
with open("fixtures/prototype-parity/loyalty.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
    f.write("\n")
print(len(members), "members")
