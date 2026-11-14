# TIP-001b — Web: gỡ vòng phụ thuộc, error boundary, lazy drawer, breakpoint, fmt

## HEADER
- **Parallel-safe with TIP-047 (coverage-closure manifest):** sequential, shares `.dependency-cruiser.cjs`; integrate 001b before047.
- **Parallel-safe with TIP-047d (coverage-closure manifest):** sequential, shares `apps/web/src/features/settings/components/WidgetSection.tsx`, `apps/web/src/shared/api/mock/routes.ts`; integrate 001b before047d.
- **Parallel-safe with TIP-032e (coverage-closure manifest):** sequential, shares `apps/web/src/shared/api/mock/routes.ts`; integrate 001b before032e.
- TIP-ID: TIP-001b; Project: AppChat V2; Module: apps/web nền tảng; Priority: P0; Estimated: L. TIP bổ sung cho TIP-001 (đã DONE, không sửa file gốc — DC-233).
- Depends on: Mọi TIP FE chung file đã tích hợp; trước 001c/044/045/046.
- **Files touched:** [exact M/C manifest](manifests/TIP-001b-files.md) — 31 paths (8 C). M path tương lai phải do TIP tạo trước tích hợp xong.
- **Parallel-safe with:** tuần tự với mọi TIP chung file (dòng khai hai phía bên dưới, máy kiểm `python -X utf8 tools/obligations/manifests.py --order`).
- **Parallel-safe with TIP-012c (coverage-closure manifest):** sequential, shares `apps/web/src/features/marketing/components/CampaignDetail.tsx`, `apps/web/src/features/marketing/components/DetailTabs.tsx`, `apps/web/src/features/marketing/components/WizardSteps.tsx`; integrate 012c before001b.
- **Parallel-safe with TIP-013b (coverage-closure manifest):** sequential, shares `apps/web/src/features/settings/components/TagsSection.tsx`; integrate 001b before013b.
- **Parallel-safe with TIP-014b (coverage-closure manifest):** sequential, shares `apps/web/src/features/settings/components/ManageChannelDrawer.tsx`; integrate 014b before001b.
- **Parallel-safe with TIP-014c (coverage-closure manifest):** sequential, shares `apps/web/src/features/settings/components/ManageChannelDrawer.tsx`; integrate 001b before014c.
- **Parallel-safe with TIP-017b (coverage-closure manifest):** sequential, shares `apps/web/src/features/settings/components/WidgetSection.tsx`; integrate 001b before017b.
- **Parallel-safe with TIP-022b (coverage-closure manifest):** sequential, shares `apps/web/src/features/settings/components/ManageChannelDrawer.tsx`; integrate 022b before001b.
- **Parallel-safe with TIP-023f (coverage-closure manifest):** sequential, shares `apps/web/src/shared/api/mock/routes.ts`; integrate 023f before001b.
- **Parallel-safe with TIP-034b (coverage-closure manifest):** sequential, shares `apps/web/src/shared/api/mock/routes.ts`; integrate 034b before001b.
- **Parallel-safe with TIP-036 (coverage-closure manifest):** sequential, shares `apps/web/src/features/loyalty/components/MemberTabs.tsx`; integrate 036 before001b.
- **Parallel-safe with TIP-037 (coverage-closure manifest):** sequential, shares `apps/web/src/features/marketing/columns.tsx`, `apps/web/src/features/marketing/components/AnalyzeModal.tsx`, `apps/web/src/features/marketing/components/CampaignDetail.tsx`, `apps/web/src/features/marketing/components/DetailTabs.tsx`, `apps/web/src/features/marketing/components/WizardSteps.tsx`, `apps/web/src/features/settings/components/ManageChannelDrawer.tsx`; integrate 037 before001b.
- **Parallel-safe with TIP-038 (coverage-closure manifest):** sequential, shares `apps/web/src/features/dashboard/components/AgentsSection.tsx`; integrate 038 before001b.
- **Parallel-safe with TIP-042b (coverage-closure manifest):** sequential, shares `apps/web/src/features/settings/components/ManageChannelDrawer.tsx`; integrate 042b before001b.
- **Dòng COVERAGE nhận:** DEF-001-1; DV-001; BP-9-f; STD-ui-fe-11; STD-ui-fe-13b; STD-i18n-4.

## CONTEXT
- Hiện trạng đối chiếu mã 2026-11-02 (file:dòng, không tin trạng thái DONE):
  - `.dependency-cruiser-known-violations.json` còn 99 vòng (barrel `features/*/index.ts` + mock transport) — `pnpm depcheck` chỉ xanh nhờ baseline (DV-001).
  - Không có `error.tsx` / ErrorBoundary nào dưới `apps/web/src/app` (Blueprint §9 L1345).
  - Còn 7 `@media` tay: `features/agents/styles/agents.styles.ts:157`, `dashboard/components/AgentsSection.tsx:30,33`, `inbox/components/FolderRail.tsx`, `inbox/styles/panel.styles.ts`; `Grid.useBreakpoint()` = 0 chỗ.
  - `next/dynamic` / `lazy(` = 0 — mọi drawer/modal nặng nạp cùng màn.
  - `toLocaleString`/`Intl.` rải rác ở `settings/components/{ChannelsSection,ManageChannelDrawer,WidgetSection,TagsSection}.tsx`, `assistant/components/TaskDrawer.tsx`, loyalty, marketing; không lint chặn.

## APPLICABLE STANDARDS
- ui/frontend-structure.md §4–§13; ui/interaction-patterns.md; i18n/i18n.md §4; workflow/git-flow-ci.md (depcheck).
- Không đổi luật COMMERCE, 5 vai trò, quyền đã chốt, đơn giá Credit. Quyết định mới → DECISIONS (DC), câu hỏi → QUESTIONS.

## Rà trước khi làm
1. Đọc lại mọi file trong manifest sau khi TIP phụ thuộc đã tích hợp; lệch CONTEXT → sửa TIP/manifest trước khi code.
2. `python -X utf8 tools/obligations/manifests.py 001b` tính lại giao file; thêm path thì cập nhật manifest + header hai phía.
3. Chạy `pnpm depcheck` không baseline, xuất danh sách vòng thật hiện tại (số có thể khác 99 sau các TIP trước) vào report.
4. Liệt kê lại `@media`, `toLocaleString`, `Intl.` bằng grep; liệt kê drawer/modal > 15 KB gzip bằng `next build` analyze có sẵn (không thêm thư viện).

## TASK
Gỡ vòng phụ thuộc thật và xoá baseline; thêm error boundary theo route; tải lười drawer/modal nặng; bỏ media query tay; ép định dạng qua `fmt.*` bằng lint.

## SPECIFICATIONS
### 1. Vòng phụ thuộc
1. `features/<m>/index.ts` chỉ export công khai (screens, ui-commands, query keys); component nội bộ import trực tiếp, không qua barrel.
2. Mock transport đăng ký domain qua registry tĩnh ở `shared/api/mock/routes.ts`, không import ngược `features/*`.
3. Xoá từng mục baseline khi vòng tương ứng gỡ; kết thúc `.dependency-cruiser-known-violations.json` = `[]`, DV-001 đóng.
### 2. Error boundary
1. `app/(app)/error.tsx`, `app/(auth)/error.tsx`, `app/(public)/error.tsx`, `app/global-error.tsx` dùng `PageStates` trạng thái lỗi + nút Thử lại (`reset()`), không lộ stack/PII; log qua `shared/dev` logger hiện có.
2. Lỗi trong drawer/panel không làm trắng cả màn: `shared/states/PanelBoundary.tsx` (class component) bọc panel phụ.
### 3. Tải lười + breakpoint + fmt
1. Drawer AI theo màn, Builder agent, wizard chứng từ, chart dùng `next/dynamic` với fallback skeleton PageStates.
2. Thay 7 `@media` bằng `Grid.useBreakpoint()` / token `responsive` của theme.
3. Thay `toLocaleString`/`Intl.*` bằng `fmt.money|number|date|relative` (`packages/shared/src/fmt`); thêm rule ESLint `no-restricted-syntax` chặn ở `apps/web/src/features/**`.

## ACCEPTANCE CRITERIA
|AC|Given / When|Then — bằng chứng|
|---|---|---|
|1|`pnpm depcheck` với baseline rỗng|xanh; file baseline `[]`|
|2|Ném lỗi giả trong một route và một panel|route hiện trạng thái lỗi có Thử lại; panel lỗi không làm trắng màn — `apps/web/e2e/error-boundary.spec.ts`|
|3|`next build`|drawer nặng tách chunk riêng (ghi kích thước trước/sau vào report)|
|4|grep `@media`, `toLocaleString`, `Intl.` trong features|0; lint chặn tái phạm|
|5|`pnpm parity --done` + `pnpm e2e` mock|không hồi quy; mobile 390 vẫn xanh|

### Commands / evidence gate
- `pnpm depcheck`
- `pnpm --filter @appchat/web lint typecheck test`
- `pnpm e2e error-boundary`
- `pnpm parity --done`
- Ba cổng D59 (khi làm · trước commit · chốt TIP); parity màn liên quan; E2E mock + http của luồng TIP. Lệnh là cổng tương lai, chưa chạy khi viết TIP.

## CONSTRAINTS
- Không thêm thư viện; không đổi hành vi nghiệp vụ; màn vẫn chỉ là orchestrator (≤ 400 dòng).
- Backend 200–400 dòng/file (trần 600), FE trần 400, màn chỉ orchestrator; test file riêng; ghi chỉ qua ActionExecutor; Postgres index `=` trước range/sort, EXPLAIN cho list mới.

## Quality Gate
- Manifest 31 path, header khai hai phía, 5 AC đo được. Viết 2026-11-02 trong đợt đóng lỗ hổng sổ phủ; rà độc lập ở `reports/coverage-closure-audit-2026-11-02.md`. Chưa code / chưa runtime.

## ⚠️ BUILDER-CHECKLIST
- [ ] Rà trước khi làm xong; manifest khớp.
- [ ] Mọi AC có test chạy thật, dán output.
- [ ] Cập nhật COVERAGE (parts + merge.py) với bằng chứng file:dòng + test.
- [ ] Commit, `git status --short` sạch, báo Git SHA; PR vào dev.
