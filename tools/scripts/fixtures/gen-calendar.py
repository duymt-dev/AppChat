# Sinh fixtures/prototype-parity/calendar.json từ prototype bkGroups / bkMonthCells / weekDays L11096–11160, L8578.
# Ngoại lệ (thắng prototype):
# - ngày neo theo ngày mock 24/06/2026 (Thứ 4) thay cho "Thứ 6, 20 tháng 6" / "Tháng 5";
# - kênh đặt theo channel registry: Zalo OA → Zalo cá nhân, Web Widget → Web chat, Hotline → Nhân viên, App → AI Agent;
# - Quỳnh Anh chuyển sang KTV Thu Hà để không trùng giờ KTV Mai Lan (ràng buộc EXCLUDE staff + khung giờ);
# - trạng thái theo Blueprint §2.2: arrived → in_progress, noshow → no_show;
# - liệu trình (COMMERCE §6): Lan Hương có gói trị mụn 10 buổi → hoàn thành trừ 1 buổi.
import json

TODAY = "2026-06-24"
SERVICES = [
    {"id": "sv1", "name": "Trị mụn chuyên sâu", "color": "#FF8A4C", "duration": 90, "price": "680000", "buffer": 10},
    {"id": "sv2", "name": "Massage thư giãn 60p", "color": "#7C9CFF", "duration": 60, "price": "450000", "buffer": 10},
    {"id": "sv3", "name": "Triệt lông Diode", "color": "#F87171", "duration": 120, "price": "1200000", "buffer": 15},
    {"id": "sv4", "name": "Tư vấn 1-1 HLV", "color": "#34D399", "duration": 45, "price": "300000", "buffer": 5},
    {"id": "sv5", "name": "Khám da VISIA", "color": "#A78BFA", "duration": 30, "price": "250000", "buffer": 5},
]
STAFF = [
    {"id": "s1", "name": "BS. Hồng Anh", "role": "Bác sĩ da", "initial": "H", "color": "#F87171", "team": "tech", "room": "Phòng khám 1"},
    {"id": "s2", "name": "KTV. Mai Lan", "role": "KTV da", "initial": "M", "color": "#FF8A4C", "team": "tech", "room": "Phòng VIP 2"},
    {"id": "s3", "name": "KTV. Thu Hà", "role": "KTV laser", "initial": "T", "color": "#7C9CFF", "team": "tech", "room": "Phòng laser"},
    {"id": "s4", "name": "PT. Đức Minh", "role": "Personal trainer", "initial": "D", "color": "#34D399", "team": "care", "room": "Phòng tập"},
]
OWNER = {"zalo_personal": "u_tram", "webchat": "u_minh", "staff": "u_huong", "agent": "u_tram"}

# ngày, giờ, dịch vụ, KTV, khách, sđt, kênh, trạng thái, thanh toán, phụ trách
TODAY_ROWS = [
    ["09:00", "sv1", "s2", "Nguyễn Lan Hương", "+84 909 123 456", "zalo_personal", "confirmed", "paid", "u_tram"],
    ["10:00", "sv2", "s3", "Trần Quỳnh Anh", "+84 912 345 678", "webchat", "in_progress", "pending", "u_minh"],
    ["11:00", "sv5", "s1", "Lê Phương Linh", "+84 938 222 111", "staff", "confirmed", "paid", "u_huong"],
    ["14:00", "sv3", "s3", "Đỗ Hồng Nhung", "+84 977 666 555", "zalo_personal", "confirmed", "partial", "u_tram"],
    ["15:00", "sv4", "s4", "Phạm Tuấn Đạt", "+84 901 555 222", "agent", "confirmed", "paid", "u_khoa"],
    ["16:30", "sv2", "s2", "Vũ Mai Trâm", "+84 988 333 444", "zalo_personal", "pending", "pending", "u_tram"],
]
# Lịch khác trong tháng 6 (prototype evMap, đổi về tháng 6/2026).
OTHER = [
    ["2026-06-05", "09:00", "sv1", "s2", "Nguyễn Lan Hương"],
    ["2026-06-08", "10:30", "sv2", "s2", "Trần Quỳnh Anh"],
    ["2026-06-08", "14:00", "sv4", "s4", "Đức Long"],
    ["2026-06-12", "09:30", "sv5", "s1", "Mai Trâm"],
    ["2026-06-15", "11:00", "sv3", "s3", "Thu Hà"],
    ["2026-06-15", "15:30", "sv2", "s2", "Quốc Bảo"],
    ["2026-06-15", "16:30", "sv1", "s2", "Vũ Mai"],
    ["2026-06-19", "08:30", "sv3", "s3", "Đỗ Hồng Nhung"],
    ["2026-06-22", "13:00", "sv2", "s2", "Khánh Vy"],
    ["2026-06-26", "10:00", "sv1", "s2", "Gia Hân"],
    ["2026-06-26", "14:30", "sv5", "s1", "Tuấn Anh"],
]
CONTACT = {}


def cid(name):
    return CONTACT.setdefault(name, "ct_bk_%02d" % (len(CONTACT) + 1))


def add_min(hm, m):
    h, mm = map(int, hm.split(":"))
    t = h * 60 + mm + m
    return "%02d:%02d" % (t // 60, t % 60)


def ts(d, hm):
    return f"{d}T{hm}:00+07:00"


svc = {s["id"]: s for s in SERVICES}
appts = []
n = 0
for day, hm, sv, st, cust in OTHER[:9]:
    n += 1
    status = "no_show" if cust == "Mai Trâm" else "done"
    appts.append([day, hm, sv, st, cust, "", "zalo_personal", status, "paid" if status == "done" else "pending", "u_tram"])
for r in TODAY_ROWS:
    appts.append([TODAY, *r])
for day, hm, sv, st, cust in OTHER[9:]:
    appts.append([day, hm, sv, st, cust, "", "zalo_personal", "confirmed", "pending", "u_tram"])

out_appts = []
for i, (day, hm, sv, st, cust, phone, channel, status, pay, owner) in enumerate(appts):
    s = svc[sv]
    code = "LH-%04d" % (1201 + i)
    reminders = [{"kind": "confirm", "at": ts(day, "07:12") if day == TODAY else ts(day, "08:00")}]
    out_appts.append({
        "id": "ap_%d" % (1201 + i), "code": code, "contact_id": cid(cust), "contact_name": cust, "phone": phone,
        "owner_user_id": owner, "service_id": sv, "staff_id": st,
        "start_at": ts(day, hm), "end_at": ts(day, add_min(hm, s["duration"])),
        "status": status, "pay": pay, "source": channel, "note": "",
        "cancel_reason": "", "reschedule_count": 0, "package_id": None, "order_id": None,
        "reminders": reminders,
    })
# ghi chú prototype ở drawer chi tiết
for a in out_appts:
    if a["contact_name"] == "Vũ Mai Trâm":
        a["note"] = "Khách hỏi đổi sang chiều thứ 7 nếu còn KTV"
    if a["contact_name"] == "Nguyễn Lan Hương" and a["start_at"].startswith(TODAY):
        a["note"] = "Da nhạy cảm — dùng sản phẩm dịu nhẹ"

packages = [{
    "id": "pkg_501", "contact_id": cid("Nguyễn Lan Hương"), "name": "Liệu trình trị mụn 10 buổi", "service_id": "sv1",
    "total": 10, "used": 5, "expires_at": "2026-12-31", "status": "active",
}]
for a in out_appts:
    if a["contact_name"] == "Nguyễn Lan Hương":
        a["package_id"] = "pkg_501"

follow_ups = [
    {"id": "cfu_1", "at": ts(TODAY, "09:30"), "note": "Nhắc tái khám sau liệu trình", "contact_name": "Nguyễn Lan Hương",
     "step": "Chăm sóc 30 ngày", "owner": "agent", "channel": "zalo_personal", "due": "today"},
    {"id": "cfu_2", "at": ts(TODAY, "14:00"), "note": "Win-back khách ngủ đông", "contact_name": "Phạm Tuấn Đạt",
     "step": "Ưu đãi quay lại", "owner": "Hương", "channel": "email", "due": "overdue"},
]

out = {
    "today": TODAY,
    "open_hours": {"start": "08:00", "end": "19:00"},
    "services": SERVICES,
    "staff": STAFF,
    "appointments": out_appts,
    "packages": packages,
    "follow_ups": follow_ups,
    "history": [
        {"at": "2026-04-15", "service": "Trị mụn chuyên sâu"},
        {"at": "2026-04-02", "service": "Khám da VISIA"},
        {"at": "2026-03-18", "service": "Massage thư giãn 60p"},
    ],
    "ai": [
        ["confirm", "Gọi xác nhận khách chờ", "1 lịch hẹn chờ xác nhận (Vũ Mai Trâm 16:30) · soạn lời nhắc qua Zalo"],
        ["gap", "Lấp khung giờ trống chiều nay", "12:00–14:00 còn trống · đề xuất mời 2 khách tiềm năng đang quan tâm"],
        ["follow", "Nhắc follow-up đến hạn", "2 follow-up cần xử lý hôm nay · tự soạn tin chăm sóc theo giai đoạn"],
        ["report", "Báo cáo lịch hẹn hôm nay", "6 lịch · 4 xác nhận · utilization 6.4h · doanh thu 3.6tr"],
    ],
}
with open("fixtures/prototype-parity/calendar.json", "w", encoding="utf8") as f:
    json.dump(out, f, ensure_ascii=False, indent=2)
    f.write("\n")
