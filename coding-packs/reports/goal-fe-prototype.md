# Report — Goal FE theo prototype (`goal/fe-prototype`)

> Goal: `coding-packs/goals/GOAL-FE-PROTOTYPE.md` · Hướng dẫn chung: `CLAUDE.md` · Chuẩn: `standards/ui/*`
> File này do **Thợ** điền trong lúc làm. Chủ nhà / Chủ thầu đọc để biết tiến độ.

## Cách điền

- **ID** = id trong `tools/parity/parity.manifest.ts` (`<màn>:<trạng thái>`), chạy bằng `pnpm parity <ID>`. Màn / trạng thái mới phát sinh thì thêm dòng, không xoá dòng có sẵn.
- **Loại:** `P` = đo pixel với prototype (≤ 0.05) · `E` = đo pixel, có vùng ngoại lệ đã ghi mã quyết định (mask vùng đó) · `M` = màn mới không có trong prototype (không đo pixel; kiểm token + pattern + e2e) · `C` = việc checklist, không phải màn.
- **TT:** ⬜ chưa làm · 🟡 đang làm · ✅ đạt · ❌ chưa đạt (ghi lý do) · ⛔ chặn (ghi vào Escalation log).
- **diffRatio:** số đo thật, ví dụ `0.031`. Loại `M` / `C` ghi `—`.
- **Mobile 390:** `pass` / `fail` (e2e: không tràn ngang, vùng chạm ≥ 44px, action chính chạy được).
- **Commit:** git short SHA của commit làm xong dòng đó.
- Chỉ đánh ✅ khi đủ định nghĩa ĐẠT trong goal (parity, mobile, cấu trúc, i18n, quyền, lint / test).

## Tổng quan tiến độ

| Pha | Nội dung | Số dòng | ✅ | ❌ / ⛔ | Completion Report | Commit cuối pha |
|-----|----------|--------:|---:|-------:|-------------------|-----------------|
| F0 | Scaffold, theme, shell, công cụ | 15 | 0 | 0 | ⬜ | |
| F1 | Auth & onboarding | 10 | 0 | 0 | ⬜ | |
| F2 | Tổng quan · Hộp thư · Khách hàng | 24 | 0 | 0 | ⬜ | |
| F3 | Trợ lý AI · AI Agents · Duyệt · Nhật ký | 17 | 0 | 0 | ⬜ | |
| F4 | Sản phẩm · Báo giá · Hợp đồng · Đơn · Đề nghị thanh toán | 20 | 0 | 0 | ⬜ | |
| F5 | Lịch hẹn · Ticket · Marketing · Khách thân thiết | 18 | 0 | 0 | ⬜ | |
| F6 | Cài đặt · Gói & ví · popup | 26 | 0 | 0 | ⬜ | |
| F7 | Rà soát cuối | 5 | 0 | 0 | ⬜ | |
| **Tổng** | | **135** | **0** | **0** | | |

---

## F0 — Scaffold, theme, shell, công cụ

| ID | Màn · trạng thái | Prototype | Loại | TT | diffRatio | Mobile 390 | Commit | Ghi chú |
|----|------------------|-----------|------|----|-----------|-----------|--------|---------|
| `f0:workspace` | Root monorepo đúng Blueprint §1.1; `apps/web`, `packages/{ui,shared,actions}` | — | C | ⬜ | — | — | | |
| `f0:theme` | `packages/ui/theme.ts` lấy token từ CSS prototype | L39–392 | C | ⬜ | — | — | | |
| `f0:icons` | 54 icon sprite `#ic-*` → `packages/ui/icons` | L396–455 | C | ⬜ | — | — | | |
| `f0:i18n` | next-intl vi + en, fallback, `fmt.*`, đồng bộ antd / dayjs | — | C | ⬜ | — | — | | |
| `f0:lint` | Lint size (400 FE), boundaries, i18next; typecheck; CI | — | C | ⬜ | — | — | | |
| `f0:mock` | Mock transport + mock action executor + fixtures + dev toolbar đổi vai trò | L7668+ | C | ⬜ | — | — | | |
| `f0:parity-tool` | `tools/parity` + `parity.manifest.ts` + baseline + đồng hồ cố định | — | C | ⬜ | — | — | | |
| `f0:e2e-mobile` | Harness Playwright 390×844 | — | C | ⬜ | — | — | | |
| `shell:default` | AppShell + NavRail mở, đáy rail (search, thông báo, Nâng cấp, trial, avatar) | L637–1078 | E | ⬜ | | | | Ẩn Gọi điện / Quy trình / Báo cáo (D07, D19) |
| `shell:rail-collapsed` | Rail thu gọn | L800 | P | ⬜ | | | | |
| `shell:flyout-crm` | Flyout nhóm Khách hàng & CRM | L814+ | P | ⬜ | | | | |
| `shell:notifications` | Popover thông báo | L903 | P | ⬜ | | | | |
| `shell:user-menu` | Menu avatar + đổi workspace + ngôn ngữ | L1034–1052 | E | ⬜ | | | | Chỉ hiện vi / en (D22) |
| `shell:assistant-dock` | AssistantDock mở trên một màn | L820 | P | ⬜ | | | | |
| `shell:mobile-tabbar` | MobileTabBar 5 tab (< md) | — | M | ⬜ | — | | | Chỉ mobile |

## F1 — Auth & onboarding

| ID | Màn · trạng thái | Prototype | Loại | TT | diffRatio | Mobile 390 | Commit | Ghi chú |
|----|------------------|-----------|------|----|-----------|-----------|--------|---------|
| `auth:login` | Đăng nhập | L471 | E | ⬜ | | | | OTP Email, ẩn social login |
| `auth:register` | Đăng ký | L523 | E | ⬜ | | | | |
| `auth:otp` | Nhập mã OTP | L459–630 | E | ⬜ | | | | Gửi qua email (Brevo) |
| `auth:forgot` | Quên mật khẩu | L588 | P | ⬜ | | | | |
| `auth:reset` | Đặt lại mật khẩu (link 15 phút) | — | M | ⬜ | — | | | |
| `onboarding:declare-business` | Popup khai báo DN / hộ KD (tra MST) | L758–766 | P | ⬜ | | | | Không đóng được |
| `onboarding:declare-individual` | Popup khai báo cá nhân | L776 | P | ⬜ | | | | |
| `onboarding:trial-welcome` | Màn chào mừng trial (2 nút) | state `trialWelcome` | E | ⬜ | | | | 15 ngày (không phải 14) |
| `onboarding:trial-expired` | Thông báo hết trial | state `expiredSeen` | P | ⬜ | | | | |
| `onboarding:provisioning` | "Đang khởi tạo workspace…" | — | M | ⬜ | — | | | D21 |

## F2 — Tổng quan · Hộp thư · Khách hàng

| ID | Màn · trạng thái | Prototype | Loại | TT | diffRatio | Mobile 390 | Commit | Ghi chú |
|----|------------------|-----------|------|----|-----------|-----------|--------|---------|
| `dashboard:default` | Tổng quan có dữ liệu | L1079 | P | ⬜ | | | | |
| `dashboard:new-workspace` | Tổng quan workspace mới (onboarding checklist) | L1079 | P | ⬜ | | | | |
| `dashboard:widget-picker` | Chọn widget | L1139 | P | ⬜ | | | | |
| `inbox:default` | 3 cột, đang mở một hội thoại | L1505 | P | ⬜ | | | | |
| `inbox:empty` | Chưa có hội thoại | L1505 | P | ⬜ | | | | |
| `inbox:folder-rail` | Rail thư mục mở | L1602 | P | ⬜ | | | | |
| `inbox:conv-menu` | Menu hội thoại trong danh sách | L1675 | P | ⬜ | | | | |
| `inbox:chat-menu` | Menu trong khung chat | L1774 | P | ⬜ | | | | |
| `inbox:ai-panel` | Panel AI của hộp thư | L1509 | P | ⬜ | | | | |
| `inbox:connect-channel` | Modal kết nối kênh | L1548 | E | ⬜ | | | | Chỉ kênh có manifest |
| `inbox:account-switch` | Chọn tài khoản kênh | L1651 | P | ⬜ | | | | |
| `inbox:zalo-group-info` | Thông tin nhóm Zalo (thành viên / ảnh / file / link / AI) | L1928–1989 | P | ⬜ | | | | |
| `inbox:handoff` | Banner "Cần người" + bản nháp AI | L1505 | P | ⬜ | | | | |
| `customers:table` | Danh sách dạng bảng | L2451 | P | ⬜ | | | | |
| `customers:kanban` | Kanban theo giai đoạn | L2451 | P | ⬜ | | | | |
| `customers:filter` | Bộ lọc mở | L2496 | P | ⬜ | | | | |
| `customers:edit` | Form tạo / sửa khách | L2600 | P | ⬜ | | | | |
| `customers:dedupe` | Kiểm trùng / gộp | L2626 | P | ⬜ | | | | |
| `customers:fields` | Cấu hình cột / trường | L2684 | P | ⬜ | | | | |
| `customers:360` | Hồ sơ 360° | L2724 | P | ⬜ | | | | |
| `customers:ai` | Panel AI của khách hàng | L2938 | P | ⬜ | | | | |
| `customers:collaborators` | Người phụ trách + đồng phụ trách | — | M | ⬜ | — | | | D32 |
| `customers:access-request` | "Đã có người phụ trách" + Xin chia sẻ | — | M | ⬜ | — | | | D32 |
| `customers:transfer-owner` | Chuyển phụ trách | — | M | ⬜ | — | | | D32 |

## F3 — Trợ lý AI · AI Agents · Duyệt · Nhật ký

| ID | Màn · trạng thái | Prototype | Loại | TT | diffRatio | Mobile 390 | Commit | Ghi chú |
|----|------------------|-----------|------|----|-----------|-----------|--------|---------|
| `assistant:chat-welcome` | Trợ lý, chế độ Chat, màn chào | L1178 | P | ⬜ | | | | |
| `assistant:cowork-welcome` | Trợ lý, chế độ Cowork, màn chào | L1178 | P | ⬜ | | | | |
| `assistant:thread` | Hội thoại có plan + confirm + result card | L1178 | P | ⬜ | | | | Dữ liệu kịch bản mock |
| `assistant:attach` | Menu "+" đính kèm | L640 | P | ⬜ | | | | |
| `assistant:model-picker` | Chọn mức AI | L656 | E | ⬜ | | | | Mức AI, ẩn tên model (D29) |
| `assistant:agent-picker` | Chọn agent | L668 | P | ⬜ | | | | |
| `assistant:cowork-new` | Tạo tác vụ Cowork | L1318 | P | ⬜ | | | | |
| `assistant:cowork-drawer` | Drawer tác vụ (prompt / kiến thức / công cụ / nhật ký) | L1388 | P | ⬜ | | | | |
| `agents:list` | Danh sách agent + thống kê | L2227 | E | ⬜ | | | | Ẩn "Mở Workflow" |
| `agents:template-gallery` | Thư viện mẫu theo ngành | L2227 | P | ⬜ | | | | |
| `agents:builder` | Builder tạo / sửa agent | L2292 | E | ⬜ | | | | Ẩn hành động OUT, mức AI (D29) |
| `agents:builder-templates` | Mẫu prompt trong builder | L2332 | P | ⬜ | | | | |
| `agents:test-chat` | Chat thử trong builder | L2292 | P | ⬜ | | | | dryRun |
| `agents:ai-create` | Tạo agent bằng Trợ lý AI | L2421 | E | ⬜ | | | | Thêm thẻ xác nhận "Tạo & xuất bản" (D29) |
| `agents:versions` | Lịch sử phiên bản, quay lại | — | M | ⬜ | — | | | D29 |
| `approvals:queue` | Hàng chờ duyệt | — | M | ⬜ | — | | | |
| `actions:log` | Nhật ký hành động + hoàn tác | L1464 | P | ⬜ | | | | |

## F4 — Sản phẩm · Báo giá · Hợp đồng · Đơn · Đề nghị thanh toán

| ID | Màn · trạng thái | Prototype | Loại | TT | diffRatio | Mobile 390 | Commit | Ghi chú |
|----|------------------|-----------|------|----|-----------|-----------|--------|---------|
| `products:list` | Danh sách sản phẩm | L5624 | P | ⬜ | | | | |
| `products:detail` | Chi tiết sản phẩm | L5624 | P | ⬜ | | | | |
| `products:create` | Tạo sản phẩm | L5624 | P | ⬜ | | | | 6 loại |
| `quotes:list` | Danh sách báo giá | L4957 | P | ⬜ | | | | Hiệu lực 15 ngày |
| `quotes:editor` | Soạn báo giá (dòng, chiết khấu, thuế sau CK) | L4957 | P | ⬜ | | | | |
| `quotes:detail` | Chi tiết báo giá + các version | L4957 | P | ⬜ | | | | |
| `quotes:draft-from-content` | AI soạn báo giá từ nội dung | — | M | ⬜ | — | | | D30 |
| `contracts:list` | Danh sách hợp đồng | L5343 | E | ⬜ | | | | "Ký số" → "Ký điện tử" |
| `contracts:kanban` | Kanban 4 cột (Nháp / Chờ ký / Đã ký / Hết hạn) | L5343 | E | ⬜ | | | | |
| `contracts:detail` | Drawer hợp đồng | L5343 | E | ⬜ | | | | |
| `contracts:create` | Form tạo hợp đồng | L4047 | P | ⬜ | | | | |
| `contracts:approve-sign` | Duyệt & ký (OTP + chữ ký) | — | M | ⬜ | — | | | D25 |
| `sign:public` | Trang ký công khai `/sign/[token]` | — | M | ⬜ | — | | | D25 |
| `orders:list` | Danh sách đơn (2 cột trạng thái) | L5489 | P | ⬜ | | | | Chip lọc theo COMMERCE §4 |
| `orders:detail` | Chi tiết đơn | L5489 | P | ⬜ | | | | |
| `orders:create` | Form tạo đơn | L4060 | P | ⬜ | | | | |
| `orders:marketplace` | Đơn từ sàn (badge nguồn, khoá dòng hàng) | — | M | ⬜ | — | | | D31 |
| `invoices:list` | Danh sách đề nghị thanh toán | L5233 | E | ⬜ | | | | "Hóa đơn" → "Đề nghị thanh toán" |
| `invoices:detail-qr` | Chi tiết + VietQR | L5233 | E | ⬜ | | | | |
| `invoices:record-payment` | Ghi nhận thanh toán | L5233 | E | ⬜ | | | | |

## F5 — Lịch hẹn · Ticket · Marketing · Khách thân thiết

| ID | Màn · trạng thái | Prototype | Loại | TT | diffRatio | Mobile 390 | Commit | Ghi chú |
|----|------------------|-----------|------|----|-----------|-----------|--------|---------|
| `calendar:week` | Lịch tuần | L3871 | P | ⬜ | | | | |
| `calendar:day` | Lịch ngày | L3871 | P | ⬜ | | | | |
| `calendar:month` | Lịch tháng | L3871 | P | ⬜ | | | | |
| `calendar:list` | Danh sách lịch hẹn | L3871 | P | ⬜ | | | | |
| `calendar:appointment` | Drawer lịch hẹn | L3871 | P | ⬜ | | | | |
| `calendar:create` | Tạo lịch hẹn + chọn slot | L3871 | P | ⬜ | | | | |
| `tickets:list` | Danh sách ticket + KPI | L4837 | P | ⬜ | | | | |
| `tickets:kanban` | Kanban 4 cột | L4837 | P | ⬜ | | | | |
| `tickets:detail` | Drawer ticket (timeline, SLA) | L4837 | P | ⬜ | | | | |
| `marketing:suggestions` | Bảng gợi ý chiến dịch | L3394 | E | ⬜ | | | | Kênh chỉ Zalo cá nhân + Email |
| `marketing:campaigns` | Danh sách chiến dịch | L3394 | E | ⬜ | | | | |
| `marketing:wizard` | Wizard tạo chiến dịch | L3394 | E | ⬜ | | | | |
| `marketing:analytics` | Chi tiết / thống kê chiến dịch | L3569 | P | ⬜ | | | | |
| `marketing:ai` | Panel AI marketing | L3538 | P | ⬜ | | | | |
| `loyalty:overview` | Tổng quan khách thân thiết | L4412 | P | ⬜ | | | | 10.000đ = 1 điểm |
| `loyalty:members` | Bảng thành viên | L4412 | P | ⬜ | | | | |
| `loyalty:adjust-points` | Điều chỉnh điểm (3 bước) | L4412 | P | ⬜ | | | | |
| `loyalty:config` | Cấu hình hạng / điểm | L4412 | P | ⬜ | | | | |

## F6 — Cài đặt · Gói & ví · popup

| ID | Màn · trạng thái | Prototype | Loại | TT | diffRatio | Mobile 390 | Commit | Ghi chú |
|----|------------------|-----------|------|----|-----------|-----------|--------|---------|
| `settings:shell` | SettingsShell (nav nhóm + tìm kiếm) | L5754 | E | ⬜ | | | | Ẩn mục OUT (Blueprint §7.2) |
| `settings:general` | Tổng quan workspace + giờ làm việc | L5824 | P | ⬜ | | | | |
| `settings:locale` | Ngôn ngữ & vùng | L6270 | E | ⬜ | | | | Chỉ vi / en |
| `settings:members` | Thành viên | L5861 | P | ⬜ | | | | |
| `settings:roles` | Vai trò & phân quyền (ma trận) | L5992 | E | ⬜ | | | | Chỉ đọc ở P0 (D27) |
| `settings:channels` | Kênh kết nối | L5892 | E | ⬜ | | | | Chỉ kênh có manifest |
| `settings:web-widget` | Trợ lý AI website (widget) | L7184 | P | ⬜ | | | | |
| `settings:fields` | Trường dữ liệu | L7099 | P | ⬜ | | | | |
| `settings:tags` | Thẻ & nhãn | L6031 | P | ⬜ | | | | |
| `settings:replies` | Câu trả lời mẫu | L6064 | P | ⬜ | | | | |
| `settings:doc-templates` | Mẫu chứng từ | — | M | ⬜ | — | | | D30 |
| `settings:doc-templates-docx` | Wizard DOCX + gán biến + bảng kiểm | — | M | ⬜ | — | | | D30 |
| `settings:integrations` | Nền tảng kết nối (thẻ "Sắp có") | L6219 | E | ⬜ | | | | D28 |
| `settings:integrations-connect` | Modal kết nối connector | L6219 | E | ⬜ | | | | D28 |
| `settings:ai-models` | AI Models | L6878 | E | ⬜ | | | | Mức AI, ẩn tên model (D29) |
| `settings:rag` | Dữ liệu RAG · Knowledge Base | L6906 | P | ⬜ | | | | D29 |
| `settings:ai-gov` | AI Governance | L6991 | P | ⬜ | | | | |
| `settings:ai-audit` | AI Audit log | L7035 | P | ⬜ | | | | |
| `settings:audit` | Audit log | L7024 | P | ⬜ | | | | |
| `settings:sla` | Thiết lập SLA (chính sách mặc định) | L7375 | E | ⬜ | | | | Chỉ chính sách mặc định |
| `settings:notifications` | Thông báo | L6200 | P | ⬜ | | | | |
| `settings:billing` | Gói & thanh toán | L5947 | E | ⬜ | | | | |
| `settings:wallet` | Ví AppChat (credit, lịch sử) | L6463 | E | ⬜ | | | | Bỏ "tự nạp" |
| `modal:upgrade` | Popup Nâng cấp (Cá nhân / Doanh nghiệp, 4 gói) | L985 | P | ⬜ | | | | |
| `modal:buy-credit` | Mua thêm credit (QR) | L915 | E | ⬜ | | | | |
| `profile:me` | Hồ sơ của tôi | L1034 (menu) | P | ⬜ | | | | |

## F7 — Rà soát cuối

| ID | Việc | Prototype | Loại | TT | diffRatio | Mobile 390 | Commit | Ghi chú |
|----|------|-----------|------|----|-----------|-----------|--------|---------|
| `f7:mobile-sweep` | Rà mọi màn ở 390×844 | — | C | ⬜ | — | | | |
| `f7:en-coverage` | `pnpm i18n:check`: en đủ 100% key | — | C | ⬜ | — | — | | |
| `f7:parity-all` | `pnpm parity --all` xanh | — | C | ⬜ | | — | | |
| `f7:file-size` | Không file nào vượt trần; page ≤ 120, screen ≤ 250 | — | C | ⬜ | — | — | | |
| `f7:roles` | Đổi 5 vai trò ở dev toolbar, nút / chip đúng Blueprint §3.5 | — | C | ⬜ | — | — | | |

---

## Completion Reports

> Mỗi pha một mục, theo mẫu Completion Report trong `BUILDER-HANDOFF.md` (STATUS, COMMIT, FILES CHANGED, TEST RESULTS, ISSUES, DEVIATIONS, SUGGESTIONS).

### F0
_chưa có_

### F1
_chưa có_

### F2
_chưa có_

### F3
_chưa có_

### F4
_chưa có_

### F5
_chưa có_

### F6
_chưa có_

### F7
_chưa có_

## Escalation log

| Ngày | ID | Mức (L2 / L3) | Vấn đề | Đề xuất | Quyết định | Người quyết |
|------|----|---------------|--------|---------|------------|-------------|
| | | | | | | |
