# AppChat — Bộ Wireframe (bản standalone)

Mỗi file mở trực tiếp bằng trình duyệt, chạy offline (font đã nhúng).

| File | Nội dung |
|---|---|
| `AppChat - Auth Wireframe` | Đăng ký · Đăng nhập · Quên mật khẩu · Khai báo bắt buộc — **13 use case** |
| `AppChat - Dashboard Wireframe` | Tổng quan / bàn điều khiển vận hành — **13 use case** |
| `AppChat - Trợ lý AI Wireframe` | Trợ lý AI (tab Chat · Coworks) — **18 use case** |
| `AppChat - Inbox Wireframe` | Hộp thư đa kênh 17 kênh · hồ sơ 360 — **17 use case** |
| `AppChat - Customers Wireframe` | Khách hàng & CRM (7 trang) · chu trình bán hàng — **20 use case** |

## Mỗi file gồm 3 phần

1. **Wireframe bố cục** — khung màn hình, vùng chức năng, chú thích.
2. **Use case** — nhóm theo giai đoạn nghiệp vụ; mỗi use case nêu tác nhân · luồng chính · luồng phụ · ngoại lệ · kết quả.
3. **Flowchart** — sơ đồ luồng nghiệp vụ vẽ bằng SVG, có chú giải ký hiệu:
   - hộp bo nhẹ = bước xử lý
   - hình thoi = điểm quyết định
   - pill xanh = bắt đầu / kết thúc
   - hộp đỏ = ngoại lệ, cần người can thiệp
   - nét đứt = bước tuỳ chọn / vòng lặp quay lại

## Điểm quyết định trọng tâm của từng luồng

- **Auth** — đã khai báo doanh nghiệp chưa? (chưa → popup chặn bắt buộc)
- **Dashboard** — AI Agent xử lý được không? (không → người can thiệp)
- **Inbox** — AI đủ tin cậy tự trả lời? · có phát sinh nghiệp vụ kinh doanh?
- **Customers** — khách đã có trong hệ thống chưa? · khách đã sẵn sàng mua chưa?
