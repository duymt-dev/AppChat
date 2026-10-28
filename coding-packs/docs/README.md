# AppChat — Tài liệu kỹ thuật (nguồn cho build)

Bộ tài liệu đã phân loại, dùng làm đầu vào cho Vibecode (scan → rri → vision → blueprint → tip).
Tài liệu thương hiệu, marketing và gói gửi khách nằm ở `../../specs/` (xem `specs/README.md`).

> Mở file `.dc.html` trực tiếp bằng trình duyệt. Mỗi thư mục đã có sẵn `support.js` đi kèm.

## Thứ tự ưu tiên khi tài liệu mâu thuẫn

Mới và cụ thể thắng cũ và tổng quát:

1. `CHANGELOG.md`
2. `03-module-specs/` + `04-wireframes/`
3. `01-requirements/`
4. `02-architecture/CTO-*`
5. `02-architecture/UIUX-*` + `tổng quan.pdf`
6. `02-architecture/AppChat-SolutionDesign-*`
7. `02-architecture/AppChat-SDD*`

## Cấu trúc

| Thư mục | Nội dung |
|---|---|
| `CHANGELOG.md` | Nhật ký quyết định nghiệp vụ/UI 07–10/2026. **Nguồn mới nhất.** |
| `01-requirements/` | `SRS-v4.0.html`: BA Software Requirements Spec (170+ FR, NFR, BR, RBAC, Billing) |
| `02-architecture/` | `CTO-Architecture-v4.2.html` (kiến trúc kỹ thuật 28 chương: C4, ERD, event, OpenAPI, DDL, NFR, DR) · `UIUX-Architecture.dc.html` (sơ đồ A1–G2; `tổng quan.pdf` là bản in của file này) · `UIUX-diagrams-index.md` + `diagrams/` (15 PNG, WBS UI/UX 119 md) · `AppChat-SolutionDesign-v1.1.dc.html` (menu, 40 trang Cài đặt, mô tả module) · `AppChat-SDD.dc.html` (bản gốc v1.0) · `AppChat-OpenFang-Architecture.dc.html` (đề xuất runtime đa tác nhân — **không áp dụng**, xem Vision V3) |
| `03-module-specs/` | Đặc tả chi tiết: Dashboard · Tickets · SLA · Appointments · Marketing · Agents-Workflow-Flow · Trial (file trống — nội dung trial nằm trong CHANGELOG 2026-08-29) |
| `04-wireframes/` | Wireframe + use case + flowchart: Auth · Dashboard · Assistant · Inbox · Customers; 3 wireframe Auth bổ sung (Phone OTP, Register, Social) |
| `05-design-system/` | `AppChat Design System.html` (token, component, RBAC UI). Token chốt theo `06-prototype/jsx-reference/styles.css` (Vision V11) |
| `06-prototype/` | `AppChat.dc.html` = **prototype mới nhất** (có trial, Coworks, Hoá đơn…) · `AppChat (standalone).html` = bản offline của nó · `jsx-reference/` = source JSX đọc được (`components/_bundle.jsx` + 19 overlay; file lẻ trùng tên với bundle là bản cũ) |
| `_archive/` | `old-versions/` (SRS v1–v3.4, CTO v1–v4.1, Feature Audit, Documentation Suite) · `old-prototype/` (bản Ultimate standalone cũ, `export/` snapshot) · `standalone-bundles/` (bản offline đóng gói của các spec/wireframe — trùng nội dung với `.dc.html`) |

## Ghi chú

- Phạm vi, quyết định và kiến trúc đã chốt nằm ở `../00-PROJECT-CONTEXT.md` (Scan + Vision) và `../01-REQUIREMENTS-MATRIX.md` (RRI). Khi đặc tả ở đây khác với hai file đó, **hai file đó thắng**.
- Prototype chỉ là tham chiếu UI/UX (bố cục, nhãn tiếng Việt, luồng); không port code.
