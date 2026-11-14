### COMPLETION REPORT — TIP-001b

**STATUS:** DONE

Nhánh `tip/001b-web-architecture` (từ `tip/034b-p4-close`), PR vào `dev` xếp chồng trên #211. SHA ở `goals/GOAL-RELEASE.md` dòng 51.

**TÓM TẮT:** `apps/web` hết vòng phụ thuộc runtime (baseline `[]`, luật vòng web = error); có error boundary theo nhóm route + boundary panel; drawer / form nặng tải lười (JS khởi đầu mỗi trang giảm ~300 KB gzip); hết `@media` tay và `toLocaleString` / `Intl.*Format` trong features, lint chặn tái phạm. Không đổi hành vi nghiệp vụ.

**Rà trước khi làm (khác CONTEXT 2026-11-02)**

- Baseline có 99 mục nhưng chỉ 23 vòng là runtime; ~202 vòng còn lại chỉ qua `import type` (MockDb ↔ State của domain mock) — TypeScript xoá khi biên dịch.
- Vòng thật nằm ở barrel `features/*/index.ts` bị import chéo (inbox ↔ quotes / calendar / settings…) và 2 re-export handler trong mock (`domains/calendar.ts`, `domains/tickets.ts`) — `routes.ts` không cần đổi.
- `next build`: mọi trang (app) cùng ~1 MB gzip JS khởi đầu — `CrmFormsHost` ở layout `(app)` nạp tĩnh mọi form → kéo barrel → kéo Screen của 9 module (Tổng quan chứa cả bảng Khách hàng, kanban Báo giá).
- `@media` tay: 8 (thêm `settings/styles/rag-folder.styles.ts` `(hover: none)`); `Intl.` còn `Intl.Segmenter` (tách ký tự, không phải định dạng — giữ).
- Không có logger web ở `shared/dev` (chỉ DevToolbar) → thêm `shared/dev/client-log.ts`.

**§1 — Vòng phụ thuộc (AC1)**

- Mock: bỏ `export { calendarHandlers }` / `export { ticketsHandlers }` khỏi domain state; `handlers.ts` + test shape import thẳng `domains/*-actions`.
- 24 file features import chéo đổi sang module lá công khai `@/features/<m>/{api,*-store,types,ui-commands}` (không kéo component / màn).
- `.dependency-cruiser.cjs`: `no-circular-web` từ warn → **error**, loại cạnh `type-only` (`viaOnly.dependencyTypesNot`); thêm `web-no-own-barrel` (trong module không import `index.ts` của chính nó). `.dependency-cruiser-known-violations.json` = `[]`.
- ESLint `no-restricted-imports`: cho phép module lá, cấm `features/*/components/*`.
- Kiểm: vòng giả `__cyc_a ↔ __cyc_b` → `error no-circular-web` (exit 1); import own barrel giả → `web-no-own-barrel`; bỏ đi → `✔ no dependency violations found (4448 modules, 18603 dependencies cruised)`.

**§2 — Error boundary (AC2)**

- `app/(app)/error.tsx`, `app/(auth)/error.tsx`, `app/(public)/error.tsx` → `shared/states/RouteError.tsx`: PageStates lỗi + Thử lại (`retry()` của Next 16 — nạp lại segment), `data-scope`.
- `app/global-error.tsx`: tự dựng `<html>/<body>`, next-intl chỉ `common` (locale cookie → trình duyệt → vi), theme antd.
- `shared/states/PanelBoundary.tsx` (class): lỗi chỉ thay vùng đó; Thử lại dựng lại cây con; có `onDismiss` → nút Đóng; vùng bị đóng từ store khi đang lỗi → ẩn khung lỗi. Gắn: Hồ sơ 360° Hộp thư + mọi drawer tải lười.
- Log `shared/dev/client-log.ts`: chỉ phạm vi + tên lỗi + `digest` — không message / stack (message lỗi client có thể chứa dữ liệu người dùng).
- Lỗi giả chỉ ở mock (`localStorage.ac_mock_fault`, `shared/dev/MockFault.tsx`): `route:dashboard` (probe ở trang Tổng quan), `panel:<tên>` (trong PanelBoundary). http / production không ném.

**§3 — Tải lười + breakpoint + fmt (AC3, AC4)**

- `shared/dynamic/lazy-drawers.ts`: `lazyDrawer(load)` = `next/dynamic` (ssr false, skeleton `DrawerSkeleton` — PageStates loading trong khung cố định); `Opened` chỉ mount khi mở lần đầu, giữ mount sau đó (`keep=false` cho modal tự gỡ), bọc PanelBoundary.
- Áp dụng: `CrmFormsHost` (form báo giá / hợp đồng / đơn / sửa đơn / ticket / lịch hẹn / email / sửa khách / hoạt động CRM + drawer hợp đồng) — layout chỉ nạp tĩnh store + `ui-commands`; drawer AI của Báo giá, Hợp đồng, Đơn, Ticket, Lịch hẹn, Agent, Marketing, Khách hàng; `CampaignWizard`; drawer việc Cowork (`TaskDrawer`); `DocxWizard` (wizard chứng từ). Builder agent là màn có route riêng (Next tự tách); chart GenUI đã `lazy()` từ trước (DV-118).
- Breakpoint: 8 `@media` → token `mq.*` (`packages/ui/src/tokens-media.ts`: 1280 / 1180 / 1100 / 900 / 560 / hover:none — giữ ngưỡng prototype) hoặc `responsive.md`. Giữ CSS thay `Grid.useBreakpoint()` (không lệch SSR).
- fmt: thêm `fmt.dateTime`, `fmt.dateParts` (theo timezone workspace); `toLocaleString('vi-VN')` → `fmt.number` (theo locale) ở settings Channels / ManageChannelDrawer / Widget, loyalty (bỏ `pts`), marketing CampaignDetail; TaskDrawer `toLocaleString()` → `fmt.dateTime`; TagsSection `Intl.DateTimeFormat` → `fmt.dateParts`.
- ESLint `no-restricted-syntax` ở `src/features/**`: `toLocale(String|DateString|TimeString)`, `Intl.(NumberFormat|DateTimeFormat|RelativeTimeFormat|PluralRules|ListFormat|DisplayNames)`, `@media` trong template. Thử file giả → 3 lỗi; `Intl.Segmenter` qua.

**AC3 — `next build` (mock), JS khởi đầu mỗi trang (gzip, từ client-reference-manifest)**

Trước = bản build commit `3ed9fe7a` (trước TIP), sau = bản build TIP-001b.

| Trang (app) | Trước (KB gzip) | Sau (KB gzip) | Δ |
|---|---|---|---|
| agents | 1031.6 | 726.1 | -305.5 |
| assistant | 1031.6 | 745.9 | -285.7 |
| calendar | 1031.6 | 721.9 | -309.7 |
| contracts | 1031.6 | 734 | -297.6 |
| customers | 1031.6 | 912.8 | -118.8 |
| dashboard | 1038.4 | 716.5 | -321.9 |
| inbox | 1031.6 | 889.6 | -142.0 |
| invoices | 1042.5 | 734.2 | -308.3 |
| loyalty | 1044.2 | 722.6 | -321.6 |
| marketing | 1054.3 | 725.7 | -328.6 |
| orders | 1031.6 | 728.1 | -303.5 |
| products | 1031.6 | 732.5 | -299.1 |
| quotes | 1031.6 | 729.8 | -301.8 |
| settings | 1031.6 | 802.8 | -228.8 |
| tickets | 1031.6 | 725.3 | -306.3 |

Drawer / form ở chunk riêng, không trong JS khởi đầu của Tổng quan: form báo giá (+ kanban) 17 KB, drawer AI khách hàng (+ bảng) 21 KB, wizard chiến dịch 8 KB, drawer AI báo giá 8 + 4 KB, drawer AI ticket 4 KB, drawer việc Cowork 3 KB. Khách hàng / Hộp thư / Cài đặt giảm ít hơn vì màn đó tự dùng chính các module vừa tách.

**FILES CHANGED** (ngoài manifest ghi ở DV-118)

- Kiến trúc: `.dependency-cruiser.cjs`, `.dependency-cruiser-known-violations.json`, `apps/web/eslint.config.mjs`.
- Error boundary: `app/{(app),(auth),(public)}/error.tsx`, `app/global-error.tsx`, `shared/states/{RouteError,PanelBoundary}.tsx` + `PanelBoundary.test.tsx`, `shared/dev/{client-log.ts,MockFault.tsx}`, `app/(app)/dashboard/page.tsx`, `features/inbox/screens/InboxScreen.tsx`.
- Tải lười: `shared/dynamic/{lazy-drawers.ts,DrawerSkeleton.tsx}`, `app/(app)/_crm-forms/{CrmFormsHost,FormCommandHost,EmailComposeModal}.tsx`, màn Quotes / Contracts / Orders / Tickets / Calendar / Agents / Marketing / Cowork, `customers/components/CrmOverlays.tsx`, `settings/components/DocTemplatesSection.tsx`.
- Import lá (§1): 24 file features + mock `domains/{calendar,tickets}.ts`, `handlers.ts`, `{calendar,tickets}-shape.test.ts`.
- Breakpoint: `packages/ui/src/{tokens.ts,tokens-media.ts}`, `agents/styles/agents.styles.ts`, `dashboard/components/AgentsSection.tsx`, `inbox/components/FolderRail.tsx`, `inbox/styles/panel.styles.ts`, `settings/styles/rag-folder.styles.ts`.
- fmt: `packages/shared/src/fmt/{index.ts,fmt.test.ts}`, settings `{ChannelsSection,ManageChannelDrawer,WidgetSection,TagsSection}.tsx`, `assistant/components/TaskDrawer.tsx`, loyalty `{MemberTable,MemberTabs,AdjustPointsModal,ConfigModal,MemberAiTab,MemberDrawer,SimulatorModal}.tsx` + `hooks/useAdjust.ts` + `status.ts`, `marketing/components/CampaignDetail.tsx`.
- E2E: `e2e/error-boundary.spec.ts` (mới), `e2e/agents.spec.ts` (chờ drawer lười hiện trước khi đo vùng chạm).
- Parity: `tools/parity/src/capture.ts` — sau thao tác mở, chờ `networkidle` + `drawer-loading` biến mất rồi mới chụp (lượt đầu chụp lúc chunk lười chưa về → `customers:ai` 7,1%, `contracts:detail` 7,2%, `marketing:wizard` 49%; sau sửa 1,7% / 1,5% / 2,2%).
- Sổ: DC-446, DV-118, DV-001 đóng, COVERAGE (DEF-001-1, DV-001, BP-9-f, STD-ui-fe-11, STD-ui-fe-13b, STD-i18n-4 → ĐẠT).

Không đổi: `apps/web/src/shared/api/mock/routes.ts`, marketing `columns.tsx` / `AnalyzeModal.tsx` / `CampaignWizard.tsx` / `DetailTabs.tsx` / `WizardSteps.tsx` (rà không còn `toLocaleString` / `Intl.` — đã sạch từ TIP trước).

**TEST**

| Cổng | Kết quả |
|---|---|
| depcheck (baseline `[]`) | `✔ no dependency violations found (4448 modules, 18603 dependencies cruised)`; vòng giả → `error no-circular-web`, own barrel giả → `web-no-own-barrel` (AC1) |
| Unit web | toàn bộ web 164 file / 556 pass (trạng thái cuối); khi làm: mock + inbox / quotes / orders / calendar 290 pass; states / app / loyalty / settings / marketing / assistant / inbox / customers 44 file / 131 pass (có `PanelBoundary.test.tsx` 5: chỉ panel lỗi, Thử lại dựng lại, log không message, lỗi giả mock đúng tên) |
| Unit shared / ui | `fmt.test.ts` 3 pass (dateParts theo timezone, dateTime theo locale, number vi / en); ui 2 pass |
| E2E mock `error-boundary` (`E2E_PORT=3537`) | 4 passed, 2 skipped: lỗi route → trạng thái lỗi + Thử lại, khung app còn, log không message, Thử lại → trang hiện lại (desktop + 390, 390 không tràn ngang); lỗi Hồ sơ 360° chỉ panel, hội thoại vẫn dùng; drawer AI lười lỗi → khung lỗi, Đóng rồi mở lại được (AC2) |
| E2E mock toàn bộ (desktop + 390, vì đổi layout dùng chung — AC5) | 399 passed, 336 skipped, 5 failed lượt đầu: 3 `ENOENT` file trace của Playwright (hạ tầng khi chạy song song), contracts `toHaveURL` (race), agents 390 đo vùng chạm khi drawer lười chưa hiện → sửa spec chờ `toBeVisible`. Chạy lại 5 ca: 6 passed, 4 skipped |
| Parity `--done` (AC5) | exit 0 — 102 PASS, 6 PAID ≤ 5% (inbox:default 4,70%, inbox:folder-rail 4,57%, inbox:zalo-group-info 4,73%, tickets:list 4,21%, tickets:detail 4,91%, profile:me 4,74%), 1 DEBT ≤ trần (inbox:connect-channel 6,20% ≤ 6,5%, DC-360). Lượt đầu 3 FAIL do công cụ chụp lúc chunk lười chưa về — sửa `capture.ts`, chạy lại `customers:ai` 1,74%, `contracts:detail` 1,53%, `marketing:wizard` 2,17% |
| Typecheck / lint | web tsc 0 lỗi; eslint `src` 0 lỗi (24 cảnh báo có sẵn); shared / ui tsc + eslint sạch |
| lint:size / lint:tokens / i18n:check | sạch (tách `tokens-media.ts` để `tokens.ts` ≤ 400) / 1117 file đúng thang / vi + en 100% |

**ISSUES DISCOVERED**

- **DC-446:** vòng chỉ `import type` không tính; import lá công khai cho module khác; host toàn cục ở layout tải lười; `retry()` thay `reset()`; breakpoint thành token `mq`.
- **DV-118:** file ngoài manifest; Builder / chart không cần `next/dynamic`; CSS token thay `Grid.useBreakpoint()`.
- Mở form / drawer lần đầu có skeleton ngắn (tải chunk) — hành vi nghiệp vụ không đổi.
- Chưa có kênh gửi lỗi web về server (Blueprint §11) — `client-log.ts` là chỗ đổi đích duy nhất.

**ĐỐI CHIẾU STANDARDS** (APPLICABLE STANDARDS của TIP):

| Standard | Tuân thủ (file / test) | Lệch |
|---|---|---|
| `ui/frontend-structure.md` §2.2 (màn orchestrator) | Màn chỉ thêm `lazyDrawer` / `Opened`; InboxScreen 81 dòng, CrmFormsHost 99 | — |
| §2.3 (import một chiều) | eslint boundaries + `no-restricted-imports` (lá công khai, cấm `components/*`); depcruise `web-no-own-barrel`, `no-circular-web` error | Lá `api/*-store/types/ui-commands` bên cạnh index.ts (DC-446 b) |
| §2.9 (5 trạng thái, error có Thử lại) | RouteError / PanelBoundary dùng PageStates error + Thử lại; skeleton PageStates loading | — |
| §2.10 (token, không px / màu cứng) | DrawerSkeleton dùng `layout.crmDrawer`, `color`, `shadow`, `z`; lint:tokens sạch | — |
| §2.11 (breakpoint, không media query tay) | `@media` features = 0, token `mq` / `responsive`; lint chặn | CSS token thay `Grid.useBreakpoint()` (DV-118) |
| §2.12 (fmt.*) | fmt.number / dateTime / dateParts; lint chặn `toLocale*` / `Intl.*Format` | — |
| §2.13 (drawer nặng `next/dynamic`, chart theo màn) | `lazy-drawers.ts`; số đo `next build` ở trên (AC3) | — |
| §2.15 (test) | vitest PanelBoundary + fmt; Playwright desktop + 390 | — |
| `ui/interaction-patterns.md` | Lỗi khoanh vùng, không trắng màn; Thử lại / Đóng; không lộ chi tiết lỗi | — |
| `i18n/i18n.md` §4 | `fmt.*` theo locale + timezone workspace; i18n:check 100%; global-error dùng `common` theo locale | — |
| `workflow/git-flow-ci.md` (depcheck) | `pnpm depcheck` xanh với baseline rỗng | — |
| `ops/observability-security.md` §1.4 | Log web không message / stack / dữ liệu nhập | — |
| `code/file-size-module-layout.md` | FE ≤ 400 (lint:size sạch, tách `tokens-media.ts`); test file riêng | — |
| `code/testing.md` / D59 | Unit + E2E mock + parity `--done` (đổi lớp dùng chung) | — |
