# GOAL — Phát hành AppChat (83 TIP → cổng phát hành TIP-046)

> Thay `goals/GOAL-BACKEND.md` từ 2026-11-03 (file cũ giữ làm lịch sử TIP 001–035). Nguồn duy nhất cho thứ tự và tiến độ phần còn lại.

## Goal (1 câu)

Làm tuần tự **83 TIP chưa DONE** theo bảng thứ tự dưới (TIP-023b → … → TIP-046) cho tới khi **TIP-046 (cổng phát hành) đạt**: backend + FE chạy thật ở `NEXT_PUBLIC_API_MODE=http`, mọi dòng `COVERAGE.md` ĐẠT hoặc NGOÀI / QUY-TẮC có mã, hạ tầng native sẵn sàng deploy.

**Câu dán vào `/goal`:**
`Làm xong AppChat tới phát hành theo coding-packs/goals/GOAL-RELEASE.md: lần lượt từng TIP trong bảng Thứ tự (023b → 046) tới khi TIP-046 đạt. Mỗi TIP: rà "Rà trước khi làm" với code thật; làm đúng manifest (tips/manifests/TIP-XXX-files.md); đọc và đối chiếu mọi standard TIP ghi tên, completion report có bảng "Đối chiếu standards" (file:dòng hoặc mã DV); test theo mục "Cổng test" của GOAL-RELEASE.md; commit; gh pr create --base dev; cập nhật COVERAGE (tools/obligations/parts + merge.py) và bảng tiến độ GOAL-RELEASE.md. TIP nhiều pha thì một PR mỗi pha. Test CHỈ trong phạm vi TIP thay đổi: cổng commit chạy lint/typecheck/unit của package đổi + depcheck + lint:size, lint:tokens, lint:masks, i18n:check; cổng chốt (một lần mỗi TIP) chạy lint/typecheck/unit/build của package đổi, integration CHỈ các file test của domain/action TIP chạm, E2E mock + http CHỈ spec của module TIP, parity màn TIP sửa; sửa lớp dùng chung (kernel, packages/db|actions|shared|ui, apps/web/src/shared) thì thêm E2E mock các module dùng phần đó + parity --done. KHÔNG chạy full integration hay full E2E hồi quy ở TIP thường — chỉ chạy ở TIP-046. Sau rebase chỉ chạy lại phần bị ảnh hưởng. Ca đỏ trong phạm vi TIP mà đã đỏ sẵn trên origin/dev hoặc là lỗi môi trường đã ghi sổ (vd Q-042, Q-010) thì chạy riêng chứng minh rồi ghi report — không tính là cổng đỏ. Thiếu provider thật (Zalo, SePay, Brevo, VPS, credit) ghi "chưa nghiệm thu với provider thật", không dừng. ai:live: lỗi hạ tầng provider chạy lại, lỗi hệ thống phải sửa, không hạ ngưỡng. Nhánh: tip/XXX-<slug> từ origin/dev; nếu PR TIP trước chưa merge thì tách xếp chồng từ nhánh TIP trước. Trước mỗi PR: git fetch, PR trước đã merge thì rebase lên origin/dev, chưa merge thì rebase lên nhánh TIP trước; thân PR ghi "xếp chồng trên #N — merge #N trước". Mở PR xong là sang ngay pha / TIP kế trong cùng lượt — KHÔNG dừng để tóm tắt hay chờ phản hồi; tiến độ ghi vào bảng tiến độ và coding-packs/HANDOFF-NEXT.md, không báo qua chat. Câu hỏi mới ghi QUESTIONS.md kèm đề xuất rồi làm tiếp theo đề xuất; quyết định kỹ thuật ghi DECISIONS.md; lệch spec ghi DEVIATIONS.md. Chỉ dừng khi: (1) TIP-046 đạt; (2) cần quyết định về luật tiền / quyền / pháp lý / xoá dữ liệu; (3) lỗi test thuộc phạm vi TIP mà đã thử sửa không được — ghi rõ lý do vào HANDOFF-NEXT.md.`

## Đọc trước (theo thứ tự)

1. `CLAUDE.md` · `coding-packs/BUILDER-HANDOFF.md` (vai trò, Completion Report, escalation).
2. TIP đang làm + manifest `tips/manifests/TIP-XXX-files.md` + mọi standard TIP ghi tên.
3. `plans/COMMERCE-DECISIONS.md` (luật đã chốt, không đổi) + mục `plans/BLUEPRINT.md` mà TIP trích.
4. Ba sổ: `QUESTIONS.md` · `DECISIONS.md` (đến DC-305) · `DEVIATIONS.md`; lệch prototype ở `docs/06-prototype/DEVIATIONS.md`.
5. `COVERAGE.md` — dòng TIP đang làm nhận (cột TIP nhận).

## Vòng làm mỗi TIP

1. **Rà trước khi làm** (mục cùng tên trong TIP): đọc lại mọi file trong manifest trên `origin/dev` mới nhất; code lệch CONTEXT → sửa TIP (dòng "Rà lại <ngày>") rồi mới làm. `python -X utf8 tools/obligations/manifests.py <tip>` tính lại giao file; thêm path → cập nhật manifest + header hai phía (`--sync <tip>`), `--check` + `--order` sạch.
2. Nhánh `tip/XXX-<slug>` từ `origin/dev` mới nhất (bảng ghi sẵn tên). TIP trước chưa merge → tách từ nhánh đó, ghi "xếp chồng" trong PR.
3. Thi công đúng manifest; file ngoài manifest = sửa manifest trước. Ghi chỉ qua `ActionExecutor`; không đổi luật COMMERCE / quyền / đơn giá Credit.
3b. **Đối chiếu standards:** đọc mọi file trong mục `APPLICABLE STANDARDS` của TIP (danh mục `standards/README.md`) trước khi viết code của phần đó; luật máy không kiểm (thứ tự composite index, deferred join, envelope `{ data }` / `{ error }`, preview risk send/money/delete/config, test §12 mỗi action…) soát tay khi tự review diff.
4. Test theo **Cổng test** (mục dưới) — **chỉ phạm vi TIP thay đổi**. Cổng commit đỏ → không commit; cổng chốt đỏ → không báo DONE.
5. `reports/TIP-XXX-completion.md` (khuôn BUILDER-HANDOFF, có mục **Đối chiếu standards**: mỗi standard TIP ghi tên → file:dòng tuân thủ hoặc mã DV khi lệch) · cập nhật `tools/obligations/parts/*.md` (trạng thái + bằng chứng file:dòng + test) → `python -X utf8 tools/obligations/merge.py` · `git status --short` sạch.
6. `git push -u origin <nhánh>` → `gh pr create --base dev` (thân PR theo `standards/workflow/git-flow-ci.md`). Không PR vào `main`, không tự merge.
7. Cập nhật bảng tiến độ dưới (trạng thái · SHA · PR) — commit tài liệu này trên `dev`.

**Không dừng chờ trả lời:** câu hỏi mới ghi `QUESTIONS.md` + đề xuất, làm theo đề xuất ở phạm vi đảo ngược được (cờ / cấu hình / adapter mock), ghi DC. Chỉ BLOCKED khi đề xuất không đảo ngược được (luật tiền, quyền, pháp lý, xoá dữ liệu, bảo mật) — khi đó làm TIP kế tiếp không phụ thuộc.

## Cổng test (D59 — chỉ phạm vi TIP)

**Nguyên tắc:** chỉ test phần TIP thay đổi. "Phần thay đổi" = package có file đổi so với nhánh nền (`origin/dev`, hoặc nhánh TIP trước khi xếp chồng) + domain / action / màn mà TIP chạm. **Full integration và full E2E hồi quy chỉ chạy ở TIP-046**, không chạy ở TIP thường.

| Cổng | Chạy | Không chạy |
|------|------|-----------|
| **Khi làm** | File test / spec trực tiếp phần đang sửa | build, integration, E2E rộng |
| **Trước mỗi commit code** | `pnpm turbo run lint typecheck test --filter=<package đổi>` · `pnpm depcheck` · `pnpm lint:size` · `pnpm lint:tokens` · `pnpm lint:masks` · `pnpm i18n:check` | package không đổi |
| **Chốt TIP** (một lần, ở pha cuối, trước report) | `pnpm turbo run lint typecheck test build --filter=...[<nhánh nền>]` (package đổi + package phụ thuộc nó) · integration **chỉ** `apps/api/test/integration/<domain>*.test.ts` của domain TIP chạm + `apps/api/test/integration/actions/<action id>.action.test.ts` của action TIP thêm / sửa (+ `apps/worker/test/integration/*` liên quan nếu TIP sửa worker) · `pnpm depcheck` · `lint:size` · `lint:tokens` · `lint:masks` · `i18n:check` · E2E **chỉ spec module TIP** ở `mock` (`pnpm e2e <module>`) và `http` (`pnpm e2e:http <spec>`) · `pnpm parity <id>` màn TIP sửa | `pnpm test:integration` toàn bộ · `pnpm e2e` toàn bộ · `parity --done` (trừ khi sửa lớp dùng chung) |

- **Sửa lớp dùng chung** (kernel, `packages/{db,actions,shared,ui}`, `apps/web/src/shared`) → thêm E2E mock các module dùng phần đó + `pnpm parity --done`; sửa kernel action / executor → thêm integration `actions/*` của kernel. Vẫn không chạy full integration / full E2E.
- **TIP nhiều pha:** mỗi pha qua cổng commit; cổng chốt chạy một lần ở pha cuối. **Sau rebase** chỉ chạy lại phần bị ảnh hưởng.
- **Ca đỏ có sẵn:** ca trong phạm vi TIP nhưng đã đỏ trên `origin/dev`, hoặc lỗi môi trường đã ghi sổ (Q-042 phiên Zalo giả, Q-010 E2E chập chờn) → chạy riêng chứng minh, ghi tên + bằng chứng vào report (và `QUESTIONS.md` nếu mới); không tính là cổng đỏ, không skip test.
- **TIP-046 (cổng phát hành)** là nơi duy nhất chạy full: `pnpm test:integration` toàn bộ · `pnpm e2e` toàn bộ · `pnpm e2e:http` toàn bộ · `pnpm parity --done`.

## Định nghĩa ĐẠT

**Mỗi TIP:** mọi AC có test chạy thật và xanh · mọi action của TIP có handler · shape đọc đúng contract FE, contract test xanh · tenant + role isolation có test khi chạm dữ liệu có chủ · cổng "chốt TIP" xanh · commit + SHA + PR + Completion Report + COVERAGE + ba sổ cập nhật.

**Cả goal:** 83 TIP DONE (hoặc PARTIAL **chỉ** vì ô cần tài nguyên ngoài, ghi "chưa nghiệm thu với provider thật") · `node tools/release/gate.mjs --sha <sha>` (TIP-046) không còn ô đỏ ngoài ô `unknown-resource` · `COVERAGE.md` không còn dòng CHƯA / GIẢ / MỘT PHẦN trừ dòng chờ tài nguyên ngoài.

## Tài nguyên ngoài (không chặn thi công, chặn nghiệm thu / bán)

| Tài nguyên | TIP | Khi chưa có | Trạng thái (2026-11-03) |
|------------|-----|-------------|--------------------------|
| LLM chat qua 9router | 019b, 022b/c, 023b–g, 044 | mock model | **Có** — `LLM_SEED_*` trong `.env`, đã kiểm `/models` 200 + chat 200 (Q-001) |
| Embedding OpenAI 1536 chiều | 020e, 044 | embedding giả | Key có (`EMBED_SEED_*`), tài khoản hết credit — Chủ nhà nạp (Q-002, DC-305) |
| Zalo cá nhân thật | 014b, 014c, 022d, 044 | fake transport | Tới bước nghiệm thu thì nhắn Chủ nhà quét QR (Q-003) |
| SePay (thu tiền gói) | 012b, 039 | adapter `mock` | Hoãn (Q-004) — production cấm `mock` |
| Brevo + domain gửi mail | 004c, 012c | adapter `console` | Chưa có (Q-004) — production cấm `console` |
| VPS + domain | 045, 046 | `infra/` viết đủ + `pnpm infra:check`, script mặc định `plan` | Hoãn; viết infra trước (Q-006, DC-304) |

## Checklist bán được (ngoài code — Chủ nhà)

- [ ] VPS + domain + DNS; chạy `infra/scripts/provision-app.sh --apply` theo `infra/README.md`.
- [ ] SePay + tài khoản nhận tiền thật; Brevo + domain gửi đã xác minh.
- [ ] Nạp credit OpenAI (embedding); 9router đủ quota cho tải thật.
- [ ] Quét QR Zalo cho tài khoản nghiệm thu.
- [ ] Pháp lý: Điều khoản dịch vụ, Chính sách bảo mật (Nghị định 13/2023), xuất hoá đơn GTGT tiền gói — Chủ nhà xác nhận làm trong app hay ngoài (chưa có TIP).
- [ ] Gate TIP-046 đạt trên SHA phát hành; Chủ nhà tự merge `dev → main`.

## Thứ tự và tiến độ

Sinh bằng `python -X utf8 tools/obligations/order.py --table`: sắp topo theo khai `integrate A before B` (máy kiểm hai phía) + dòng "Depends on" của từng TIP; khi hai nguồn mâu thuẫn, khai hai phía thắng. Thêm / đổi phụ thuộc → chạy lại công cụ, giữ cột trạng thái đã điền. TIP 001–035 đã DONE — xem `goals/GOAL-BACKEND.md`.

Trạng thái: `chờ` · `đang làm` · `DONE` · `PARTIAL` (chỉ vì tài nguyên ngoài) · `BLOCKED`.

| # | TIP | Wave | Trạng thái | Nhánh | SHA | PR |
|---|-----|------|-----------|-------|-----|----|
| 1 | [023b](../tips/TIP-023b-assistant-coverage.md) | W8 | DONE | `tip/023b-assistant-coverage` | `d373fea` | [#51](https://github.com/duymt-dev/AppChat/pull/51) |
| 2 | [023c](../tips/TIP-023c-generative-ui.md) | W8 | DONE | `tip/023c-generative-ui` · `tip/023c-g2-screen-assistant` · `tip/023c-g3-connect-via-assistant` · `tip/023c-close` | `2dd87b0` (G1) · `b9222ed` (G2) · `bac0f02` (G3) · `2d72765` (chốt) | [#52](https://github.com/duymt-dev/AppChat/pull/52) (G1, xếp chồng #51) · [#53](https://github.com/duymt-dev/AppChat/pull/53) (G2) · [#54](https://github.com/duymt-dev/AppChat/pull/54) (G3) · [#55](https://github.com/duymt-dev/AppChat/pull/55) (chốt, xếp chồng #54) |
| 3 | [030b](../tips/TIP-030b-contract-files.md) | W8 | DONE | `tip/030b-contract-files` · `tip/030b-f2-ai-draft` · `tip/030b-f3-appendix` | `6181c85` (F1) · `9467d52` (F2) · `7fe3775` (F3 + chốt) | [#56](https://github.com/duymt-dev/AppChat/pull/56) (F1, xếp chồng #55) · [#57](https://github.com/duymt-dev/AppChat/pull/57) (F2, xếp chồng #56) · [#58](https://github.com/duymt-dev/AppChat/pull/58) (F3, xếp chồng #57) |
| 4 | [032b](../tips/TIP-032b-commerce-gaps.md) | W8 | DONE | `tip/032b-commerce-gaps` · `tip/032b-p2-delivery` · `tip/032b-p3-packages` · `tip/032b-p4-catalog` | `642f3e6` (P1) · `c9f4c2a` (P2) · `0bb99d8` (P3) · `730b5f3` (P4) · `54d4fa4` (chốt) | [#59](https://github.com/duymt-dev/AppChat/pull/59) · [#60](https://github.com/duymt-dev/AppChat/pull/60) · [#61](https://github.com/duymt-dev/AppChat/pull/61) · [#62](https://github.com/duymt-dev/AppChat/pull/62) |
| 5 | [015b](../tips/TIP-015b-contact-memory.md) | W8 | đang làm (P1, P2 xong) | `tip/015b-contact-memory` · `tip/015b-p2-insights` | `b470043` (P1) · `bbb6707` (P2) | [#63](https://github.com/duymt-dev/AppChat/pull/63) (P1, xếp chồng #62) · [#64](https://github.com/duymt-dev/AppChat/pull/64) (P2, xếp chồng #63) |
| 6 | [036](../tips/TIP-036-loyalty.md) | W8 | chờ | `tip/036-loyalty` | | |
| 7 | [020b](../tips/TIP-020b-kb-source-management.md) | W8 | chờ | `tip/020b-kb-source-management` | | |
| 8 | [043](../tips/TIP-043-kb-conversation-learning.md) | W8 | chờ | `tip/043-kb-conversation-learning` | | |
| 9 | [045b](../tips/TIP-045b-app-hardening.md) | W8 | chờ | `tip/045b-app-hardening` | | |
| 10 | [003d](../tips/TIP-003d-openapi.md) | W8 | chờ | `tip/003d-openapi` | | |
| 11 | [014b](../tips/TIP-014b-zalo-lifecycle.md) | W8 | chờ | `tip/014b-zalo-lifecycle` | | |
| 12 | [042](../tips/TIP-042-custom-roles-teams.md) | W8 | chờ | `tip/042-custom-roles-teams` | | |
| 13 | [042b](../tips/TIP-042b-lead-routing.md) | W8 | chờ | `tip/042b-lead-routing` | | |
| 14 | [042c](../tips/TIP-042c-record-scope.md) | W8 | chờ | `tip/042c-record-scope` | | |
| 15 | [022b](../tips/TIP-022b-agent-channel-behavior.md) | W8 | chờ | `tip/022b-agent-channel-behavior` | | |
| 16 | [037](../tips/TIP-037-marketing.md) | W8 | chờ | `tip/037-marketing` | | |
| 17 | [038](../tips/TIP-038-insights-dashboard.md) | W8 | chờ | `tip/038-insights-dashboard` | | |
| 18 | [039](../tips/TIP-039-billing-lifecycle.md) | W8 | chờ | `tip/039-billing-lifecycle` | | |
| 19 | [040](../tips/TIP-040-platform-admin.md) | W8 | chờ | `tip/040-platform-admin` | | |
| 20 | [038b](../tips/TIP-038b-ai-first-data-transfer.md) | W8 | chờ | `tip/038b-ai-first-data-transfer` | | |
| 21 | [041](../tips/TIP-041-workspace-lifecycle.md) | W8 | chờ | `tip/041-workspace-lifecycle` | | |
| 22 | [025b](../tips/TIP-025b-inbox-vertical.md) | W8 | chờ | `tip/025b-inbox-vertical` | | |
| 23 | [019b](../tips/TIP-019b-runtime-integrity.md) | W8 | chờ | `tip/019b-runtime-integrity` | | |
| 24 | [012b](../tips/TIP-012b-bank-connectors.md) | W8 | chờ | `tip/012b-bank-connectors` | | |
| 25 | [026b](../tips/TIP-026b-crm-activities.md) | W8 | chờ | `tip/026b-crm-activities` | | |
| 26 | [015d](../tips/TIP-015d-contact-transfer.md) | W8 | chờ | `tip/015d-contact-transfer` | | |
| 27 | [032c](../tips/TIP-032c-commerce-edit-integrity.md) | W8 | chờ | `tip/032c-commerce-edit-integrity` | | |
| 28 | [015f](../tips/TIP-015f-contact-lifecycle.md) | W8 | chờ | `tip/015f-contact-lifecycle` | | |
| 29 | [015e](../tips/TIP-015e-contact-merge-integrity.md) | W8 | chờ | `tip/015e-contact-merge-integrity` | | |
| 30 | [012c](../tips/TIP-012c-tenant-mail.md) | W8 | chờ | `tip/012c-tenant-mail` | | |
| 31 | [033b](../tips/TIP-033b-booking-operations.md) | W8 | chờ | `tip/033b-booking-operations` | | |
| 32 | [019c](../tips/TIP-019c-ai-utilities.md) | W8 | chờ | `tip/019c-ai-utilities` | | |
| 33 | [015c](../tips/TIP-015c-contact-privacy.md) | W8 | chờ | `tip/015c-contact-privacy` | | |
| 34 | [023d](../tips/TIP-023d-assistant-plans.md) | W8 | chờ | `tip/023d-assistant-plans` | | |
| 35 | [023e](../tips/TIP-023e-action-discovery.md) | W8 | chờ | `tip/023e-action-discovery` | | |
| 36 | [023f](../tips/TIP-023f-assistant-input.md) | W8 | chờ | `tip/023f-assistant-input` | | |
| 37 | [003b](../tips/TIP-003b-event-protocol.md) | W8 | chờ | `tip/003b-event-protocol` | | |
| 38 | [003c](../tips/TIP-003c-system-actions.md) | W8 | chờ | `tip/003c-system-actions` | | |
| 39 | [006b](../tips/TIP-006b-event-delivery.md) | W8 | chờ | `tip/006b-event-delivery` | | |
| 40 | [030c](../tips/TIP-030c-parent-signing.md) | W8 | chờ | `tip/030c-parent-signing` | | |
| 41 | [015g](../tips/TIP-015g-crm-stage-hold.md) | W8 | chờ | `tip/015g-crm-stage-hold` | | |
| 42 | [021b](../tips/TIP-021b-agent-drafting.md) | W8 | chờ | `tip/021b-agent-drafting` | | |
| 43 | [023g](../tips/TIP-023g-record-ai-entrypoints.md) | W8 | chờ | `tip/023g-record-ai-entrypoints` | | |
| 44 | [020c](../tips/TIP-020c-kb-effective-scope.md) | W8 | chờ | `tip/020c-kb-effective-scope` | | |
| 45 | [020d](../tips/TIP-020d-rag-citations.md) | W8 | chờ | `tip/020d-rag-citations` | | |
| 46 | [033c](../tips/TIP-033c-appointment-order-suggestions.md) | W8 | chờ | `tip/033c-appointment-order-suggestions` | | |
| 47 | [032d](../tips/TIP-032d-commerce-record-files.md) | W8 | chờ | `tip/032d-commerce-record-files` | | |
| 48 | [027b](../tips/TIP-027b-product-media-description.md) | W8 | chờ | `tip/027b-product-media-description` | | |
| 49 | [028b](../tips/TIP-028b-document-integrity.md) | W8 | chờ | `tip/028b-document-integrity` | | |
| 50 | [034b](../tips/TIP-034b-support-categories.md) | W8 | chờ | `tip/034b-support-categories` | | |
| 51 | [001b](../tips/TIP-001b-web-architecture.md) | W8 | chờ | `tip/001b-web-architecture` | | |
| 52 | [034c](../tips/TIP-034c-ticket-bulk.md) | W8 | chờ | `tip/034c-ticket-bulk` | | |
| 53 | [022c](../tips/TIP-022c-sales-behavior.md) | W8 | chờ | `tip/022c-sales-behavior` | | |
| 54 | [006c](../tips/TIP-006c-realtime-events.md) | W8 | chờ | `tip/006c-realtime-events` | | |
| 55 | [016b](../tips/TIP-016b-nav-badges.md) | W8 | chờ | `tip/016b-nav-badges` | | |
| 56 | [034d](../tips/TIP-034d-ticket-stock-trends.md) | W8 | chờ | `tip/034d-ticket-stock-trends` | | |
| 57 | [020e](../tips/TIP-020e-rag-model-lifecycle.md) | W8 | chờ | `tip/020e-rag-model-lifecycle` | | |
| 58 | [003e](../tips/TIP-003e-action-integrity.md) | W8 | chờ | `tip/003e-action-integrity` | | |
| 59 | [001c](../tips/TIP-001c-ui-states-mobile.md) | W8 | chờ | `tip/001c-ui-states-mobile` | | |
| 60 | [003f](../tips/TIP-003f-validation-forms.md) | W8 | chờ | `tip/003f-validation-forms` | | |
| 61 | [003g](../tips/TIP-003g-time-query-hygiene.md) | W8 | chờ | `tip/003g-time-query-hygiene` | | |
| 62 | [003h](../tips/TIP-003h-state-flows.md) | W8 | chờ | `tip/003h-state-flows` | | |
| 63 | [003i](../tips/TIP-003i-api-contract-gaps.md) | W8 | chờ | `tip/003i-api-contract-gaps` | | |
| 64 | [004b](../tips/TIP-004b-auth-security.md) | W8 | chờ | `tip/004b-auth-security` | | |
| 65 | [004c](../tips/TIP-004c-mail-provider-webhooks.md) | W8 | chờ | `tip/004c-mail-provider-webhooks` | | |
| 66 | [011b](../tips/TIP-011b-industry-taxonomy.md) | W8 | chờ | `tip/011b-industry-taxonomy` | | |
| 67 | [012d](../tips/TIP-012d-storage-connector.md) | W8 | chờ | `tip/012d-storage-connector` | | |
| 68 | [013b](../tips/TIP-013b-settings-workspace.md) | W8 | chờ | `tip/013b-settings-workspace` | | |
| 69 | [013c](../tips/TIP-013c-owner-availability.md) | W8 | chờ | `tip/013c-owner-availability` | | |
| 70 | [014c](../tips/TIP-014c-channel-consistency.md) | W8 | chờ | `tip/014c-channel-consistency` | | |
| 71 | [017b](../tips/TIP-017b-web-widget.md) | W8 | chờ | `tip/017b-web-widget` | | |
| 72 | [018b](../tips/TIP-018b-email-oauth.md) | W8 | chờ | `tip/018b-email-oauth` | | |
| 73 | [019d](../tips/TIP-019d-agent-authority.md) | W8 | chờ | `tip/019d-agent-authority` | | |
| 74 | [020f](../tips/TIP-020f-kb-parsers.md) | W8 | chờ | `tip/020f-kb-parsers` | | |
| 75 | [022d](../tips/TIP-022d-zalo-proactive-cap.md) | W8 | chờ | `tip/022d-zalo-proactive-cap` | | |
| 76 | [031b](../tips/TIP-031b-commerce-bulk.md) | W8 | chờ | `tip/031b-commerce-bulk` | | |
| 77 | [031c](../tips/TIP-031c-stock-master.md) | W8 | chờ | `tip/031c-stock-master` | | |
| 78 | [033d](../tips/TIP-033d-order-deposit.md) | W8 | chờ | `tip/033d-order-deposit` | | |
| 79 | [035b](../tips/TIP-035b-task-sparkline.md) | W8 | chờ | `tip/035b-task-sparkline` | | |
| 80 | [035c](../tips/TIP-035c-test-ops-hygiene.md) | W8 | chờ | `tip/035c-test-ops-hygiene` | | |
| 81 | [044](../tips/TIP-044-ai-eval-gate.md) | W9 | chờ | `tip/044-ai-eval-gate` | | |
| 82 | [045](../tips/TIP-045-native-infrastructure.md) | W9 | chờ | `tip/045-native-infrastructure` | | |
| 83 | [046](../tips/TIP-046-release-hardening.md) | W9 | chờ | `tip/046-release-hardening` | | |
