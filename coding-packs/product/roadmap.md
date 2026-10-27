# AppChat — Roadmap

> **Đã chốt ở RRI 2026-10-28** (xem `01-REQUIREMENTS-MATRIX.md`): sản phẩm thương mại hoàn chỉnh, mô hình OPC, lõi là Trợ lý AI làm Orchestrator điều phối các AI Agent + Copilot điều khiển mọi action trên UI. Kênh: Zalo cá nhân + Web widget + Email. Chưa làm: Call Center, Workflow.
> Phần dưới đây là roadmap gốc lấy từ spec, chỉ để tham khảo; phạm vi chính thức theo ma trận yêu cầu.
> [SoT: CTO Architecture v4.2 §12 "Lộ trình kỹ thuật"; OpenFang Architecture §7; SRS v4.0 §23]

## P0 — Nền tảng
- **Identity & Workspace**
  - Đăng nhập bằng OTP Zalo/Email, đăng nhập social.
  - Bắt buộc khai báo DN/Cá nhân (tra cứu MST) và lĩnh vực.
  - Multi-workspace với membership N–N; chuyển workspace.
  - RBAC (vai trò tuỳ biến, seed mặc định).
  - RLS trên Postgres, có test chống rò rỉ dữ liệu giữa tenant.
- **Trial 15 ngày gói Cá nhân Pro**, kèm badge và màn chào mừng.
- **Channel Gateway:** kiến trúc adapter, bắt đầu với Zalo OA, Facebook Messenger và Web Live Chat. Có webhook, chống xử lý trùng (idempotent) và outbox.
- **Hộp thư realtime**, bố cục 3 cột:
  - Gán người phụ trách, gắn thẻ, ghi chú nội bộ.
  - Chế độ AI cho từng hội thoại: off / copilot / auto.
  - Panel hồ sơ khách 360° (bản cơ bản).
- **Hạ tầng:** CI/CD, Postgres, Redis, WebSocket.

## P1 — Lõi nghiệp vụ
- **CRM / CDP:** Khách hàng, custom fields, check trùng/gộp hồ sơ, Hồ sơ 360° 5 tab.
- **Bán hàng:** Sản phẩm (6 loại) → Báo giá (version n+1) → Hợp đồng → Đơn → Hoá đơn. Pipeline tự cập nhật theo từng bước.
- **Hỗ trợ & SLA:** Ticket với trạng thái đầy đủ; SLA engine dùng chung (4 ngưỡng, leo thang 4 cấp, giờ làm việc, phân ca).
- **Lịch hẹn:**
  - 9 trạng thái.
  - Chống trùng theo nhân sự, phòng, thiết bị.
  - Nhắc hẹn qua ZNS → SMS → Email.
- **AI Agents + RAG:**
  - Builder và thư viện mẫu.
  - Knowledge base dùng pgvector.
  - Ngưỡng tin cậy ≥70%, chuyển người (handoff), Policy Guard.
- **Trợ lý AI (Chat / Cowork):**
  - Bắt buộc người dùng xác nhận trước khi thực thi.
  - Nhật ký hành động, có hoàn tác.
- **Billing:**
  - Ví Credit, gói cước, đo lượng dùng (metering).
  - Thanh toán VietQR có IPN và chuyển khoản thủ công.
  - Hoá đơn.
- **Tổng quan (Dashboard):** cần xử lý gấp, cần follow, onboarding checklist.

## P2 — Mở rộng
- **Marketing:** AI đề xuất chiến dịch từ CDP; wizard; phê duyệt; ZNS/Email/SMS; A/B.
- **Quy trình (Workflow engine + builder):** trigger → điều kiện → hành động; kèm mẫu theo ngành.
- **Loyalty:** hạng thành viên, rule builder KHI · NẾU · THÌ, cảnh báo khách sắp rời bỏ.
- **Báo cáo:** 10 trang chia 5 nhóm; data mart (ClickHouse) để đảm bảo "1 con số 1 nguồn".
- **Integration Hub:** outbound webhook ký HMAC, Google Sheets, Email ESP; thêm kênh mới (IG, WhatsApp, Telegram, TikTok, Email).

## P3 — Quy mô
- **Gọi điện:** Call Center (SIP), IVR, AI Voice, WebPhone.
- **Tách service:** đưa Channel Gateway và AI Worker thành service riêng.
- **Hạ tầng:** Kafka; OpenSearch.
- **Enterprise:** SSO, mỗi tenant có runtime riêng (OpenFang / Agent Gateway), on-premise.
- **Bổ sung:** Help Center, Training Studio (eval/canary), Dashboard builder.

## Ngoài phạm vi
- Mobile native / PWA (chỉ làm desktop-first, responsive).
- Sourcing / marketplace.
- SMS OTP.
