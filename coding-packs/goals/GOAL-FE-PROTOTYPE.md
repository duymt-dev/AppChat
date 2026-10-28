# GOAL — FE theo prototype (`goal/fe-prototype`)

> Chốt 2026-10-28 (RRI **D38**). Đọc `CLAUDE.md` (gốc repo) và `coding-packs/BUILDER-HANDOFF.md` trước.

## Goal (1 câu)

Dựng toàn bộ frontend `apps/web` cho mọi màn P0 + P1 **giống prototype `AppChat.dc.html` dưới 5% sai khác pixel** ở 1440×900, chạy được trên mobile 390×844, theo đúng `standards/ui/frontend-structure.md`, dùng **mock transport** đúng contract API / action của Blueprint để khi backend xong chỉ cần đổi transport, không sửa component.

**Dòng ngắn để dán vào `/goal`:**
`Dựng frontend apps/web theo prototype AppChat.dc.html (parity < 5% ở 1440×900, mobile 390) bằng mock transport đúng contract Blueprint; làm theo coding-packs/goals/GOAL-FE-PROTOTYPE.md, CLAUDE.md và standards/ui/*; commit từng màn kèm parity report.`

## Đọc trước (theo thứ tự)

1. `CLAUDE.md` — cấu trúc code, quy tắc, bản đồ prototype.
2. `coding-packs/standards/ui/frontend-structure.md` · `standards/ui/prototype-parity.md` · `standards/i18n/i18n.md` · `standards/code/file-size-module-layout.md` · `standards/code/testing.md`.
3. `coding-packs/plans/BLUEPRINT.md` §1.1 (monorepo), §1.4 (cây web), §3.1 + §3.3 (ActionDef, policy nguồn `ui`), §3.4 (danh mục action), §3.5 (quyền 5 vai trò), §4.1 + §4.4 (API envelope + endpoint đọc), §7.0–7.4 (UI kit, shell, màn, client state, i18n).
4. `coding-packs/plans/COMMERCE-DECISIONS.md` — nhãn, trạng thái, chip lọc của báo giá / hợp đồng / đơn / đề nghị thanh toán / loyalty.
5. Prototype `coding-packs/docs/06-prototype/AppChat.dc.html` — vùng của màn đang làm (bảng ở `CLAUDE.md` §6).

## Kiến trúc mock (bắt buộc, để không phải viết lại)

- `apps/web/src/shared/api/transport.ts`: interface `Transport { get(path, params); action(id, input, opts) }`. Hai bản: `httpTransport` (thật, dùng sau) và `mockTransport`. Chọn bằng `NEXT_PUBLIC_API_MODE=mock|http` (mặc định `mock` trong goal này).
- `mockTransport` trả đúng envelope Blueprint §4.1: `{ data }`, `{ data, next_cursor }`, `{ error: { code } }`. Đọc dữ liệu từ `fixtures/prototype-parity/*.json`, trích **nguyên văn** dữ liệu mẫu của prototype (state ở L7668+: khách, hội thoại, báo giá, đơn, lịch, agent, RAG, …) để parity khớp.
- **Mock action executor:** `useAction` gọi `transport.action`. Mock đọc `ActionDef` từ `packages/actions` (zod input / output, `risk`, `bulk`, `undo`, `invalidates`) và áp policy nguồn `ui` (Blueprint §3.3): chạy ngay; `bulk` → 202 `preview_required` + `confirm_token`; có `undo` → trả `undo_until` để hiện toast Hoàn tác. Ghi vào store in-memory để màn cập nhật (invalidate query).
- **Quyền:** `GET /me/authz` mock trả permission + scope theo vai trò chọn được ở dev toolbar (Chủ sở hữu / Quản lý / Sales / CSKH / Kế toán — Blueprint §3.5) để kiểm `useCan` / chip "Của tôi".
- **Trợ lý AI ở mock:** phát lại hội thoại kịch bản (fixture) qua cùng interface stream; ConfirmCard / PlanCard / ResultCard dựng từ dữ liệu giả. Không gọi LLM.
- **Realtime ở mock:** bộ phát event giả (tin nhắn mới, đổi trạng thái) qua cùng `event-invalidation.ts`.
- `packages/actions`: chỉ định nghĩa **schema + metadata** của action mà UI dùng (đúng id / tên trường Blueprint §3.4). Handler backend làm sau ở TIP tương ứng.

## Phạm vi màn

| Pha | Màn / phần | Prototype | Ghi chú |
|-----|-----------|-----------|---------|
| F0 | Scaffold: root workspace (đúng Blueprint §1.1), `apps/web`, `packages/{ui,shared,actions}`; `theme.ts` từ token prototype (L39–392); icon sprite → `packages/ui/icons`; AppShell + NavRail + NavFlyout + MobileTabBar + AssistantDock khung; `shared/*`; next-intl vi + en; lint (size, boundaries, i18next); `tools/parity` + `parity.manifest.ts` + baseline; e2e harness 390 | L637–1078, L8525 | Gate: shell parity < 5%, CI lint / typecheck / test xanh |
| F1 | Auth: login, register, OTP, forgot, reset · popup khai báo DN · màn chào mừng trial · chờ khởi tạo workspace | L459–630, L758–790 | OTP Email (ngoại lệ D-OTP), ẩn social login |
| F2 | Dashboard · Hộp thư (3 cột, folders, chat, composer, panel 360°, chế độ AI, handoff) · Khách hàng (bảng / kanban, 360°, phụ trách + đồng phụ trách, xin chia sẻ, chuyển phụ trách) | L1079, L1505, L2451 | D32 hộp mới không đo pixel |
| F3 | Trợ lý AI (page + dock, Chat / Cowork, plan / confirm / result card) · AI Agents (list, template gallery, builder, tạo bằng Trợ lý, phiên bản, test chat) · Chờ duyệt · Nhật ký hành động | L1178, L2227 | Mức AI thay tên model (D29) |
| F4 | Sản phẩm · Báo giá (editor, version, AI soạn) · Hợp đồng (kanban 4 cột, drawer, ký) · trang ký công khai `/sign/[token]` · Đơn hàng (2 trục, nguồn sàn) · Đề nghị thanh toán (QR, thu tiền) | L5624, L4957, L5343, L5489, L5233 | Nhãn theo COMMERCE-DECISIONS |
| F5 | Lịch hẹn · Ticket · Marketing (gợi ý, wizard, chi tiết) · Khách thân thiết | L3871, L4837, L3394, L4412 | |
| F6 | Cài đặt (registry): Tổng quan + giờ làm việc · Ngôn ngữ · Thành viên · Vai trò & phân quyền (chỉ đọc) · Kênh kết nối · Web widget · Trường dữ liệu · Thẻ · Câu trả lời mẫu · Mẫu chứng từ · Nền tảng kết nối · AI Models · Dữ liệu RAG · AI Governance · Nhật ký AI / Audit · SLA mặc định · Thông báo · Gói & ví · popup Nâng cấp | L5778–7421 | Mục OUT ẩn (Blueprint §7.2) |
| F7 | Rà mobile 390 mọi màn · độ phủ `en` 100% key · chạy `pnpm parity --all` · dọn file vượt trần | — | Gate cuối |

**Không làm trong goal này:** backend thật, gọi LLM thật, module ẩn (Gọi điện, Quy trình, Báo cáo), Quản trị nền tảng (làm cùng TIP-040), vai trò tuỳ biến P1 (chỉ màn chỉ đọc).

## Định nghĩa ĐẠT (cho từng màn)

1. **Parity:** mỗi màn × trạng thái chính khai trong `parity.manifest.ts` có `diffRatio ≤ 0.05` (đã mask vùng động; ngoại lệ chỉ theo danh sách có mã quyết định). Màn mới không có trong prototype: không đo pixel, nhưng chỉ dùng token + pattern sẵn có.
2. **Mobile:** e2e 390×844 pass: không tràn ngang, vùng chạm ≥ 44px, action chính chạy được.
3. **Cấu trúc:** đúng `frontend-structure.md` — `page.tsx` ≤ 120 dòng, screen ≤ 250, mọi file ≤ 400; ghi chỉ qua `useAction`; có `ui-commands.ts` (prefill / open / filter) cho màn có form; đủ 5 trạng thái (loading, empty, error, ready, no-permission).
4. **i18n:** `pnpm i18n:check` xanh (vi + en đủ key, không chuỗi cứng).
5. **Quyền:** đổi vai trò ở dev toolbar → nút / chip đúng ma trận Blueprint §3.5.
6. **Chất lượng:** lint / typecheck / test **của phần bị ảnh hưởng** xanh; component có logic có test (`*.test.tsx`).

**Phạm vi test (D39) — chỉ test cái vừa sửa:**
- Mỗi màn: `pnpm parity <id>` cho các ID của màn đó, `pnpm e2e <module>` (desktop + 390), `pnpm turbo run test lint typecheck --filter=...[origin/main]`, `pnpm i18n:check` nếu thêm chuỗi.
- Sửa lớp dùng chung (theme, primitive `packages/ui`, `shared/*`, schema `packages/actions`, mock transport) → chạy thêm `pnpm parity --done` (mọi màn đã ✅).
- Chạy toàn bộ (`pnpm lint && pnpm typecheck && pnpm test && pnpm parity --all && pnpm e2e`) **chỉ** ở cuối mỗi pha và ở F7.

Tiêu chí đúng-sai (3, 4, 5, 6) không có ngưỡng thấp hơn 100%. Ngưỡng 5% của parity là ngưỡng Chủ nhà đặt.

## Cách làm & báo cáo

- Nhánh `goal/fe-prototype` tách từ `origin/dev`; làm tuần tự F0 → F7; trong một pha làm từng màn.
- **Hết mỗi pha:** chạy full một lần → `git rebase origin/dev` → push → `gh pr create --base dev` (một PR / pha, thân PR theo `standards/workflow/git-flow-ci.md` §3) → CI xanh. Không PR vào `main`, không tự merge. Pha sau làm tiếp trên cùng nhánh (PR xếp chồng) nếu PR pha trước chưa được merge.
- F0 dựng luôn `.github/workflows/ci.yml`, `parity.yml`, `e2e.yml`, `full.yml` theo standard.
- **Mỗi màn xong:** chạy parity + e2e mobile + lint / test **của phần bị ảnh hưởng** → commit (một màn một commit trở lên) → cập nhật dòng tương ứng trong `coding-packs/reports/goal-fe-prototype.md` (đã liệt kê sẵn 135 dòng F0–F7; ID dòng = id trong `parity.manifest.ts`; điền TT, diffRatio, Mobile 390, Commit) và cập nhật bảng Tổng quan tiến độ.
- **Hết mỗi pha:** Completion Report theo `BUILDER-HANDOFF.md` vào cùng file report; `git status --short` sạch; báo SHA.
- Màn không xuống được 5% sau khi đã lấy đúng giá trị từ prototype → ghi vùng lệch + ảnh diff + nguyên nhân, escalation L2 (không tự nới ngưỡng, không tự thêm ngoại lệ).
- Spec thiếu / mâu thuẫn → L2. Muốn đổi luật nghiệp vụ, quyền, nhãn pháp lý → L3.

## Khi backend xong (ngoài goal này)

Mỗi TIP backend tương ứng (004, 005, 015, 016, 021, 023, 029–033, …) bật `httpTransport` cho module của nó và chạy lại e2e; component không đổi. Fixture parity giữ nguyên để CI parity tiếp tục chạy ở chế độ mock.
