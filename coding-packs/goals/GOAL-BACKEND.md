# GOAL — Backend đầy đủ (W1 → W9)

> Chốt 2026-10-30 (Chủ nhà: "đặt goal để làm xong luôn backend"). Đọc `CLAUDE.md` và `coding-packs/BUILDER-HANDOFF.md` trước.
> Frontend đã xong theo prototype bằng mock transport (`goals/GOAL-FE-PROTOTYPE.md`, ver2.1 D45, D56). Goal này dựng backend thật và nối FE sang `httpTransport`.

## Goal (1 câu)

Dựng backend `apps/{api,worker}` + `packages/{core,db,ai,channels,integrations}` cho mọi TIP P0 + P1 còn hiệu lực trong `02-TASK-GRAPH.md` (44 TIP, W1 → W9), cài handler cho mọi action đã có trong `packages/actions`, nối từng module FE sang `httpTransport` với contract FE ↔ BE xanh, đến khi `NEXT_PUBLIC_API_MODE=http` chạy được toàn app.

**Dòng ngắn để dán vào `/goal`:**
`Làm xong backend AppChat theo coding-packs/goals/GOAL-BACKEND.md: lần lượt từng TIP trong 02-TASK-GRAPH.md (W1→W9), viết TIP rồi làm ngay, test đúng nghiệp vụ của TIP, mỗi TIP một nhánh + commit + PR vào dev; câu hỏi mở ghi QUESTIONS.md, lệch spec ghi DEVIATIONS.md, quyết định theo đề xuất ghi DECISIONS.md.`

## Đọc trước (theo thứ tự)

1. `CLAUDE.md` · `coding-packs/BUILDER-HANDOFF.md` (vai trò, 7 quy tắc, Completion Report, escalation).
2. `coding-packs/02-TASK-GRAPH.md` — thứ tự, phụ thuộc, bản đồ sở hữu file, cổng tài nguyên.
3. `coding-packs/plans/BLUEPRINT.md` + `plans/COMMERCE-DECISIONS.md` — mục mà TIP trích.
4. Standards ở cột "Standards chính" của TIP + toàn bộ `standards/domain/*` + `standards/ops/observability-security.md`.
5. Ba sổ của goal này (dưới) — đọc trước mỗi TIP để không hỏi lại điều đã quyết.

## Ba sổ của goal (bắt buộc dùng)

| Sổ | Ghi gì | Ai đóng |
|----|--------|---------|
| `coding-packs/QUESTIONS.md` | Câu hỏi mở cần Chủ nhà quyết (loại "phải hỏi" ở `standards/domain/gap-filling.md` §2, tài nguyên ngoài, quy tắc nghiệp vụ). Mỗi câu kèm **đề xuất mặc định** và TIP bị ảnh hưởng. | Chủ nhà trả lời → chuyển thành dòng `DECISIONS.md` |
| `coding-packs/DECISIONS.md` | Quyết định thợ **tự chốt theo đề xuất** khi thiết kế im lặng (loại "được tự quyết" ở gap-filling §2), và câu hỏi đã được Chủ nhà trả lời. Mỗi dòng: chỗ trống · bậc tra cứu dừng · lựa chọn · lý do · đảo ngược thế nào · TIP. | Chủ nhà duyệt khi rảnh; quyết định có tính chung được Chủ thầu đưa vào standard |
| `coding-packs/DEVIATIONS.md` | Chỗ code **cố ý khác** Blueprint / standard / contract FE (thư viện ngoài stack, đổi schema action, đổi shape đọc, đổi thứ tự TIP…). | Chủ thầu duyệt lúc verify |

Lệch so với **prototype** (UI) vẫn ghi ở sổ riêng `docs/06-prototype/DEVIATIONS.md` (PD-xxx) như cũ.

**Không dừng chờ trả lời:** câu hỏi mở không chặn cả goal. Thợ ghi câu hỏi + đề xuất, làm theo đề xuất ở phạm vi dễ đảo ngược (cờ / cấu hình / adapter mock), ghi `DECISIONS.md` với trạng thái `tạm theo đề xuất`, rồi làm tiếp. Chỉ dừng TIP (BLOCKED) khi đề xuất không đảo ngược được (luật tiền, pháp lý, xoá dữ liệu, bảo mật) — khi đó chuyển sang TIP kế tiếp không phụ thuộc.

## Vòng làm việc mỗi TIP

1. **Viết TIP rồi làm ngay** (Chủ nhà chốt 2026-10-30, D57): không viết trước cả wave. Sinh `tips/TIP-XXX-<slug>.md` theo khuôn `/vibecode:tip` từ kết quả thật của TIP trước, rồi thi công luôn.
2. Nhánh `tip/XXX-<slug>` tách từ `origin/dev` mới nhất (TIP phụ thuộc TIP chưa merge → tách từ nhánh TIP đó, ghi "xếp chồng" trong PR).
3. Thi công đúng `Files touched`; chỉ điền stub domain mình (bản đồ sở hữu ở `02-TASK-GRAPH.md`).
4. Test **nghiệp vụ của TIP** (dưới), commit ngay khi xanh, `git status --short` sạch.
5. Viết Completion Report vào `reports/TIP-XXX-completion.md` (khuôn ở BUILDER-HANDOFF), push, báo link tạo PR vào `dev` (chưa đăng nhập `gh` → link `compare/dev...<nhánh>`).
6. Cập nhật bảng tiến độ ở cuối file này (TIP · trạng thái · SHA · PR).

## Phạm vi test (D39 + D58) — chỉ nghiệp vụ của TIP

- **Chạy:** test của TIP vừa viết (unit + integration với Postgres + Memurai thật, DB tenant từ template), lint + typecheck của package đổi (`pnpm turbo run lint typecheck --filter=<package đổi>`), contract test FE ↔ BE của domain TIP nối, `pnpm e2e <module>` với `NEXT_PUBLIC_API_MODE=http` khi TIP bật `httpTransport` cho module đó.
- **Không chạy lại:** test cũ của module khác, `pnpm parity --done`, e2e module khác, suite FE toàn bộ. Report ghi "không bị ảnh hưởng — không chạy", không ghi "pass".
- **Ngoại lệ:** TIP sửa kernel (`packages/core/src/kernel`, `packages/db` resolver / provisioner) chạy thêm test kernel; TIP sửa `packages/actions` / `packages/shared` (khi buộc phải, kèm dòng `DEVIATIONS.md`) chạy thêm typecheck `apps/web`.
- **Chạy toàn bộ:** chỉ ở cuối wave (W1…W9) và TIP-046.
- CI GitHub (`ci.yml` affected) vẫn chạy theo cấu hình repo; đỏ thì sửa trên cùng nhánh.

## Định nghĩa ĐẠT

**Mỗi TIP** — đủ cả 6, không có ngưỡng thấp hơn 100%:
1. Acceptance criteria của TIP đều có test chạy thật và xanh.
2. Mọi action của domain có handler; không còn `NOT_IMPLEMENTED` trong danh sách của TIP.
3. Shape đọc đúng contract FE (zod ở `packages/shared/src/api/<domain>.ts`), contract test FE ↔ BE xanh; TIP "nối API" bật `httpTransport` cho module và e2e module chạy http xanh.
4. Tenant isolation + role isolation có test khi TIP chạm dữ liệu có chủ sở hữu.
5. Lint / typecheck package đổi xanh; file trong trần dòng (`pnpm lint:size`).
6. Commit + SHA + Completion Report + ba sổ đã cập nhật.

**Cả goal** — đạt khi:
- 44 TIP ở trạng thái DONE (hoặc PARTIAL chỉ vì ô cần tài nguyên ngoài — ghi rõ "chưa nghiệm thu với provider thật").
- `NEXT_PUBLIC_API_MODE=http`: `pnpm e2e` toàn bộ xanh trên backend thật (cuối W8), `pnpm parity --all` không hồi quy so với mock.
- AI eval gate (TIP-044) đạt ngưỡng của `standards/ai/eval.md` với provider thật — **chỉ khi có key**; chưa có thì ghi PARTIAL.

Ngưỡng duy nhất < 100% là các ô phụ thuộc dịch vụ ngoài (bản chất: không có tài khoản thì không đo được), liệt kê ở bảng tài nguyên dưới.

## Tài nguyên ngoài (không chặn thi công, chặn nghiệm thu)

| Tài nguyên | TIP | Khi chưa có | Trạng thái |
|------------|-----|-------------|-----------|
| LLM qua **9router** (OpenAI-compatible, D33) | 019, 020, 022, 023, 044 | mock model của AI SDK; ô cần provider thật ghi "chưa nghiệm thu" | Chủ nhà cấp sau — Q-001 |
| Embedding 1536 chiều | 020 | mock embed cố định 1536 chiều | Chưa rõ 9router có embed — Q-002 |
| 1–2 tài khoản Zalo cá nhân phụ | 014 | làm 015 trước; 014 dựng adapter + test bằng fake | Chưa có |
| SePay (+ tài khoản nhận tiền) | 010, 032 | adapter `mock`, webhook giả lập | Chưa có |
| Brevo + domain gửi | 004, 006 | adapter `console` in OTP ra log | Chưa có |
| Mật khẩu Postgres máy dev | 002 → hết | TIP-001 không cần DB; từ 002 integration test chờ | Chưa có — Q-007 |
| VPS + domain | 045, 046 | làm cuối; 045 viết script + chạy thử trên máy dev nếu được | Chủ nhà đang hoãn |

## Không làm trong goal này

- Màn FE mới (trừ 017 `apps/widget` và 040 Quản trị nền tảng — hai TIP còn UI thật).
- Adapter sàn thật Shopee / TikTok / Lazada, MCP, module ẩn (Gọi điện, Quy trình, Báo cáo) — ngoài phạm vi phát hành (BUILDER-HANDOFF Roadmap).
- Generative UI phía FE của D55 — chạy cùng TIP-023 nếu Chủ nhà mở goal `goal/genui`; không tự làm ở đây (Q-005).
- Push thẳng `dev` / `main`, tự merge PR, tạo PR `dev → main`.

## Tiến độ

Trạng thái: `chờ` · `đang làm` · `DONE` · `PARTIAL` (chỉ vì tài nguyên ngoài) · `BLOCKED`. Goal bắt đầu khi Chủ nhà đặt `/goal`; tài liệu goal + ba sổ đi cùng commit đầu của nhánh TIP-001 (DC-003).

| TIP | Wave | Trạng thái | Nhánh | SHA | PR |
|-----|------|-----------|-------|-----|----|
| 001 | W1 | chờ | — | — | — |
| 002 | W1 | chờ | — | — | — |
| 003 | W1 | chờ | — | — | — |
| 004 | W2 | chờ | — | — | — |
| 005 | W2 | chờ | — | — | — |
| 006 | W2 | chờ | — | — | — |
| 009 | W3 | chờ | — | — | — |
| 010 | W3 | chờ | — | — | — |
| 011 | W3 | chờ | — | — | — |
| 012 | W3 | chờ | — | — | — |
| 013 | W3 | chờ | — | — | — |
| 014 | W4 | chờ | — | — | — |
| 015 | W4 | chờ | — | — | — |
| 016 | W4 | chờ | — | — | — |
| 017 | W4 | chờ | — | — | — |
| 018 | W4 | chờ | — | — | — |
| 019 | W5 | chờ | — | — | — |
| 020 | W5 | chờ | — | — | — |
| 021 | W5 | chờ | — | — | — |
| 022 | W5 | chờ | — | — | — |
| 023 | W6 | chờ | — | — | — |
| 024 | W6 | chờ | — | — | — |
| 025 | W6 | chờ | — | — | — |
| 026 | W6 | chờ | — | — | — |
| 027 | W6 | chờ | — | — | — |
| 028 | W6 | chờ | — | — | — |
| 029 | W7 | chờ | — | — | — |
| 030 | W7 | chờ | — | — | — |
| 031 | W7 | chờ | — | — | — |
| 032 | W7 | chờ | — | — | — |
| 033 | W7 | chờ | — | — | — |
| 034 | W8 | chờ | — | — | — |
| 035 | W8 | chờ | — | — | — |
| 036 | W8 | chờ | — | — | — |
| 037 | W8 | chờ | — | — | — |
| 038 | W8 | chờ | — | — | — |
| 039 | W8 | chờ | — | — | — |
| 040 | W8 | chờ | — | — | — |
| 041 | W8 | chờ | — | — | — |
| 042 | W8 | chờ | — | — | — |
| 043 | W8 | chờ | — | — | — |
| 044 | W9 | chờ | — | — | — |
| 045 | W9 | chờ | — | — | — |
| 046 | W9 | chờ | — | — | — |
