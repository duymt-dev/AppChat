# Sinh fixtures/prototype-parity/marketing.json từ prototype CAMP L8730–8764, mkAbTests / mkSchedule L8782–8783, mkAiSuggests L9084–9093,
# phân tích AI L9041–9082, khách wizard CUS L8983–9023, người nhận chi tiết L9025–9039.
# Ngoại lệ (thắng prototype — marketing chỉ Zalo cá nhân + Email, prototype-parity §6 Kênh):
# - ZNS / ZBS / Zalo OA → "zalo" (Zalo cá nhân); SMS → Zalo cá nhân; tên chiến dịch đổi hậu tố kênh tương ứng;
# - trạng thái theo Blueprint §2.2 campaign; thêm 1 chiến dịch "Chờ duyệt" để có luồng duyệt (campaign.approve luôn xác nhận).
import json

NOW = "2026-06-24T09:00:00+07:00"
# name, desc, channel, type, status, segment, count, date, end, sent, open, click, prog
CAMP = [
    ["Flash Sale 20/04 — Zalo", "Ưu đãi đặc biệt cho khách hàng VIP", "zalo", "ai", "running", "VIP", 12480, "20/04", "24/04 · 23:59", 8420, 6890, 2140, 67],
    ["Ra mắt BST Hè 2026 — Email", "Giới thiệu bộ sưu tập mới mùa hè", "email", "manual", "scheduled", "All subscribers", 34210, "21/04", "21/04 · 09:00", 0, 0, 0, 0],
    ["Remind giỏ hàng bỏ quên — Zalo", "Nhắc nhở khách hoàn tất đơn hàng", "zalo", "ai", "running", "Cart abandoners", 1892, "19/04", "Không thời hạn", 1650, 1320, 410, 87],
    ["Chúc mừng sinh nhật KH — Zalo", "Lời chúc sinh nhật tự động hoá", "zalo", "ai", "completed", "Sinh nhật hôm nay", 4560, "12/04", "15/04 · 12:00", 4560, 4012, 3450, 100],
    ["Ưu đãi cuối tuần — Email", "Giảm 15% cho tất cả đơn hàng", "email", "manual", "paused", "Đã mua áo", 8340, "14/04", "Không thời hạn", 42180, 9300, 2620, 48],
    ["Zalo — Ưu đãi thành viên VIP", "Tri ân thành viên hạng VIP", "zalo", "ai", "running", "VIP Zalo", 9210, "21/04", "Không thời hạn", 6120, 5340, 1880, 72],
    ["Zalo — Điểm thưởng tháng 4", "Cập nhật điểm tích luỹ cho khách", "zalo", "manual", "scheduled", "Có tích điểm", 18640, "23/04", "23/04 · 10:00", 0, 0, 0, 0],
    ["Email — Newsletter Hè #5", "Bản tin định kỳ tháng 4", "email", "manual", "completed", "Subscribers active", 28900, "08/04", "08/04 · 18:00", 28900, 17340, 5210, 100],
    ["Email — Win-back 60 ngày", "Kéo lại khách không tương tác", "email", "ai", "running", "Khách ngủ đông", 6480, "18/04", "Không thời hạn", 4200, 1890, 520, 65],
    ["Zalo — Nhắc gia hạn gói", "Nhắc khách sắp hết hạn gói", "zalo", "manual", "cancelled", "Sắp hết hạn", 2140, "24/04", "Đã huỷ", 0, 0, 0, 0],
    ["Zalo — Tri ân khách quay lại", "Ưu đãi 10% cho lần quay lại", "zalo", "manual", "pending_approval", "Khách quay lại", 3820, "26/04", "26/04 · 19:30", 0, 0, 0, 0],
]
CONTENT = {
    "zalo": "Kính chào quý khách 🎉 Tri ân thành viên VIP, tặng ngay voucher 30% cho đơn tới. Bấm nhận ưu đãi!",
    "email": "Chào mùa hè với BST mới — giảm 25% toàn bộ áo linen. Xem ngay bộ sưu tập và chốt đơn trước khi hết size.",
}
campaigns = []
for i, (name, desc, ch, typ, st, seg, cnt, date, end, sent, op, cl, prog) in enumerate(CAMP):
    n = 2101 + i
    campaigns.append({
        "id": f"cp_{n}", "code": f"CD-{n}", "name": name, "desc": desc, "channel": ch,
        "kind": "reactivation" if typ == "ai" else "manual", "source": typ, "status": st,
        "segment": seg, "est_recipients": cnt, "date": date, "end": end,
        "stats": {"sent": sent, "open": op, "click": cl, "progress": prog},
        "content": {"text": CONTENT[ch], **({"subject": name} if ch == "email" else {})},
        "send": "schedule" if st in ("scheduled", "pending_approval") else "now",
        "history": [
            ["created", "Trâm", "20/04 · 08:00"], ["submitted", "Trâm", "20/04 · 08:20"],
            *([["approved", "Lan · Head of MKT", "20/04 · 08:45"]] if st not in ("pending_approval",) else []),
            *([["started", "Hệ thống", "20/04 · 09:00"]] if sent else []),
        ],
    })

data = {
    "now": NOW,
    "kpis": [["running", "18", "+20%"], ["sent", "248,420", "+18.6%"], ["open", "24.8%", "+6.2%"], ["click", "12.6%", "+3.1%"]],
    "hero": {
        "email": [["Đã gửi", "71.080"], ["Tỷ lệ mở", "38,4%"], ["Tỷ lệ click", "12,1%"], ["Chuyển đổi", "3,2%"]],
        "zalo": [["Đã gửi", "25.100"], ["Tỷ lệ xem", "87,2%"], ["Tỷ lệ click", "30,7%"], ["Chuyển đổi", "9,4%"]],
        "auto": [["Flow đang chạy", "6"], ["Lượt kích hoạt", "12.480"], ["Hoàn tất flow", "64,2%"], ["Chuyển đổi", "8,6%"]],
    },
    "ab_tests": [
        ['Subject: "Ưu đãi hè 🌴" vs "Giảm 20% hôm nay"', "#C9820B", "52,1% mở", "47,9% mở", "Biến thể A thắng · +4,2%"],
        ['CTA: "Mua ngay" vs "Xem ưu đãi"', "#0068FF", "11,8% click", "13,6% click", "Biến thể B thắng · +1,8%"],
        ["Giờ gửi: 9:00 vs 19:30", "#6E48E6", "34% mở", "41% mở", "Khung 19:30 tốt hơn"],
    ],
    "schedule": [
        ["Hôm nay · 09:00", "Ra mắt BST Hè 2026", "email", "34.210 KH"],
        ["23/04 · 10:00", "Điểm thưởng tháng 4", "zalo", "18.640 KH"],
        ["26/04 · 19:30", "Tri ân khách quay lại", "zalo", "3.820 KH"],
    ],
    "ai": [
        ["Soạn chiến dịch Zalo nhắc tái khám", "#0068FF", "Nhắm 3,820 khách quay lại 90 ngày · tin Zalo cá nhân · dự kiến mở 62%"],
        ["Phân khúc khách VIP chưa quay lại 60 ngày", "#6E48E6", "1,240 khách VIP · gợi ý ưu đãi giữ chân + voucher cá nhân hoá"],
        ["Win-back khách ngủ đông", "#C9820B", "5,430 khách inactive 90 ngày · combo Email + Zalo, tiết kiệm 32% chi phí"],
        ["Flash Sale cuối tuần đa kênh", "#E0556B", "Đề xuất kênh tối ưu theo từng khách (Zalo → Email)"],
    ],
    "segments": [["vip", "Khách VIP", 1240], ["returning", "Khách quay lại", 3820], ["cart", "Bỏ giỏ hàng", 642], ["new", "Khách mới", 892], ["cold", "Inactive 90 ngày", 5430]],
    "customers": [
        ["Chị Lan Hương", "0903 123 456", "lanhuong@gmail.com", "vip", "Kim cương · 32M"],
        ["Nguyễn T. Hiếu", "0978 456 789", "hieu.nt@gmail.com", "vip", "Vàng · 11M"],
        ["Phạm Quỳnh Anh", "0912 345 678", "quynhanh@gmail.com", "returning", "3 đơn / 90 ngày"],
        ["Đỗ Thu Hà", "0987 654 321", "thuha.do@gmail.com", "returning", "2 đơn / 90 ngày"],
        ["Vũ Đức Anh", "0909 876 543", "ducanh.vu@gmail.com", "new", "Đăng ký 12 ngày"],
        ["Trần Mai Trâm", "0938 222 111", "maitram@gmail.com", "new", "Mua lần đầu"],
        ["Lê Quốc Bảo", "0911 777 888", "quocbao.le@gmail.com", "cold", "90+ ngày"],
        ["Hoàng Vũ Mai", "0966 555 444", "vumai.h@gmail.com", "cold", "Chưa mở 100 ngày"],
        ["Ngô Gia Hân", "0977 333 222", "giahan@gmail.com", "returning", "4 đơn / 60 ngày"],
        ["Bùi Khánh Vy", "0944 888 999", "khanhvy@gmail.com", "vip", "Vàng · 9.8M"],
        ["Đặng Tuấn Kiệt", "0922 444 777", "tuankiet@gmail.com", "new", "Đăng ký 5 ngày"],
        ["Phan Hồng Nhung", "0955 111 333", "hongnhung@gmail.com", "returning", "2 đơn / 30 ngày"],
        ["Trương Mỹ Linh", "0933 666 222", "mylinh.t@gmail.com", "cart", "Giỏ 2.4M"],
        ["Cao Minh Quân", "0944 222 555", "minhquan@gmail.com", "cart", "Giỏ 890k"],
        ["Dương Thảo My", "0966 888 111", "thaomy.d@gmail.com", "vip", "Bạc · 6.2M"],
        ["Lý Gia Bảo", "0911 444 999", "giabao.ly@gmail.com", "new", "Đăng ký 3 ngày"],
    ],
    "recipients": [
        ["Nguyễn Văn A", "0910 300 100", "clicked", "20/04 08:00", "20/04 08:01", "20/04 08:02"],
        ["Trần Thị B", "0911 307 111", "clicked", "20/04 08:01", "20/04 08:02", "20/04 08:03"],
        ["Lê Minh C", "0912 314 122", "delivered", "20/04 08:02", "", ""],
        ["Phạm Hoàng D", "0913 321 133", "clicked", "20/04 08:03", "20/04 08:04", "20/04 08:05"],
        ["Hoàng Thu E", "0914 328 144", "opened", "20/04 08:04", "20/04 08:05", ""],
        ["Ngô Tuấn K", "0915 335 155", "delivered", "20/04 08:00", "", ""],
        ["Đỗ Bảo Vân", "0916 342 166", "opened", "20/04 08:05", "20/04 08:07", ""],
        ["Bùi Thị Lan", "0917 349 177", "failed", "", "", ""],
    ],
    "suggestions": [
        {"id": "sg_1", "priority": "high", "name": "Tái kích hoạt khách hàng cũ", "segment": "Không tương tác trên 90 ngày", "count": 540,
         "reason": "Từng mua hàng nhưng gần đây không phát sinh giao dịch", "channels": ["zalo", "email"], "when": "Tuần này", "kind": "reactivation",
         "pitch": "Có 540 khách hàng từng mua hàng nhưng không phát sinh tương tác trong hơn 90 ngày. AI đề xuất triển khai chiến dịch tái kích hoạt với ưu đãi dành riêng cho khách hàng cũ.",
         "type": "Tái kích hoạt khách hàng", "audience": "Khách đã mua nhưng không tương tác trên 90 ngày", "time": "9:00–10:30 sáng thứ Ba",
         "message": "Ưu đãi quay lại dành cho khách hàng cũ", "forecast": "8–12%", "note": "Dựa trên 6 chiến dịch win-back gần nhất",
         "signals": ["Ngày tương tác cuối", "Lịch sử mua", "Giá trị đơn trung bình", "Kênh thường dùng"], "segs": ["cold"],
         "subject": "Ưu đãi quay lại dành riêng cho khách hàng cũ", "body": "Chào {tên}, đã lâu không gặp anh/chị. AppChat gửi anh/chị ưu đãi 20% cho lần quay lại — áp dụng đến hết tuần này.", "cta": "Nhận ưu đãi"},
        {"id": "sg_2", "priority": "high", "name": "Bán thêm sản phẩm", "segment": "Đã mua sản phẩm A", "count": 1250,
         "reason": "Có khả năng quan tâm sản phẩm bổ trợ B", "channels": ["zalo", "email"], "when": "9:30 thứ Ba", "kind": "upsell",
         "pitch": "1.250 khách đã mua sản phẩm A và có hành vi tương tự nhóm từng mua thêm sản phẩm bổ trợ B. AI đề xuất chiến dịch bán thêm với gợi ý sản phẩm cá nhân hoá.",
         "type": "Bán thêm (Cross-sell)", "audience": "Đã mua sản phẩm A", "time": "9:30 sáng thứ Ba",
         "message": "Sản phẩm bổ trợ B — ưu đãi combo", "forecast": "14–19%", "note": "Nhóm đã mua có tỷ lệ chuyển đổi cao hơn 2,3 lần",
         "signals": ["Sản phẩm đã mua", "Sản phẩm đã xem", "Tần suất mua", "Tỷ lệ mở Zalo"], "segs": ["returning"],
         "subject": "Sản phẩm bổ trợ dành cho khách đã dùng {sản phẩm A}", "body": "Chào {tên}, khách hàng dùng {sản phẩm A} thường kết hợp thêm {sản phẩm B}. Combo hai sản phẩm đang ưu đãi 15%.", "cta": "Xem combo ưu đãi"},
        {"id": "sg_3", "priority": "medium", "name": "Chuyển đổi khách hàng tiềm năng", "segment": "Đã xem báo giá nhưng chưa mua", "count": 320,
         "reason": "Có nhu cầu rõ ràng nhưng chưa hoàn tất giao dịch", "channels": ["email", "zalo"], "when": "Trong 3 ngày", "kind": "conversion",
         "pitch": "320 khách đã xem báo giá nhưng chưa chốt đơn. Nhu cầu đã rõ, chỉ cần một lần nhắc kèm lý do quyết định. AI đề xuất chiến dịch chuyển đổi có thời hạn.",
         "type": "Chuyển đổi khách tiềm năng", "audience": "Đã xem báo giá nhưng chưa mua", "time": "Trong 3 ngày tới",
         "message": "Nhắc báo giá còn hiệu lực + hỗ trợ tư vấn", "forecast": "22–28%", "note": "Báo giá còn hiệu lực làm tăng tỷ lệ phản hồi",
         "signals": ["Trạng thái báo giá", "Lượt xem báo giá", "Lịch sử hội thoại", "Người phụ trách"], "segs": ["cart"],
         "subject": "Báo giá của anh/chị vẫn còn hiệu lực", "body": "Chào {tên}, báo giá {mã báo giá} còn hiệu lực đến {ngày}. Nếu cần tư vấn thêm, đội ngũ AppChat sẵn sàng hỗ trợ ngay.", "cta": "Xem lại báo giá"},
        {"id": "sg_4", "priority": "medium", "name": "Chăm sóc sau mua", "segment": "Mua hàng trong 30 ngày", "count": 680,
         "reason": "Phù hợp khảo sát mức độ hài lòng và giới thiệu dịch vụ mới", "channels": ["zalo"], "when": "Sau 7 ngày", "kind": "aftercare",
         "pitch": "680 khách vừa mua trong 30 ngày. Đây là thời điểm tốt nhất để khảo sát mức độ hài lòng, thu thập đánh giá và giới thiệu dịch vụ liên quan.",
         "type": "Chăm sóc sau mua", "audience": "Mua hàng trong 30 ngày", "time": "Sau 7 ngày kể từ ngày mua",
         "message": "Khảo sát hài lòng + giới thiệu dịch vụ mới", "forecast": "31–38%", "note": "Khảo sát sau mua có tỷ lệ phản hồi cao nhất",
         "signals": ["Ngày mua", "Sản phẩm đã mua", "Ticket sau mua", "Hạng thành viên"], "segs": ["new"],
         "subject": "Anh/chị thấy {sản phẩm} thế nào?", "body": "Chào {tên}, cảm ơn anh/chị đã tin chọn AppChat. Anh/chị dành 1 phút đánh giá trải nghiệm để chúng tôi phục vụ tốt hơn nhé.", "cta": "Gửi đánh giá"},
    ],
    "signals": ["Thông tin hồ sơ khách hàng", "Phân loại & nhãn khách hàng", "Lịch sử mua hàng", "Sản phẩm đã quan tâm", "Lịch sử tương tác",
                "Thời gian tương tác gần nhất", "Giá trị & tần suất mua", "Báo giá · hợp đồng · đơn hàng", "Lịch sử nhận chiến dịch",
                "Tỷ lệ mở & nhấp", "Tỷ lệ phản hồi", "Kênh liên hệ thường dùng"],
    "campaigns": campaigns,
}
with open("fixtures/prototype-parity/marketing.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
    f.write("\n")
print(len(campaigns), "campaigns")
