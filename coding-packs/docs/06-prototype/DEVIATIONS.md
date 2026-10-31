# Sổ lệch prototype (PD)

> Luật: `standards/ui/prototype-parity.md` §6b · thước đo: `standards/ui/interaction-patterns.md`.
> Mỗi chỗ app **cố ý** khác prototype mà chưa có mã D / V / REQ / COMMERCE thì ghi một dòng ở đây. Mask trong `tools/parity/parity.manifest.ts` có `reason` trích `PD-xxx`.
> Thêm dòng mới ở cuối, không đánh lại số. Dòng bị từ chối giữ lại (trạng thái `từ chối`) để không đề xuất lặp.

## Trạng thái

- `đề xuất` — thợ ghi khi làm. Mức 1: được làm luôn và mask. Mức 3: **chưa** được làm, app vẫn theo prototype.
- `duyệt` — mức 1: Chủ thầu duyệt lúc verify. Mức 3: Chủ nhà duyệt (ghi mã D vào cột Quyết định), sau đó mới sửa app.
- `từ chối` — app quay về theo prototype, gỡ mask.
- `đã gộp` — bản prototype mới đã sửa đúng chỗ này; gỡ mask, baseline chụp lại.

## Sổ

| PD | Màn / ID parity | Vùng (selector / rect) | Prototype đang làm | Trái mục | App làm | Mức | Trạng thái | Quyết định | Ghi bởi |
|----|-----------------|------------------------|--------------------|----------|---------|-----|------------|------------|---------|
| PD-001 | `settings:web-widget` (cột xem trước) | mask "PD-001" trong manifest | L7210–7254: `sc-if` khối "Bổ sung kiến thức" đóng thừa `</div></sc-if>` làm cột xem trước vỡ, chỉ còn nhãn "Mã nhúng" | IP-5 (không vỡ bố cục) | Dựng cột xem trước 360 theo L7261–7298 | 1 | duyệt | — (lỗi markup prototype) | F6 · ghi lại khi lập sổ |
| PD-002 | `tickets:detail` (đồng hồ SLA) | mask "PD-002" trong manifest | Hard-code "2g 14p" theo ưu tiên (`tkdCountdown` L9165) | IP-6.3 (thời gian từ dữ liệu thật) | Tính từ `ttr_due_at` | 1 | duyệt | — | F5 · ghi lại khi lập sổ |
| PD-003 | `tickets:detail` (Tạo / Cập nhật) | mask "PD-003" trong manifest | Hard-code "5 phút trước · vừa xong" | IP-6.3 | Tính từ `created_at` / `updated_at` | 1 | duyệt | — | F5 · ghi lại khi lập sổ |
| PD-004 | `agents:builder`, `agents:builder-templates` (cột Cấu hình) | hook `builderLeft` trong manifest: ảnh app trả `[data-testid="agb-col"]` về lề trái để so nội dung, không mask | L2659: cột 680 bám lề trái, màn rộng hở phải (1440: 20px trái / 180px phải) | IP-8.1 (các khối 680 khác của prototype căn giữa) | Căn giữa cột trong vùng trái (`margin: 0 auto`) | 3 | duyệt | D53 | Chủ nhà 2026-10-30 · thợ ghi |
| PD-005 | `customers:*` (thanh công cụ, đầu màn), Cài đặt › Thông báo | không mask (trạng thái mở / modal không có trong baseline) | Nút "Sắp xếp" (L2509), "Nhập" (L2460) không có menu / modal; Cài đặt › Thông báo 9 loại | REQ-F03 (import), Q-012 | Menu sắp xếp 4 mục (DC-148), modal Nhập 3 bước (DC-147) dựng theo token + khung modal / popover sẵn có; 2 dòng thông báo Khách hàng (DC-150); cột kanban "Thất bại" chỉ khi có khách (DC-149) | 1 | đề xuất | DC-147…150 | thợ TIP-026 |
| PD-006 | `products:detail` (drawer — tab Tổng quan / Lịch sử / Tệp), modal Điều chỉnh tồn | không mask (parity `products:detail` 3.20% — trạng thái mock giữ bố cục) | Drawer có nút "Đồng bộ kênh" (L5718) + "Tải tệp lên", lịch sử / tệp / CRM là dữ liệu mẫu | F05, COMMERCE §2 | Nút xanh trong drawer = "Điều chỉnh tồn" (chỉ vật lý + quyền `stock.adjust`, modal dựng theo khung form sản phẩm); dòng "Tồn kho" trong Thông tin sản phẩm; Lịch sử từ `/activity`; CRM / Tệp có câu trống thật ở http; bỏ "Tải tệp lên" (DC-159) | 1 | đề xuất | DC-156, DC-159 | thợ TIP-027 |

> PD-001…003 là các mask đã có từ goal FE (F5, F6) nhưng chưa có mã; ghi vào sổ khi lập để manifest trích được. Các mask còn lại trong manifest đã trích D / COMMERCE / Blueprint / prototype-parity §6, hoặc là trạng thái prototype không vẽ (mức 2: handoff, dock theo màn, mục OUT).
