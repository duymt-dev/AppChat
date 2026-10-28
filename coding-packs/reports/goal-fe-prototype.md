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
| F2 | Tổng quan · Hộp thư · Khách hàng | 25 | 25 | 0 | ✅ | bf2b4a5 | [#4](https://github.com/duymt-dev/AppChat/pull/4) (xếp chồng #3) |
| F3 | Trợ lý AI · AI Agents · Duyệt · Nhật ký | 17 | 17 | 0 | ✅ | 51b50aa | [#5](https://github.com/duymt-dev/AppChat/pull/5) (xếp chồng #4) |
| F4 | Sản phẩm · Báo giá · Hợp đồng · Đơn · Đề nghị thanh toán | 21 | 21 | 0 | ✅ | e82bc84 | [#6](https://github.com/duymt-dev/AppChat/pull/6) (xếp chồng #5) |
| F5 | Lịch hẹn · Ticket · Marketing · Khách thân thiết | 18 | 0 | 0 | ⬜ | | |
| F6 | Cài đặt · Gói & ví · popup | 26 | 0 | 0 | ⬜ | | |
| F7 | Rà soát cuối | 5 | 0 | 0 | ⬜ | | |
| **Tổng** | | **137** | **88** | **0** | | | |

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
| `inbox:default` | 3 cột, đang mở một hội thoại | L1505 | P | ✅ | 0.0443 | pass | f38b33d | Tab trên 7 mục · danh sách 320 · chat kiểu WhatsApp (ghim, ảnh, voice, thẻ SP, tệp, AI phân tích, gợi ý trả lời) · Hồ sơ 360° 5 tab; kênh map về zalo_personal / webchat / email (§6 Kênh) |
| `inbox:empty` | Chưa có hội thoại | L1505 | P | ✅ | 0.0292 | pass | f38b33d | Prototype không có trạng thái rỗng: gỡ dòng hội thoại ở prototype, app seed `?inbox=empty` |
| `inbox:folder-rail` | Rail thư mục mở | L1602 | P | ✅ | 0.0445 | pass | f38b33d | Rail 216px: Hộp thư · Trạng thái AI · Kênh (chỉ 3 kênh phát hành) · Bộ lọc đã lưu |
| `inbox:conv-menu` | Menu hội thoại trong danh sách | L1675 | P | ✅ | 0.0416 | pass | f38b33d | Đóng / Tạm ẩn / Phân công / Gắn thẻ qua `conversation.set_status` / `assign` / `tag` |
| `inbox:chat-menu` | Menu trong khung chat | L1774 | P | ✅ | 0.0413 | pass | f38b33d | Thu hồi / Xoá tin / Lưu trữ / Ẩn / Xoá lịch sử (`message.recall`, `message.delete`*, `conversation.archive`, `conversation.clear_history`*) |
| `inbox:ai-panel` | Panel AI của hộp thư | L1509 | P | ✅ | 0.0480 | pass | f38b33d | Gỡ "Gửi template ZNS" ở prototype (ZNS OUT — D29); "Claude Cowork" → "AI Cowork" (không hiện tên model — D29) |
| `inbox:connect-channel` | Modal kết nối kênh | L1548 | E | ✅ | 0.0159 | pass | f38b33d | E — §6 Kênh / D28: zalo_personal, webchat, email kết nối được; kênh khác thẻ "Sắp có" (aria-disabled); gỡ thẻ Tổng đài (Gọi điện ẩn — D07) |
| `inbox:account-switch` | Chọn tài khoản kênh | L1651 | P | ✅ | 0.0091 | pass | f38b33d | Tài khoản theo channel registry; mask cột tên (§6 Kênh) |
| `inbox:zalo-group-info` | Thông tin nhóm Zalo (thành viên / ảnh / file / link / AI) | L1928–1989 | P | ✅ | 0.0468 | pass | f38b33d | Thành viên · link mời · bảng tin · Ảnh/Video · File · Link · AI trong nhóm (khi @ / tự động / tắt) · ẩn / xoá lịch sử |
| `inbox:handoff` | Banner "Cần người" + bản nháp AI | L1505 | P | ✅ | 0.0064 | pass | f38b33d | Không có trong prototype: dùng khung thẻ "AI gợi ý trả lời", mask chữ; `conversation.handoff` nhận xử lý, "Dùng bản nháp" đưa nháp vào ô soạn |
| `customers:table` | Danh sách dạng bảng | L2451 | P | ✅ | 0.0058 | pass | 3126b8f | `DataTable` (antd Table, primitive dùng chung) · 15 cột + checkbox · nguồn map về kênh có manifest (§6) · "Tạo hóa đơn" → "Đề nghị thanh toán" · < md thẻ `mobileCard` |
| `customers:kanban` | Kanban theo giai đoạn | L2451 | P | ✅ | 0.0343 | pass | 3126b8f | `KanbanBoard` primitive · 6 giai đoạn · kéo thả → `contact.set_stage` · gắn / bỏ tag → `contact.tag` |
| `customers:filter` | Bộ lọc mở | L2496 | P | ✅ | 0.0081 | pass | 3126b8f | `FilterPopover` primitive (nhóm · nguồn · tags · pipeline) + `FilterSelect` (phạm vi · trạng thái · phụ trách) |
| `customers:edit` | Form tạo / sửa khách | L2600 | P | ✅ | 0.0130 | pass | 3126b8f | Cập nhật 560px (`ModalShell`) → `contact.update`; Tạo liên hệ 720px 3 nhóm trường → `contact.create` |
| `customers:dedupe` | Kiểm trùng / gộp | L2626 | E | ✅ | 0.0084 | pass | 3126b8f | "CLAUDE GỢI Ý" → "AI GỢI Ý" (D29) · gộp → `contact.merge` (bulk → xác nhận) · không khớp → "nhập với Trợ lý AI" |
| `customers:fields` | Cấu hình cột / trường | L2684 | P | ✅ | 0.0313 | pass | 3126b8f | Bắt buộc / hiện → `custom_field.update` · thêm → `custom_field.define` · ví dụ biến template Email (bỏ ZNS — §6) |
| `customers:360` | Hồ sơ 360° | L2724 | P | ✅ | 0.0336 | pass | 3126b8f | `EntityDrawer` 392px (< md từ dưới, full cao) · nội dung 5 tab dùng lại `Profile360Content` của hộp thư (export qua `features/inbox/index.ts`) |
| `customers:ai` | Panel AI của khách hàng | L2938 | E | ✅ | 0.0174 | pass | 3126b8f | Drawer `EntityDrawer` tinted · "Soạn ZNS" là mục OUT, gỡ khỏi prototype khi đo (§6) · kết quả phân tích mẫu, "Mở Kanban" / "Mở bảng hợp nhất" chạy thật |
| `customers:collaborators` | Người phụ trách + đồng phụ trách | — | M | ✅ | — | pass | 3126b8f | Menu ⋯ → "Người phụ trách": chính + đồng phụ trách / theo dõi · thêm / gỡ (chủ của khách hoặc `crm.reassign`) · Sales thấy khách đồng phụ trách trong scope `own` (badge "Đồng phụ trách") |
| `customers:access-request` | "Đã có người phụ trách" + Xin chia sẻ | — | M | ✅ | — | pass | 3126b8f | Tạo trùng SĐT / email với khách của người khác → `CONTACT_OWNED` (409), không lộ dữ liệu khách → "Xin chia sẻ" (`contact.request_access`) · duyệt trong modal Người phụ trách (`contact.decide_access`) |
| `customers:transfer-owner` | Chuyển phụ trách | — | M | ✅ | — | pass | 3126b8f | Chỉ `crm.reassign` (Sales không thấy mục) · chọn người nhận + chuyển kèm hội thoại / báo giá / lịch hẹn → `contact.transfer_owner`; doanh số chứng từ cũ giữ nguyên |

## F3 — Trợ lý AI · AI Agents · Duyệt · Nhật ký

| ID | Màn · trạng thái | Prototype | Loại | TT | diffRatio | Mobile 390 | Commit | Ghi chú |
|----|------------------|-----------|------|----|-----------|-----------|--------|---------|
| `assistant:chat-welcome` | Trợ lý, chế độ Chat, màn chào | L1178 | P | ✅ | 0.0265 | pass | ccaad26 | Pill mức AI mask (D29) |
| `assistant:cowork-welcome` | Trợ lý, chế độ Cowork, màn chào | L1178 | P | ✅ | 0.0260 | pass | ccaad26 | Pill + tag thẻ agent: mức AI (D29) — mask |
| `assistant:thread` | Hội thoại có plan + confirm + result card | L1178 | P | ✅ | 0.0030 | pass | ccaad26 | Dữ liệu kịch bản mock; Kịch bản omiIntent/omiReply qua POST /assistant/messages + /confirm |
| `assistant:attach` | Menu "+" đính kèm | L640 | P | ✅ | 0.0242 | pass | ccaad26 |  |
| `assistant:model-picker` | Chọn mức AI | L656 | E | ✅ | 0.0359 | pass | ccaad26 | Mức AI, ẩn tên model (D29); Tiêu chuẩn / Nâng cao / Tối đa, không tên model (D29) |
| `assistant:agent-picker` | Chọn agent | L668 | P | ✅ | 0.0339 | pass | ccaad26 |  |
| `assistant:cowork-new` | Tạo tác vụ Cowork | L1318 | P | ✅ | 0.0176 | pass | ccaad26 | "Model thực thi" → "Mức AI thực thi" (D29) — mask; ghi qua ai_task.create |
| `assistant:cowork-drawer` | Drawer tác vụ (prompt / kiến thức / công cụ / nhật ký) | L1388 | P | ✅ | 0.0049 | pass | ccaad26 |  |
| `agents:list` | Danh sách agent + thống kê | L2227 | E | ✅ | 0.0053 | pass | 37a386a | Ẩn "Mở Workflow" (OUT) — mask; thêm mục "Agent của bạn" (bật / tạm dừng, mức AI, phiên bản, xoá) dưới thư viện — mask |
| `agents:template-gallery` | Thư viện mẫu theo ngành | L2227 | P | ✅ | 0.0213 | pass | 37a386a | Tìm + 3 select phụ thuộc + Xoá lọc, 20 mẫu / trang (45 mẫu, 3 trang); mẫu → builder |
| `agents:builder` | Builder tạo / sửa agent | L2292 | E | ✅ | 0.0116 | pass | 37a386a | Ẩn hành động OUT, mức AI (D29); "Mô hình AI" → "Mức AI", kênh theo registry (3) — mask 2 vùng; xuất bản = agent.create_and_publish / agent.update + agent.publish |
| `agents:builder-templates` | Mẫu prompt trong builder | L2332 | P | ✅ | 0.0382 | pass | 37a386a | 4 mẫu + "Tối ưu hóa" qua agent.optimize_prompt |
| `agents:test-chat` | Chat thử trong builder | L2292 | P | ✅ | 0.0008 | pass | 37a386a | dryRun; mỗi lượt gọi agent.test (risk read), kèm dòng ghi chú chạy thử |
| `agents:ai-create` | Tạo agent bằng Trợ lý AI | L2421 | E | ✅ | 0.0074 | pass | 37a386a | Thêm thẻ xác nhận "Tạo & xuất bản" (D29); mô tả → agent.draft_from_description → agent.create_and_publish \| "Mở trong builder" mang bản nháp sang |
| `agents:versions` | Lịch sử phiên bản, quay lại | — | M | ✅ | — | pass | 37a386a | D29; drawer 392 của AI Agents, mỗi lần xuất bản = 1 phiên bản, quay lại = agent.rollback (tạo phiên bản mới) |
| `approvals:queue` | Hàng chờ duyệt | — | M | ✅ | — | pass | 7b66250 | Màn mới; duyệt cần approvals.decide + quyền action gốc (Quản lý không duyệt hoàn tiền) |
| `actions:log` | Nhật ký hành động + hoàn tác | L1464 | P | ✅ | 0.0232 | pass | 7b66250 | Workflow / ZNS (OUT) → Ticket / Zalo — mask 2 ô |

## F4 — Sản phẩm · Báo giá · Hợp đồng · Đơn · Đề nghị thanh toán

| ID | Màn · trạng thái | Prototype | Loại | TT | diffRatio | Mobile 390 | Commit | Ghi chú |
|----|------------------|-----------|------|----|-----------|-----------|--------|---------|
| `products:list` | Danh sách sản phẩm | L5624 | P | ✅ | 0.0373 | pass | 81dba0d | DataTable + KanbanBoard theo danh mục; giá vốn chỉ hiện với `catalog.cost_view`; nguồn đồng bộ theo connector registry (Zalo cá nhân, Website; sàn / POS "Sắp có" — D28/D31) — mask hàng chip |
| `products:detail` | Chi tiết sản phẩm | L5624 | P | ✅ | 0.0199 | pass | 81dba0d | EntityDrawer (thêm prop `header`) · 5 tab; prototype khoá cứng `pdDetailOn: false` nên entry parity bật cờ qua `protoOverrideVals` |
| `products:create` | Tạo sản phẩm | L5624 | P | ✅ | 0.0229 | pass | 81dba0d | 6 loại (khối nhập theo loại), danh mục mới (`category.create`), trường riêng, thuộc tính → biến thể; lưu `product.create` / `product.update`; ModalShell thêm biến thể `dense` |
| `quotes:list` | Danh sách báo giá | L4957 | P | ✅ | 0.0233 | pass | 49c3a9c | Hiệu lực 15 ngày (cột Hết hạn = gửi + 15); chip theo trạng thái COMMERCE §3; DataTable + Kanban 4 cột; scope sales `own`; tổng = `quoteTotals` (thuế sau CK, không trừ điểm) |
| `quotes:editor` | Soạn báo giá (dòng, chiết khấu, thuế sau CK) | L4957 | P | ✅ | 0.0180 | pass | 49c3a9c | Form 720 (crmSpec quotes): dòng từ catalog / ngoài danh mục, CK dòng + CK tổng, thuế theo dòng; cảnh báo ngưỡng 20tr / 5% / ngoài danh mục; `quote.create` |
| `quotes:detail` | Chi tiết báo giá + các version | L4957 | P | ✅ | 0.0400 | pass | 49c3a9c | 4 tab; chân theo trạng thái (gửi duyệt → duyệt → gửi → chốt → Hợp đồng / Đơn); `request_revision` tạo Lần n+1, tab Lịch sử liệt kê version; mask: tổng (không trừ điểm — COMMERCE §3), hàng nút gửi (ZBS/SMS OUT) |
| `quotes:draft-from-content` | AI soạn báo giá từ nội dung | — | M | ✅ | — | pass | 49c3a9c | D30: `quote.draft_from_content` (mock khớp catalog, giá từ catalog, ngoài danh mục buộc duyệt, chỉ nháp); mở từ Trợ lý AI · Báo giá |
| `contracts:list` | Danh sách hợp đồng | L5343 | E | ✅ | 0.0344 | pass | c1485f8 | "Ký số" → "Ký điện tử" (COMMERCE §9); chip 4 trạng thái (Chờ duyệt gộp Nháp + badge); DataTable + lọc Người tạo / Giá trị; scope sales `own` |
| `contracts:kanban` | Kanban 4 cột (Nháp / Chờ ký / Đã ký / Hết hạn) | L5343 | E | ✅ | 0.0200 | pass | c1485f8 | KanbanBoard theo `chipOf(status)`; Từ chối / Đã chấm dứt chỉ ở "Tất cả" |
| `contracts:detail` | Drawer hợp đồng | L5343 | E | ✅ | 0.0147 | pass | c1485f8 | 5 tab (Tổng quan · CRM · AI · Tệp · Lịch sử = sự kiện ký); prototype khoá `ctDetailOn: false` → `protoOverrideVals`; mask: dòng "Ký điện tử" (đổi nhãn) + chân thao tác theo trạng thái (→ Đơn hàng / Chấm dứt / Gia hạn) |
| `contracts:create` | Form tạo hợp đồng | L4047 | P | ✅ | 0.0281 | pass | c1485f8 | Nút thật mở crmForm 720 (crmSpec.contracts L8407 — không phải cnNewOn L4047); `contract.create` luôn Nháp; kiểm bắt buộc + ngày kết thúc > bắt đầu; `?from_quote=` → `contract.create_from_quote` |
| `contracts:approve-sign` | Duyệt & ký (OTP + chữ ký) | — | M | ✅ | — | pass | c1485f8 | D25: `contract.approve_and_sign` (`contract.sign` — chỉ Owner) với OTP email + SignaturePad; Gửi ký = link một lần 7 ngày qua Zalo / Email; nhắc ký, gia hạn link, chấm dứt (lý do bắt buộc), gia hạn HĐ |
| `sign:public` | Trang ký công khai `/sign/[token]` | — | M | ✅ | — | pass | c1485f8 | D25: route `(public)` không đăng nhập; đồng ý → OTP (Zalo) → ký tay → chứng nhận (mã HĐ, SHA-256, thời điểm, lưu vết IP); sai OTP còn N lần, 5 lần khoá; Từ chối ký; link sai / hết hạn → trang báo |
| `orders:list` | Danh sách đơn (2 cột trạng thái) | L5489 | P | ✅ | 0.0337 | pass | 98aeb7e | Chip lọc theo COMMERCE §4 (mỗi chip lọc đúng trục); cột Thanh toán = pay_status, Trạng thái = tiến độ; Kanban 4 cột theo chip; lọc Người tạo / Giá trị / Nguồn |
| `orders:detail` | Chi tiết đơn | L5489 | P | ✅ | 0.0398 | pass | 98aeb7e | 5 tab; prototype khoá `odDetailOn: false` → `protoOverrideVals`; chân: Xác nhận (new → processing) · Hoàn tất (+điểm) · Huỷ (lý do; đã thu → yêu cầu hoàn tiền); vận chuyển nhập tay |
| `orders:create` | Form tạo đơn | L4060 | P | ✅ | 0.0293 | pass | 98aeb7e | Nút thật mở crmForm 720 (crmSpec.orders L8409 — không phải odNewOn L4060): dòng từ catalog, cọc ≤ tổng (bật deposit_required → Chờ cọc), giao hàng; `order.create`; `?from_quote=` / `?from_contract=` |
| `orders:marketplace` | Đơn từ sàn (badge nguồn, khoá dòng hàng) | — | M | ✅ | — | pass | 98aeb7e | D31: đơn Shopee mẫu (`source = marketplace`, `platform_status`), badge nguồn ở bảng / kanban / drawer, khoá dòng – giá – tổng, không tích điểm, không gửi đề nghị thanh toán; nút Đồng bộ sàn (`order.sync_now`, adapter thật P2) |
| `invoices:list` | Danh sách đề nghị thanh toán | L5233 | E | ✅ | 0.0202 | pass | cfb5a49 | "Hóa đơn" → "Đề nghị thanh toán" (COMMERCE §5, mã TT-00xxxx) — mask tiêu đề; 4 thẻ số liệu; tìm không dấu; scope sales `own`; nút "Cần đối soát (n)" cho vai trò có `payment.record` |
| `invoices:detail-qr` | Chi tiết + VietQR | L5233 | E | ✅ | 0.0273 | pass | cfb5a49 | Drawer 360° 5 tab; prototype khoá `ivDetailOn: false` → `protoOverrideVals`; VietQR (EMVCo NAPAS, số tiền = còn phải thu, nội dung = mã TT để khớp tự động) + dòng "không thay thế hoá đơn GTGT" — mask thẻ QR |
| `invoices:record-payment` | Ghi nhận thanh toán | L5233 | E | ✅ | 0.0286 | pass | cfb5a49 | `invoice.record_payment` (QR / CK / tiền mặt / thẻ, ≤ còn phải thu, phiếu thu PT-) → partial / paid, cộng `order.paid_total`; đo trạng thái đã thu đủ (prototype chỉ toast); "Cần đối soát" = `invoice.resolve_bank_match`; huỷ chỉ khi chưa thu |
| `invoices:create` | Form tạo đề nghị thanh toán | L8413 | P | ✅ | 0.0396 | pass | cfb5a49 | Nút thật mở crmForm 720 (crmSpec.invoices): đơn liên quan điền sẵn khách + số còn phải thu, loại cọc / đợt / toàn bộ, hạn +7 ngày, luôn Nháp; từ đơn "Đề nghị thanh toán" → `?order=` |

## F5 — Lịch hẹn · Ticket · Marketing · Khách thân thiết

| ID | Màn · trạng thái | Prototype | Loại | TT | diffRatio | Mobile 390 | Commit | Ghi chú |
|----|------------------|-----------|------|----|-----------|-----------|--------|---------|
| `calendar:week` | Lịch tuần | L3871 | P | ✅ | 0.0163 | pass | c84a299 | Lưới giờ 09–15h như prototype, cột thứ 22–28/06; ‹ › đổi tuần; bấm ô trống → form điền sẵn ngày/giờ |
| `calendar:day` | Lịch ngày | L3871 | P | ✅ | 0.0118 | pass | c84a299 | Blueprint §7.2 ViewSwitch(day) — prototype không có chế độ Ngày: so khung Tuần, mask lưới (làn KTV theo giờ mở cửa 08–19h) |
| `calendar:month` | Lịch tháng | L3871 | P | ✅ | 0.0153 | pass | c84a299 | Lưới 7 cột, ≤2 lịch/ngày + "+n lịch nữa"; hôm nay nền xanh; bấm ngày → chế độ Ngày |
| `calendar:list` | Danh sách lịch hẹn | L3871 | P | ✅ | 0.0388 | pass | c84a299 | Nhóm theo ngày; follow-up (cfu_*) xen theo giờ, "Xong" → follow_up.complete; lọc KTV/trạng thái/phòng ban; tìm không dấu |
| `calendar:appointment` | Drawer lịch hẹn | L3871 | P | ✅ | 0.0446 | pass | c84a299 | Chân theo trạng thái: Xác nhận → Khách đã đến → Hoàn thành; ⋯ Không đến / Huỷ (bắt buộc lý do). Trong gói → trừ 1 buổi; ngoài gói → chỉ gợi ý "Tạo đơn" (COMMERCE 8b); không cộng điểm. Mask tự động hoá SMS→Zalo (§6 Kênh) |
| `calendar:create` | Tạo lịch hẹn + chọn slot | L3871 | P | ✅ | 0.0279 | pass | c84a299 | Giờ bắt đầu chỉ chọn từ appointment.find_slots (dịch vụ + buffer + KTV); giờ kết thúc = thời lượng; trùng → CONFLICT; "Đổi giờ" giữ mã (exclude_id) |
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
### COMPLETION REPORT — GOAL-FE-PROTOTYPE · F2

**STATUS:** DONE
**COMMIT:** 3126b8f trên nhánh `goal/fe-prototype-f2` (xếp chồng F1 / PR #3)

**FILES CHANGED:**
- `f2:token-scale` (D41, 5d41c73):
  - `packages/ui/tokens.ts` theo thang đều (chữ / bo góc / spacing);
  - `tokens.test.ts`;
  - `tools/scripts/lint-tokens.mjs`;
  - đo lại F0–F1.
- Tổng quan (db52d91):
  - `features/dashboard/{screens,components,api,types}`;
  - action `onboarding.toggle_step`, `follow_up.complete`;
  - mock `domains/dashboard.ts`;
  - fixture `dashboard.json`.
- Hộp thư (f38b33d): `features/inbox`.
  - 3 cột · rail thư mục · danh sách · chat · composer + popover · hồ sơ 360° · thông tin nhóm Zalo · modal kết nối kênh · Trợ lý thu nhỏ · banner handoff.
  - Action `packages/actions/src/inbox.ts`: 13 action.
  - Mock `domains/inbox.ts` (+ test).
  - Fixture `inbox.json` (sinh bởi `tools/scripts/fixtures/gen-inbox.py`).
  - 3 icon mới.
- Khách hàng (44eac49, 3126b8f):
  - Primitive dùng chung trong `packages/ui/src/primitives` (Blueprint §7):
    - `DataTable` bọc antd Table, có `mobileCard` cho < md;
    - `KanbanBoard`, kéo thả → `onMove`;
    - `StageTabs` / `FilterSelect` / `FilterPopover`;
    - `EntityDrawer` 392px (< md từ dưới, full cao);
    - `ModalShell`, `PageHeader` + KPI, `ActionMenu`.
    - Ticket / Báo giá / Đơn / Sản phẩm dùng lại các primitive này.
  - `features/customers`:
    - screen orchestrator;
    - `columns.tsx`, `KanbanCard`, `CrmToolbar`, `CrmHeaderActions`;
    - modal sửa / tạo, kiểm trùng, trường mở rộng;
    - drawer 360°, drawer AI;
    - D32: Người phụ trách, Chuyển phụ trách, "Xin chia sẻ".
  - Hồ sơ 360° tách thành `Profile360Content` / `Profile360Actions`, export qua `features/inbox/index.ts` để dùng chung panel hộp thư và drawer Khách hàng.
  - Action `packages/actions/src/crm.ts`: `contact.create / update / set_stage / tag / delete / merge / add_collaborator / remove_collaborator / transfer_owner / request_access / decide_access`, `custom_field.define / update`.
  - Mock `domains/customers.ts`:
    - scope `own` gồm khách mình đồng phụ trách;
    - `CONTACT_OWNED` 409 không lộ dữ liệu khách;
    - có test.
  - Fixture `customers.json` (`gen-customers.py`).
- Dùng chung:
  - `useAction` thêm `onError` (màn tự xử lý lỗi nghiệp vụ, vd. CONTACT_OWNED);
  - `authz.changed` invalidate `crm` / `inbox` (đổi vai trò = đổi data scope).

**TEST RESULTS:** (full gate cuối pha, chạy local)
- `pnpm lint`: 5/5 xanh; `lint:size`: 274 file, không file nào vượt trần; `lint:tokens`: 171 file đúng thang D41.
- `pnpm typecheck`: 5/5 xanh.
- `pnpm test`: shared 11, ui 2, actions 3, web 27 passed (0 failed).
- `pnpm i18n:check`: vi 784 / en 784 key (100%).
- `pnpm parity --all`: 35/35 PASS. Kết quả F2:

  | Màn | diffRatio |
  |-----|-----------|
  | dashboard:default | 0.0171 |
  | dashboard:new-workspace | 0.0085 |
  | dashboard:widget-picker | 0.0257 |
  | inbox:default | 0.0406 |
  | inbox:empty | 0.0292 |
  | inbox:folder-rail | 0.0445 |
  | inbox:conv-menu | 0.0416 |
  | inbox:chat-menu | 0.0413 |
  | inbox:ai-panel | 0.0480 |
  | inbox:connect-channel | 0.0160 |
  | inbox:account-switch | 0.0091 |
  | inbox:zalo-group-info | 0.0468 |
  | inbox:handoff | 0.0064 |
  | customers:table | 0.0058 |
  | customers:kanban | 0.0343 |
  | customers:filter | 0.0081 |
  | customers:edit | 0.0130 |
  | customers:dedupe | 0.0084 |
  | customers:fields | 0.0313 |
  | customers:360 | 0.0336 |
  | customers:ai | 0.0174 |

  F0–F1 đo lại vẫn ≤ 0.0375.
- `pnpm e2e` (build + start, desktop + mobile-390): 44 passed, 20 skipped (test chỉ chạy ở một viewport), 0 failed.
- Mobile 390:
  - dashboard / inbox / customers: không tràn ngang, vùng chạm ≥ 44px.
  - Khách hàng: thẻ thay bảng; drawer 360° từ dưới; kanban cuộn snap.
- Role isolation (mock): Sales chỉ thấy khách mình phụ trách + khách đồng phụ trách (unit + e2e). Sales không có "Chuyển phụ trách" / "Xoá". Kế toán không có soạn tin / kết nối kênh.
- Không chạy được:
  - backend thật (FE dùng mock transport D38);
  - provider thật (Zalo, email): chưa nghiệm thu với provider thật.

**ISSUES DISCOVERED:**
- Trung bình: lúc đầu tôi dựng bảng / kanban Khách hàng bằng markup riêng, lệch Blueprint §7 (primitive dùng chung). Đã sửa trước khi commit: dựng `DataTable` / `KanbanBoard` / `FilterBar` / `EntityDrawer` trong `packages/ui` (hướng A, Chủ nhà xác nhận 2026-10-29).
- Thấp: đổi vai trò trên dev toolbar trước đây chỉ làm mới `/me/authz`, nên danh sách theo scope bị cũ. Đã invalidate thêm `crm` / `inbox`.
- Thấp: prototype có 2 menu "Cập nhật khách hàng" (bảng + kanban ẩn). Selector parity phải nhắm đúng menu 184px của bảng.

**DEVIATIONS FROM SPEC:**
- Kênh / nguồn khách theo channel registry (§6):
  - Zalo OA / Facebook / TikTok → Zalo cá nhân / Email / Website / Nhập tay / Giới thiệu;
  - hộp thư chỉ zalo_personal / webchat / email; kênh khác hiện "Sắp có" (D28).
- Đổi nội dung theo quyết định:
  - "Tạo hóa đơn" → "Đề nghị thanh toán";
  - "CLAUDE GỢI Ý" → "AI GỢI Ý", "Claude Cowork" → "AI Cowork" (D29).
- Gỡ mục OUT khỏi prototype trước khi chụp: "Soạn ZNS" / "Gửi template ZNS", "Tổng đài / Call Center".
- D32 (màn mới, loại M, không đo pixel): Người phụ trách, Xin chia sẻ, Chuyển phụ trách dựng bằng `ModalShell` + token.
- Action chưa có trong Blueprint §3.4, đề xuất bổ sung:
  - `onboarding.toggle_step`, `follow_up.complete`;
  - `message.delete`, `conversation.clear_history`;
  - `contact.decide_access` có trong §3.4 (cặp request / decide); `custom_field.update` dùng cho bật / tắt bắt buộc · hiện.
- `custom_field_def.type` thêm `multi` / `tier` / `tags` theo dữ liệu prototype (Blueprint §2.2 chỉ có picklist / lookup…). Đề xuất bổ sung enum.

**SUGGESTIONS FOR CHỦ THẦU:**
- Bổ sung vào Blueprint §3.4: `onboarding.toggle_step`, `follow_up.complete`, `message.delete`, `conversation.clear_history`, `workspace.switch` (từ F0). Bổ sung D41 (thang token) vào standards/ui.
- Bổ sung `multi` / `tier` / `tags` vào enum `custom_field_def.type` (§2.2).
- F4 / F5 (Báo giá, Đơn, Ticket…) dùng lại primitive `DataTable` / `KanbanBoard` / `EntityDrawer` / `ModalShell` đã có.
- PR #2 / #3 chưa merge: PR F2 mở từ `goal/fe-prototype-f2`, xếp chồng #3.


### F3
### COMPLETION REPORT — GOAL-FE-PROTOTYPE · F3

**STATUS:** DONE
**COMMIT:** c62ae0f trên nhánh `goal/fe-prototype-f3` (xếp chồng F2 / PR #4)

**FILES CHANGED:**
- Lớp dữ liệu (6f89e3f):
  - `packages/actions/src/ai.ts`: 16 action:
    - agent: `draft_from_description / create / create_and_publish / update / publish / rollback / pause / delete / test / optimize_prompt`;
    - approval: `approve / reject`;
    - ai_task: `create / update / pause / delete`.
  - Quyền dùng: `agents.manage`, `approvals.decide`, `ai_task.manage`.
  - Mock `shared/api/mock/domains/assistant.ts` (lượt chat + thẻ xác nhận, Coworks, nhật ký hành động, hàng chờ duyệt) và `agents.ts` (agent, mẫu, phiên bản); có test.
  - Fixture `assistant.json` / `agents.json`, sinh bởi `tools/scripts/fixtures/gen-assistant.py`. Tên model đổi thành mức AI (D29), mục OUT đã bỏ.
- Trợ lý AI (ccaad26): `features/assistant`.
  - Màn chào Chat / Cowork; hội thoại có thẻ xác nhận → đã lưu / huỷ.
  - Composer: popover + / mức AI / agent.
  - Coworks: chỉ số, lưới tác vụ, modal tạo, drawer cấu hình 4 tab.
  - Thêm token nhóm `illus` cho mặt bot.
- Nhật ký + Chờ duyệt (7b66250):
  - Nhật ký: lọc loại / trạng thái / ngày, hoàn tác.
  - Chờ duyệt: duyệt cần `approvals.decide` **và** quyền approve của action gốc.
  - Flyout Trợ lý có mục "Chờ duyệt" theo quyền; `authz.changed` invalidate toàn bộ.
- AI Agents (37a386a): `features/agents`.
  - Thư viện mẫu: tìm + 3 select phụ thuộc, 20 mẫu / trang.
  - "Agent của bạn": bật / tạm dừng, mức AI, phiên bản, xoá.
  - Builder toàn màn (`/agents/new`, `/agents/[id]`):
    - biểu tượng, tên, mức AI, ngôn ngữ;
    - prompt + 4 mẫu + Tối ưu hóa;
    - kênh theo registry; intent / từ khoá / khung giờ;
    - 9 hành động map sang action id; governance;
    - kiến thức; chat thử qua `agent.test` (dryRun).
  - Drawer Trợ lý AI thu nhỏ: gợi ý → mô tả → thẻ xác nhận "Tạo & xuất bản" | "Mở trong builder".
  - Drawer lịch sử phiên bản: quay lại tạo phiên bản mới.
- Dùng chung: `tools/parity/protoState.ts` (đặt state prototype qua fiber `stateNode.logic`); 15 dòng manifest F3.

**TEST RESULTS:** (full gate cuối pha, chạy local)
- `pnpm lint`: 5/5 xanh; `lint:size` 336 file, không vượt trần; `lint:tokens` 228 file đúng thang D41.
- `pnpm typecheck`: 5/5 xanh.
- `pnpm test`: shared 11, ui 2, actions 3, web 34 passed (0 failed).
- `pnpm i18n:check`: vi 1131 / en 1131 key (100%).
- `pnpm parity --all`: 50/50 PASS. Kết quả F3:

  | Màn | diffRatio |
  |-----|-----------|
  | assistant:chat-welcome | 0.0265 |
  | assistant:cowork-welcome | 0.0260 |
  | assistant:thread | 0.0030 |
  | assistant:attach | 0.0242 |
  | assistant:model-picker | 0.0359 |
  | assistant:agent-picker | 0.0339 |
  | assistant:cowork-new | 0.0176 |
  | assistant:cowork-drawer | 0.0049 |
  | actions:log | 0.0232 |
  | agents:list | 0.0053 |
  | agents:template-gallery | 0.0213 |
  | agents:builder | 0.0116 |
  | agents:builder-templates | 0.0382 |
  | agents:test-chat | 0.0008 |
  | agents:ai-create | 0.0074 |

  `approvals:queue` và `agents:versions` là màn mới (loại M), không đo pixel.
- `pnpm e2e` (build + start, desktop + mobile-390): 55 passed, 31 skipped (test chỉ chạy ở một viewport), 0 failed.
  - Trợ lý: 6 test; AI Agents: 5 test.
- Mobile 390: assistant / cowork / nhật ký / chờ duyệt / agents / builder / drawer Trợ lý không tràn ngang, vùng chạm ≥ 44px.
- Phân quyền (mock):
  - Quản lý không duyệt được yêu cầu hoàn tiền (thiếu quyền action gốc).
  - Sales không thấy mục "Chờ duyệt".
- Không chạy được:
  - backend thật (FE dùng mock transport D38);
  - LLM thật cho chat / chat thử / soạn agent (kịch bản mock): chưa nghiệm thu với provider thật.

**ISSUES DISCOVERED:**
- Thấp: prototype đặt state qua `stateNode.logic.setState`, không qua `stateNode.setState`. Đã gom vào `protoState.ts`.
- Thấp: `page.goto` reset store mock, nên e2e đi trong app qua flyout để giữ dữ liệu vừa tạo.
- Thấp: dev server cache import động thất bại của `messages/*/agents.json` (file tạo sau khi server chạy) → phải khởi động lại. Không ảnh hưởng build.
- Thấp: prototype có danh sách `aiAgents` trong state nhưng không render. "Agent của bạn" là phần thêm dưới thư viện mẫu, mask khi đo.

**DEVIATIONS FROM SPEC:**
- D29:
  - tên model (Haiku / Sonnet / Opus) thành mức AI Tiêu chuẩn / Nâng cao / Tối đa ở composer, Coworks, drawer, builder, thẻ agent;
  - tạo agent bằng Trợ lý có thẻ xác nhận một bước.
- Gỡ mục OUT:
  - "Mở Workflow";
  - hành động ZNS / SMS, kích hoạt workflow, xử lý cuộc gọi, HTTP;
  - kênh ngoài registry: builder chỉ có Zalo cá nhân / Web chat / Email.
- Màn mới (loại M, dựng bằng token + pattern sẵn có): Chờ duyệt, lịch sử phiên bản.
- Nhật ký: dòng "Workflow" / "ZNS" của prototype thành Ticket / Zalo (fixture), mask khi đo.

**SUGGESTIONS FOR CHỦ THẦU:**
- Blueprint §3.4 nên ghi rõ: duyệt (`approval.approve`) cần đồng thời quyền approve của action gốc.
- Blueprint §2.2 `ai_agent`: thêm `handoff_to` (staff / team / lead) và `governance` (4 cờ) theo builder.
- Đề xuất `agent.test` nhận `config` bản nháp (chạy thử trước khi lưu); mock đã làm theo cách này.

### F4
### COMPLETION REPORT — GOAL-FE-PROTOTYPE · F4

**STATUS:** DONE
**COMMIT:** cfb5a49 trên nhánh `goal/fe-prototype-f4` (xếp chồng F3 / PR #5)

**FILES CHANGED:**
- Dùng chung (b626d05): `ui-commands.ts` + test cho Khách hàng / Hộp thư / Trợ lý / AI Agents (prefill · open · filter), bù yêu cầu "mọi màn có form có ui-commands".
- Sản phẩm & Dịch vụ (81dba0d): `features/products`.
  - DataTable + Kanban theo danh mục; drawer 5 tab; form 6 loại (khối nhập theo loại, thuộc tính → biến thể, danh mục mới).
  - Action `product.*` / `category.create`; giá vốn chỉ hiện với `catalog.cost_view`.
  - `EntityDrawer` thêm prop `header`; `ModalShell` thêm biến thể `dense`.
- Báo giá (49c3a9c): `features/quotes`.
  - Danh sách / kanban 4 cột; soạn báo giá (dòng catalog / ngoài danh mục, CK dòng + CK tổng, thuế sau CK); drawer 4 tab + version (`request_revision`).
  - Luật COMMERCE §3: hiệu lực 15 ngày; ngưỡng duyệt 20tr / 5% / ngoài danh mục; không trừ điểm trên báo giá.
  - `packages/shared/commerce/quote-math.ts` (`quoteTotals`, `approvalReasons`) + test.
  - D30: `quote.draft_from_content` (AI soạn nháp từ nội dung).
- Hợp đồng + ký điện tử (c1485f8): `features/contracts`, route công khai `app/(public)/sign/[token]`.
  - Danh sách / kanban 4 cột; drawer 5 tab; tạo HĐ (crmForm 720); `?from_quote=`.
  - Duyệt & ký (Chủ sở hữu ký trước): OTP + `SignaturePad` (`shared/forms`); gửi ký bằng link một lần 7 ngày qua Zalo / Email; nhắc ký, gia hạn link, chấm dứt (lý do), gia hạn HĐ.
  - Trang ký công khai: đồng ý → OTP → ký tay → chứng nhận (SHA-256, thời điểm, lưu vết); sai OTP 5 lần thì khoá; Từ chối ký.
  - Lỗi mới `OTP_INVALID` / `SIGN_LINK_INVALID`; sự kiện `contract.signed` / `contract.declined` → invalidate.
  - `ModalShell` thêm `stacked` (z 1005 trên drawer); `EntityDrawer` tắt focus trap (`focusable.trap=false`) để modal xếp chồng nhận bàn phím.
- Đơn hàng (98aeb7e): `features/orders`.
  - 2 trục độc lập (tiến độ + thanh toán), mỗi chip lọc đúng trục; kanban 4 cột; drawer 5 tab.
  - Tạo đơn: dòng catalog, cọc ≤ tổng → Chờ cọc; xác nhận → hoàn tất (+ điểm 10.000đ = 1 điểm) → huỷ (lý do bắt buộc; đã thu thì sinh yêu cầu hoàn tiền); vận chuyển nhập tay.
  - D31: đơn từ sàn có badge nguồn, khoá dòng hàng, không tích điểm, không gửi đề nghị thanh toán; nút Đồng bộ sàn.
  - Nhận nguồn `?from_quote=` / `?from_contract=`.
- Đề nghị thanh toán (cfb5a49): `features/invoices`.
  - Danh sách + 4 thẻ số liệu; drawer 360° có tiến độ thu, khoản thu và VietQR.
  - `packages/shared/commerce/vietqr.ts`: EMVCo NAPAS + CRC-16, có test.
  - Ghi nhận thanh toán: ≤ còn phải thu; sinh phiếu thu; cộng vào `order.paid_total`.
  - Hàng "Cần đối soát" (`invoice.resolve_bank_match`); huỷ chỉ khi chưa thu; form crmForm 720.
  - Nút "Đề nghị thanh toán" ở đơn hàng mở form điền sẵn đơn đó.
- Mock: `shared/api/mock/domains/{products,quotes,quotes-draft,contracts,contracts-sign,orders,invoices}.ts`.
- Fixture: `fixtures/prototype-parity/{products,quotes,contracts,orders,invoices}.json`, sinh bởi `tools/scripts/fixtures/gen-*.py`.
- Parity manifest: 17 dòng F4 (P / E).

**TEST RESULTS:** (full gate cuối pha, chạy local)
- `pnpm lint` / `pnpm typecheck` / `pnpm test` (turbo): 15/15 task xanh.
  - `lint:size` 485 file, không vượt trần; `lint:tokens` 351 file đúng thang D41.
  - unit: shared 19, ui 2, actions 3, web 43 passed (0 failed). Mới ở F4: `quote-math`, `vietqr`, ui-commands các module.
- `pnpm i18n:check`: vi 2206 / en 2206 key (100%).
- `pnpm parity --all`: 67/67 PASS. Kết quả F4:

  | Màn | Loại | diffRatio |
  |-----|------|-----------|
  | products:list | P | 0.0373 |
  | products:detail | P | 0.0199 |
  | products:create | P | 0.0229 |
  | quotes:list | P | 0.0233 |
  | quotes:editor | P | 0.0180 |
  | quotes:detail | P | 0.0400 |
  | contracts:list | E | 0.0344 |
  | contracts:kanban | E | 0.0200 |
  | contracts:detail | E | 0.0147 |
  | contracts:create | P | 0.0281 |
  | orders:list | P | 0.0337 |
  | orders:detail | P | 0.0398 |
  | orders:create | P | 0.0293 |
  | invoices:list | E | 0.0202 |
  | invoices:detail-qr | E | 0.0273 |
  | invoices:record-payment | E | 0.0286 |
  | invoices:create | P | 0.0396 |

  Loại M (không đo pixel): `quotes:draft-from-content`, `contracts:approve-sign`, `sign:public`, `orders:marketplace`.
- `pnpm e2e` (build + start, desktop + mobile-390): 85 passed, 61 skipped (test chỉ chạy ở một viewport), 0 failed.
- Mobile 390: danh sách / drawer / form của sản phẩm, báo giá, hợp đồng, trang ký, đơn hàng, đề nghị thanh toán: không tràn ngang, vùng chạm ≥ 44px.
- Phân quyền (mock):
  - Sales chỉ thấy bản ghi của mình (`own`), không thấy "Đồng bộ sàn", không ghi nhận thanh toán, không thấy hàng đối soát.
  - Kế toán thấy tất cả và ghi nhận được.
  - Chỉ Chủ sở hữu duyệt & ký hợp đồng.
- Không chạy được:
  - backend thật (FE dùng mock transport D38);
  - Zalo / Email gửi ký và gửi đề nghị thanh toán; webhook SePay / Casso; sàn TMĐT: chưa nghiệm thu với provider thật.

**ISSUES DISCOVERED:**
- Trung bình: drawer antd bật focus trap mặc định, nên modal xếp chồng (OTP, lý do huỷ) không nhận được bàn phím. Đã sửa ở primitive `EntityDrawer`.
- Thấp: nút "Tạo hợp đồng" / "Tạo đơn hàng" / "Tạo hóa đơn" của prototype mở crmForm 720 (`openCrmForm`), không mở modal riêng (`cnNewOn` / `odNewOn`). Parity đo theo nút thật.
- Thấp: prototype khoá cứng `pdDetailOn` / `ctDetailOn` / `odDetailOn` / `ivDetailOn: false`. Entry parity bật cờ qua `protoOverrideVals`.
- Thấp: "Ghi nhận thanh toán" của prototype chỉ hiện toast. Parity đo trạng thái sau khi đã thu đủ.
- Thấp: trạng thái drawer nằm trong store, nên khi chuyển màn (đơn → đề nghị thanh toán) phải đóng drawer nguồn trước.

**DEVIATIONS FROM SPEC:** (đều theo COMMERCE-DECISIONS, thắng prototype)
- §9: "Ký số" → "Ký điện tử" (OTP + ký tay; ký số CA để P2). "Chờ duyệt" gộp vào Nháp + badge.
- §5: "Hóa đơn" → "Đề nghị thanh toán":
  - mã TT-00xxxx; ghi chú "không thay thế hoá đơn GTGT";
  - thêm trạng thái Thu một phần / Đã huỷ;
  - ngày mẫu dời trước 24/06/2026 để "Quá hạn" đúng nghĩa;
  - thêm thẻ VietQR và hàng "Cần đối soát" (mask khi đo).
- §4: đơn hàng tách 2 trục; chip lọc theo trục; thuế 0% để giá trị khớp prototype. D31: thêm 1 đơn sàn mẫu.
- §3: hiệu lực báo giá 15 ngày; tổng không trừ điểm (mask dòng tổng); ZBS / SMS (OUT) → Zalo / Email / PDF.
- Màn mới (loại M): AI soạn báo giá, duyệt & ký, trang ký công khai, đơn từ sàn.

**SUGGESTIONS FOR CHỦ THẦU:**
- Blueprint §2.2 `invoice`: thêm `transfer_code` (mã CK không dấu, ví dụ TT002041) tách khỏi `code` hiển thị, vì nội dung CK ngân hàng bỏ ký tự "-".
- Blueprint §4.4: `/invoices/meta` nên trả hàng "Cần đối soát" chỉ cho vai trò có `payment.record` (mock đã làm theo cách này).
- Cài đặt › Thanh toán (F6) cần form `payment_account` (ngân hàng, BIN, số TK, chủ TK) vì VietQR đọc từ đây.

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
