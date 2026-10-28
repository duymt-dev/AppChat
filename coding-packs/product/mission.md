# AppChat — Mission

> Draft from specs — confirm/adjust. [SoT: SolutionDesign v1.1 §1-3; CHANGELOG 2026-08-26; docs/06-prototype/jsx-reference/CLAUDE.md]

## Vấn đề
Doanh nghiệp dịch vụ nhỏ đang dùng rời rạc nhiều công cụ: một phần mềm chat, một CRM, một hệ thống marketing, một tổng đài, một helpdesk. Hệ quả:
- Dữ liệu khách hàng bị chia cắt giữa các công cụ.
- Trải nghiệm khách hàng rời rạc.
- Chi phí nhân sự cao và khó mở rộng.

Trong khi đó, khách hàng cuối mong được phản hồi ngay trên chính kênh họ đang dùng (Zalo, Facebook, TikTok…).

## Dành cho ai
- **Chủ doanh nghiệp dịch vụ** có khách quay lại nhiều lần: Spa/Thẩm mỹ, Nha khoa, Phòng khám, Giáo dục, Gym/Yoga, Ô tô, Du lịch, BĐS, Tài chính, F&B.
- **Người dùng chính** là người tự vận hành doanh nghiệp (One-Person Company) hoặc đội nhỏ gồm Sales, CSKH, Marketing và Quản lý.
- **Không** phục vụ mô hình bán hàng trên sàn TMĐT.

## Điểm khác biệt
- **Giải pháp One-Person Company:** một người vận hành toàn bộ doanh nghiệp với đội ngũ AI Agents.
- **AI là hạ tầng vận hành, không phải tính năng phụ.**
  - Giao việc bằng cách trò chuyện với Trợ lý AI thay vì thao tác qua hàng chục màn hình.
  - AI Agents tự xử lý phần lớn tương tác lặp lại.
  - Con người giám sát ở các điểm quyết định: human-in-the-loop, nhật ký hành động, có thể hoàn tác.
- **Một hệ thống duy nhất:** omnichannel, CDP 360°, bán hàng (báo giá → hợp đồng → đơn → hoá đơn), CSKH (ticket/SLA), lịch hẹn, marketing, tổng đài, loyalty, workflow.
- **Ưu tiên kênh Việt Nam** (Zalo OA/ZNS, Facebook, TikTok), giao diện tiếng Việt và taxonomy ngành 2 cấp.
- **Một đơn vị tính phí duy nhất (Credit)**, không bắt khách phải hiểu token hay tên model.
