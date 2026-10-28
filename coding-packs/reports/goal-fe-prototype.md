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

| Pha | Nội dung | Số dòng | ✅ | ❌ / ⛔ | Completion Report | Commit cuối pha | PR → dev |
|-----|----------|--------:|---:|-------:|-------------------|-----------------|----------|
| F0 | Scaffold, theme, shell, công cụ | 15 | 15 | 0 | ✅ | be02d86 | [#2](https://github.com/duymt-dev/AppChat/pull/2) |
| F1 | Auth & onboarding | 10 | 10 | 0 | ✅ | e3433b8 | [#3](https://github.com/duymt-dev/AppChat/pull/3) (xếp chồng #2) |
| F2 | Tổng quan · Hộp thư · Khách hàng | 25 | 0 | 0 | ⬜ | | |
| F3 | Trợ lý AI · AI Agents · Duyệt · Nhật ký | 17 | 0 | 0 | ⬜ | | |
| F4 | Sản phẩm · Báo giá · Hợp đồng · Đơn · Đề nghị thanh toán | 20 | 0 | 0 | ⬜ | | |
| F5 | Lịch hẹn · Ticket · Marketing · Khách thân thiết | 18 | 0 | 0 | ⬜ | | |
| F6 | Cài đặt · Gói & ví · popup | 26 | 0 | 0 | ⬜ | | |
| F7 | Rà soát cuối | 5 | 0 | 0 | ⬜ | | |
| **Tổng** | | **136** | **25** | **0** | | | |

---

## F0 — Scaffold, theme, shell, công cụ

| ID | Màn · trạng thái | Prototype | Loại | TT | diffRatio | Mobile 390 | Commit | Ghi chú |
|----|------------------|-----------|------|----|-----------|-----------|--------|---------|
| `f0:workspace` | Root monorepo đúng Blueprint §1.1; `apps/web`, `packages/{ui,shared,actions}` | — | C | ✅ | — | — | e7b9d14 | pnpm 11 + turbo; apps/web, packages/{ui,shared,actions}, tools/parity |
| `f0:theme` | `packages/ui/theme.ts` lấy token từ CSS prototype | L39–392 | C | ✅ | — | — | e7b9d14 | `packages/ui/src/tokens.ts` + `theme.ts` (giá trị lấy nguyên từ prototype) |
| `f0:icons` | 54 icon sprite `#ic-*` → `packages/ui/icons` | L396–455 | C | ✅ | — | — | e7b9d14 | 54 `ic-*` + 6 `lg-*` sinh từ sprite (`tools/scripts/gen-icons.mjs`), giữ path SVG gốc |
| `f0:i18n` | next-intl vi + en, fallback, `fmt.*`, đồng bộ antd / dayjs | — | C | ✅ | — | — | e7b9d14 | next-intl vi + en (cookie NEXT_LOCALE), fallback → en → vi, `fmt.*`, antd + dayjs đồng bộ; i18n:check 90/90 key |
| `f0:lint` | Lint size (400 FE), boundaries, i18next; typecheck; CI `.github/workflows/{ci,parity,e2e,full}.yml` (D40) | — | C | ✅ | — | — | e7b9d14 | eslint boundaries + i18next + no-restricted-imports; lint:size; ci/parity/e2e/full.yml |
| `f0:mock` | Mock transport + mock action executor + fixtures + dev toolbar đổi vai trò | L7668+ | C | ✅ | — | — | e7b9d14 | mock transport + mock ActionExecutor (zod, quyền, bulk→202, undo) + fixture shell + dev toolbar 5 vai trò |
| `f0:parity-tool` | `tools/parity` + `parity.manifest.ts` + baseline + đồng hồ cố định | — | C | ✅ | — | — | e7b9d14 | baseline offline (React/Babel vendor, font @fontsource), clock 2026-06-24 09:00, gỡ mục OUT khỏi DOM prototype |
| `f0:e2e-mobile` | Harness Playwright 390×844 | — | C | ✅ | — | pass | e7b9d14 | Playwright desktop 1440 + mobile-390; `pnpm e2e <module>` / `--changed` |
| `shell:default` | AppShell + NavRail mở, đáy rail (search, thông báo, Nâng cấp, trial, avatar) | L637–1078 | E | ✅ | 0.0015 | pass | e7b9d14 | Ẩn Gọi điện / Quy trình / Báo cáo (D07, D19) · Rail mở rộng; Gọi điện / Quy trình gỡ ở cả hai bên (D07, D19) |
| `shell:rail-collapsed` | Rail thu gọn | L800 | P | ✅ | 0.0001 | pass | e7b9d14 |  |
| `shell:flyout-crm` | Flyout nhóm Khách hàng & CRM | L814+ | P | ✅ | 0.0020 | n/a (chỉ có trên rail ≥ md; shell 390 → `shell:mobile-tabbar` pass) | e7b9d14 | "Hóa đơn" → "Đề nghị thanh toán" (vùng chữ nằm trong ngưỡng) |
| `shell:notifications` | Popover thông báo | L903 | P | ✅ | 0.0001 | n/a (chỉ có trên rail ≥ md; shell 390 → `shell:mobile-tabbar` pass) | e7b9d14 |  |
| `shell:user-menu` | Menu avatar + đổi workspace + ngôn ngữ | L1034–1052 | E | ✅ | 0.0001 | n/a (chỉ có trên rail ≥ md; shell 390 → `shell:mobile-tabbar` pass) | e7b9d14 | Chỉ hiện vi / en (D22) · Ẩn "Đối tác tiếp thị" (OUT); ngôn ngữ chỉ vi / en (D22) |
| `shell:assistant-dock` | AssistantDock mở trên một màn | L820 | P | ✅ | 0.0062 | pass (dock toàn màn < md) | e7b9d14 | So khung dock (khung "phiên bản thu nhỏ" L2938); thân dock theo màn đo ở assistant:* (F3) — mask ghi trong manifest |
| `shell:mobile-tabbar` | MobileTabBar 5 tab (< md) | — | M | ✅ | — | pass | e7b9d14 | Chỉ mobile · 5 tab + Drawer "Thêm" (placement bottom), vùng chạm ≥ 44px |

## F1 — Auth & onboarding

| ID | Màn · trạng thái | Prototype | Loại | TT | diffRatio | Mobile 390 | Commit | Ghi chú |
|----|------------------|-----------|------|----|-----------|-----------|--------|---------|
| `auth:login` | Đăng nhập | L471 | E | ✅ | 0.0198 | pass | e3433b8 | OTP Email, ẩn social login · Form email + mật khẩu mặc định; link "← Đăng nhập bằng mã OTP" thay "← Đăng nhập qua Zalo" (D-OTP); lưới social gỡ khỏi DOM prototype (ẩn, D-OTP) |
| `auth:register` | Đăng ký | L523 | E | ✅ | 0.0179 | pass | e3433b8 | Kênh Email (thẻ Zalo khoá, chờ OA — D-OTP); "14 ngày" → "15 ngày"; đăng ký 1 chạm ẩn. 3 bước: email → OTP → đã xác thực → popup khai báo |
| `auth:otp` | Nhập mã OTP | L459–630 | E | ✅ | 0.0305 | pass | e3433b8 | Gửi qua email (Brevo) · so với bước OTP Zalo của prototype; đích gửi là email (D-OTP). Đăng ký bước 2 dùng cùng OtpInput + đếm ngược gửi lại 0:48 |
| `auth:forgot` | Quên mật khẩu | L588 | P | ✅ | 0.0171 | pass | e3433b8 | Luôn báo "Đã gửi" kể cả email lạ (chống dò tài khoản, REQ-A01); e2e kiểm trạng thái đã gửi |
| `auth:reset` | Đặt lại mật khẩu (link 15 phút) | — | M | ✅ | — | pass | e3433b8 | `/reset-password?token=` · khung + pattern của Quên mật khẩu; ≥ 8 ký tự, 2 ô phải khớp; token lỗi → thông báo link hết hạn |
| `onboarding:declare-business` | Popup khai báo DN / hộ KD (tra MST) | L758–766 | P | ✅ | 0.0306 | pass | e3433b8 | Không đóng được · đo khung thẻ sau khi tra MST 0312345678; MST không thấy → nhập tay (OQ-05); ghi qua `business_profile.update` |
| `onboarding:declare-individual` | Popup khai báo cá nhân | L776 | P | ✅ | 0.0299 | pass | e3433b8 | VNeID 12 số bắt buộc (zod refine) |
| `onboarding:trial-welcome` | Màn chào mừng trial (2 nút) | state `trialWelcome` | E | ✅ | 0.0257 | pass | e3433b8 | 15 ngày (không phải 14) · ngày hết hạn theo `fmt.date`; "Xem bảng giá" → /settings/billing?upgrade=1 |
| `onboarding:trial-expired` | Thông báo hết trial | state `expiredSeen` | P | ✅ | 0.0365 | pass | e3433b8 | Đóng bằng X / nền / Esc; ghi nhận qua `/session/ack` |
| `onboarding:provisioning` | "Đang khởi tạo workspace…" | — | M | ✅ | — | pass | e3433b8 | D21 · poll `GET /workspaces/:id/provisioning` tới `ready`, lỗi → Thử lại; cùng thẻ popup onboarding |

## F2 — Tổng quan · Hộp thư · Khách hàng

| ID | Màn · trạng thái | Prototype | Loại | TT | diffRatio | Mobile 390 | Commit | Ghi chú |
|----|------------------|-----------|------|----|-----------|-----------|--------|---------|
| `f2:token-scale` | Chuẩn hoá thang token D41 (chữ / bo góc / viền / spacing) + đo lại F0–F1 | L39–392 | C | ✅ | — | pass | 5d41c73 | D41 · `tokens.ts` thang đều + `tokens.test.ts` + `lint:tokens`; prototype chuẩn hoá bằng `tools/scripts/normalize-prototype.mjs` (9.717 giá trị, chạy lại ra cùng kết quả). Đo lại F0–F1 trên prototype mới: shell:default 0.0109 · rail-collapsed 0.0001 · flyout-crm 0.0020 · notifications 0.0001 · user-menu 0.0001 · assistant-dock 0.0062 · auth:login 0.0192 · otp 0.0315 · register 0.0186 · forgot 0.0164 · declare-business 0.0316 · declare-individual 0.0301 · trial-welcome 0.0261 · trial-expired 0.0375 |
| `dashboard:default` | Tổng quan có dữ liệu | L1079 | P | ✅ | 0.0171 | pass | db52d91 | Checklist thu gọn (obCollapsed) + 4 thống kê + 4 thẻ + trung tâm cập nhật; pill module bỏ Gọi điện / Quy trình (D07, D19) |
| `dashboard:new-workspace` | Tổng quan workspace mới (onboarding checklist) | L1079 | P | ✅ | 0.0085 | pass | db52d91 | Checklist 5 bước mở, 0/5 (mặc định prototype); đánh dấu qua `onboarding.toggle_step` |
| `dashboard:widget-picker` | Chọn widget | L1139 | P | ✅ | 0.0257 | pass | db52d91 | L1139 = "Trung tâm cập nhật" (prototype không có bộ chọn widget riêng): 3 tab Cần follow / Tin tức / Thông báo, thu nhỏ thành nút "Cập nhật"; `follow_up.complete` hoàn tác 24h |
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
### COMPLETION REPORT — GOAL-FE-PROTOTYPE · F0

**STATUS:** DONE
**COMMIT:** e7b9d14 trên nhánh `goal/fe-prototype` (tách từ `origin/dev` 6119d62)

**FILES CHANGED:**
- Created: root `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `.prettierrc`, `.gitattributes`: workspace pnpm 11 + turbo.
- Created: `packages/shared`: permissions + 5 vai trò + data scope (Blueprint §3.5), registry 11 ngôn ngữ (bật vi / en), `fmt.*`, API envelope + error codes.
- Created: `packages/actions`: `defineAction`, `UiCommand`, `ActionResult` / `ActionAccepted` (Blueprint §3.1, §4.3), action shell (`notification.mark_read`, `profile.update`, `workspace.switch`).
- Created: `packages/ui`: `tokens.ts` (giá trị prototype), `theme.ts` (antd ConfigProvider), `Icon` + 60 icon từ sprite.
- Created: `apps/web`:
  - Next 16 App Router, next-intl, providers (antd + Query + dayjs).
  - `shared/{api,actions,authz,assistant,realtime,states,shell,dev,i18n}`.
  - Route stub cho mọi module P0.
  - messages vi / en.
- Created: `fixtures/prototype-parity/shell.json`: dữ liệu shell trích nguyên văn từ prototype.
- Created: `tools/parity`: manifest, capture (baseline offline), compare, CLI `<id> | --done | --all | --changed`.
- Created: `tools/scripts/{lint-size,i18n-check,e2e,gen-icons}.mjs`.
- Created: `.github/workflows/{ci,parity,e2e,full}.yml`.

**TEST RESULTS:** (full gate cuối pha, chạy local)
- `pnpm lint`: 5/5 task xanh; `lint:size`: 137 file, không file nào vượt trần.
- `pnpm typecheck`: 5/5 xanh.
- `pnpm test`: shared 11 passed, actions 3 passed, web 11 passed (0 failed).
- `pnpm i18n:check`: vi 90 / en 90 key (100%).
- `pnpm build`: xanh.
- `pnpm parity --all`:
  - shell:default 0.0015
  - shell:rail-collapsed 0.0001
  - shell:flyout-crm 0.0020
  - shell:notifications 0.0001
  - shell:user-menu 0.0001
  - shell:assistant-dock 0.0062
- `pnpm e2e` (desktop + mobile-390): 5 passed, 3 skipped. Các test skip là test chỉ chạy ở một viewport: test desktop bỏ qua ở mobile và ngược lại.
- Tenant / role isolation: N/A (chưa có backend). Quyền UI kiểm bằng e2e "dev toolbar đổi vai trò": vai trò Kế toán làm ẩn Hộp thư / AI Agents.
- Không chạy được: CI GitHub (chưa push lúc viết report). Xem link PR ở bảng tiến độ.

**ISSUES DISCOVERED:**
- Thấp: `support.js` của prototype tải React / Babel từ unpkg. Đã lưu bản cố định ở `tools/parity/vendor/` (3,2 MB) để đo offline và ổn định trên CI.
- Thấp: nút "Nâng cấp" trong prototype khai inline `height:46px`, nhưng class `.btnp` ép về 36px. V2 lấy giá trị **hiển thị thật** (36px).

**DEVIATIONS FROM SPEC:**
- `shell:assistant-dock`: prototype không có dock chung; dock lấy theo khung "Trợ lý AI · phiên bản thu nhỏ" (L2938). Chỉ đo pixel phần khung (đầu, chân, nút gửi). Tiêu đề, thân và placeholder theo màn được mask; phần nội dung đo ở `assistant:*` (F3). Lý do ghi trong `parity.manifest.ts`.
- Mục OUT (Gọi điện, Quy trình, Đối tác tiếp thị) được gỡ khỏi DOM prototype trước khi chụp, đúng `prototype-parity` §7: các mục còn lại dồn lên như prototype đã bỏ mục đó.
- Thêm action `workspace.switch` (prototype có đổi workspace trong menu avatar, Blueprint §3.4 chưa có id). Đề xuất bổ sung vào danh mục identity.

**SUGGESTIONS FOR CHỦ THẦU:**
- Bật branch protection cho `dev` với check `ci` (+ `parity`, `e2e`) như `git-flow-ci` §4.
- Bổ sung `workspace.switch` vào Blueprint §3.4.

### F1
### COMPLETION REPORT — GOAL-FE-PROTOTYPE · F1

**STATUS:** DONE
**COMMIT:** e3433b8 trên nhánh `goal/fe-prototype` (nối tiếp F0, PR #2)

**FILES CHANGED:**
- Created: `apps/web/src/features/auth`:
  - `screens/{Login,Register,Forgot,ResetPassword}Screen.tsx`.
  - `components/{AuthLayout,BrandPanel,AuthButton,EmailField,OtpInput}.tsx`.
  - `hooks/useAuthFlow.ts`, `api.ts`, `auth*.styles.ts`, `index.ts`.
- Created: `apps/web/src/features/onboarding`:
  - `components/{OnboardingGate,DeclareBusinessModal,DeclareStepInfo,ProvisioningCard,TrialWelcome,TrialExpired}.tsx`.
  - `hooks/useDeclareForm.ts`, `*.styles.ts`, `index.ts`.
- Created: routes `app/(auth)/{login,register,forgot-password,reset-password}`.
- Modified: `(app)/layout.tsx` bọc `OnboardingGate`. Cổng theo thứ tự:
  1. chưa đăng nhập → `/login`;
  2. chưa khai báo → popup khai báo;
  3. đang khởi tạo → `ProvisioningCard`;
  4. sau đó → chào mừng trial;
  5. trial hết → thông báo hết trial.
- Created: `packages/actions/src/onboarding.ts` với `business_profile.update` (zod: MST 10 / 13 số, VNeID 12 số).
- Mock:
  - Created: `session.ts`, `auth-routes.ts`.
  - Modified: routes `/session`, `/auth/brand`, `/workspace/provisioning`, `/business-lookup/tax/:code`.
  - Modified: `transport.post`, cùng handler `business_profile.update`.
- Created: `fixtures/prototype-parity/auth.json`.
- Modified: `packages/ui/tokens.ts`. Thêm màu / gradient / bóng / cỡ chữ auth + onboarding, và `mq.auth` = 1100px (breakpoint prototype).
- Modified: `tools/parity`:
  - `protoWait` / `appWait` cho màn không có shell;
  - `clipTo` so khung popup;
  - 8 entry F1.
- Created: messages `auth.json`, `onboarding.json` (vi + en).
- Created: e2e `auth.spec.ts`, `onboarding.spec.ts`; unit `auth-routes.test.ts`.
- Modified: `UserMenu` "Đăng xuất" gọi `/auth/logout`.
- Modified: DevToolbar dời xuống góc dưới phải, không che nút đóng popup trên mobile.

**TEST RESULTS:** (full gate cuối pha, chạy local)
- `pnpm lint`: 5/5 xanh; `lint:size`: 172 file, không file nào vượt trần.
- `pnpm typecheck`: 5/5 xanh.
- `pnpm test`: shared 11, actions 3, web 16 passed (0 failed).
- `pnpm i18n:check`: vi 239 / en 239 key (100%).
- `pnpm parity --all`: 14/14 PASS.
  - F0, không đổi: shell:default 0.0015, rail-collapsed 0.0001, flyout-crm 0.0020, notifications 0.0001, user-menu 0.0001, assistant-dock 0.0062.
  - F1: auth:login 0.0198, auth:otp 0.0305, auth:register 0.0179, auth:forgot 0.0171, onboarding:declare-business 0.0306, onboarding:declare-individual 0.0299, onboarding:trial-welcome 0.0257, onboarding:trial-expired 0.0365.
- `pnpm e2e` (build + start, desktop + mobile-390): 23 passed, 5 skipped. Test skip là test chỉ chạy ở một viewport.
- Mobile 390:
  - auth: không tràn ngang; input và nút ≥ 44px.
  - Popup onboarding toàn màn (390px), không tràn ngang; vùng chạm ≥ 44px.

**ISSUES DISCOVERED:**
- Thấp: `responsive.xl` của antd-style là `max-width: 1599px`, nên ẩn BrandPanel ngay ở 1440. Đã thêm token `mq.auth` = 1100px, đúng breakpoint prototype.
- Thấp: DevToolbar (chỉ có ở mock) ở góc trên phải che nút X của popup trên 390. Đã dời xuống dưới.

**DEVIATIONS FROM SPEC:**
- D-OTP (OQ-02):
  - OTP gửi qua Email thay Zalo.
  - Form mặc định là email + mật khẩu.
  - Thẻ "Qua Zalo" ở bước đăng ký bị khoá, ghi "Sắp có — cần Zalo OA".
  - Ẩn đăng nhập / đăng ký mạng xã hội. Lưới social bị gỡ khỏi DOM prototype trước khi chụp, cùng cơ chế với mục OUT.
- Trial 15 ngày: thay "14 ngày" ở bước đăng ký.
- Mục báo của declare-individual: prototype hiện banner "Đã tìm thấy…" cho cá nhân dù không có tra cứu. V2 giữ khung banner nhưng đổi chữ thành "Nhập đúng thông tin trên CCCD / VNeID" cho đúng nghĩa. Vùng chữ nằm trong ngưỡng.
- `auth:otp` đo bước nhập mã của luồng đăng nhập (prototype: Zalo; V2: email).
- Sau OTP đăng ký, mock đặt phiên về "chưa khai báo" để đi hết popup khai báo → khởi tạo → chào mừng.

**SUGGESTIONS FOR CHỦ THẦU:**
- Chốt nội dung email OTP / đặt lại mật khẩu (Brevo template, D34) trước khi nối backend.
- PR #2 (F0) chưa merge nên F1 đi chung nhánh: PR F1 mở từ nhánh `goal/fe-prototype-f1`, xếp chồng lên F0.

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
