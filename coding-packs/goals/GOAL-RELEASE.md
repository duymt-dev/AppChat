# GOAL — Phát hành AppChat (108 TIP → cổng phát hành TIP-046)

> Thay `goals/GOAL-BACKEND.md` từ 2026-11-03 (file cũ giữ làm lịch sử TIP 001–035). Nguồn duy nhất cho thứ tự và tiến độ phần còn lại.

## Goal (1 câu)

Làm tuần tự **108 TIP chưa DONE** (83 + TIP-006d web push DC-381 + TIP-026c / TIP-032e Cơ hội · Tài chính D60 + TIP-047 / 047b / 047c / 047d Gọi điện D61 + TIP-035d cô lập worktree + TIP-048 → 048h kênh Zalo OA / Facebook / Instagram / TikTok, bình luận, livestream D62 + TIP-049 → 049d đồng bộ sàn Shopee / TikTok Shop D63 + TIP-050 rà quyền agent DC-923 + TIP-051 → 051d phòng ban / sơ đồ tổ chức / loại liên hệ / agent là thành viên D64) theo bảng thứ tự dưới (TIP-023b → … → TIP-046) cho tới khi **TIP-046 (cổng phát hành) đạt**: backend + FE chạy thật ở `NEXT_PUBLIC_API_MODE=http`, mọi dòng `COVERAGE.md` ĐẠT hoặc NGOÀI / QUY-TẮC có mã, hạ tầng native sẵn sàng deploy.

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
| **Trước mỗi commit code** | `pnpm turbo run lint typecheck test --filter=<package đổi>` · `pnpm depcheck` · `pnpm lint:size` · `pnpm lint:tokens` · `pnpm lint:masks` · `pnpm i18n:check` · nếu đổi `package.json` / import npm mới ở core / api / worker: build api + worker rồi `pnpm check:bundle` (DC-359) | package không đổi |
| **Chốt TIP** (một lần, ở pha cuối, trước report) | `pnpm turbo run lint typecheck test build --filter=...[<nhánh nền>]` (package đổi + package phụ thuộc nó) · integration **chỉ** `apps/api/test/integration/<domain>*.test.ts` của domain TIP chạm + `apps/api/test/integration/actions/<action id>.action.test.ts` của action TIP thêm / sửa (+ `apps/worker/test/integration/*` liên quan nếu TIP sửa worker) · `pnpm depcheck` · `lint:size` · `lint:tokens` · `lint:masks` · `i18n:check` · E2E **chỉ spec module TIP** ở `mock` (`pnpm e2e <module>`) và `http` (`pnpm e2e:http <spec>`) · `pnpm parity <id>` màn TIP sửa | `pnpm test:integration` toàn bộ · `pnpm e2e` toàn bộ · `parity --done` (trừ khi sửa lớp dùng chung) |

- **Sửa lớp dùng chung** (kernel, `packages/{db,actions,shared,ui}`, `apps/web/src/shared`) → thêm E2E mock các module dùng phần đó + `pnpm parity --done`; sửa kernel action / executor → thêm integration `actions/*` của kernel. Vẫn không chạy full integration / full E2E.
- **TIP nhiều pha:** mỗi pha qua cổng commit; cổng chốt chạy một lần ở pha cuối. **Sau rebase** chỉ chạy lại phần bị ảnh hưởng.
- **DB test (DC-358):** integration / E2E http / ai:live chạy trên `appchat_platform_test`, không ghi DB demo. Đầu cổng chốt mỗi TIP: `pnpm --filter @appchat/db db:test-reset` (dọn workspace test, giữ `max_connections` còn chỗ).
- **Sau merge có migration tenant (DC-359):** `pnpm --filter @appchat/db db:migrate-tenants` (demo / dev) · `--test` (DB test) — thay áp tay từng DB; build lại api + worker cho demo.
- **Parity (DC-360):** không chặn TIP DONE. Màn trong `tools/parity/parity-debt.json` chỉ cần ≤ trần ghi sổ (`DEBT`); màn ngoài sổ / màn TIP làm vẫn ≤ 5%. Không thêm màn vào sổ, không nâng trần (`pnpm lint:parity-debt`). Trả hết ở pha **trả nợ parity** trước TIP-046 (046 yêu cầu sổ rỗng).
- **Ca đỏ có sẵn:** ca trong phạm vi TIP nhưng đã đỏ trên `origin/dev`, hoặc lỗi môi trường đã ghi sổ (Q-042 phiên Zalo giả, Q-010 E2E chập chờn) → chạy riêng chứng minh, ghi tên + bằng chứng vào report (và `QUESTIONS.md` nếu mới); không tính là cổng đỏ, không skip test.
- **TIP-046 (cổng phát hành)** là nơi duy nhất chạy full: `pnpm test:integration` toàn bộ · `pnpm e2e` toàn bộ · `pnpm e2e:http` toàn bộ · `pnpm parity --done`.

## Định nghĩa ĐẠT

**Mỗi TIP:** mọi AC có test chạy thật và xanh · mọi action của TIP có handler · shape đọc đúng contract FE, contract test xanh · tenant + role isolation có test khi chạm dữ liệu có chủ · cổng "chốt TIP" xanh · commit + SHA + PR + Completion Report + COVERAGE + ba sổ cập nhật.

**Cả goal:** 108 TIP DONE (hoặc PARTIAL **chỉ** vì ô cần tài nguyên ngoài, ghi "chưa nghiệm thu với provider thật") · `node tools/release/gate.mjs --sha <sha>` (TIP-046) không còn ô đỏ ngoài ô `unknown-resource` · `COVERAGE.md` không còn dòng CHƯA / GIẢ / MỘT PHẦN trừ dòng chờ tài nguyên ngoài.

## Tài nguyên ngoài (không chặn thi công, chặn nghiệm thu / bán)

| Tài nguyên | TIP | Khi chưa có | Trạng thái (2026-11-03) |
|------------|-----|-------------|--------------------------|
| LLM chat qua 9router | 019b, 022b/c, 023b–g, 044 | mock model | **Có** — `LLM_SEED_*` trong `.env`, đã kiểm `/models` 200 + chat 200 (Q-001) |
| Embedding OpenAI 1536 chiều | 020e, 044 | embedding giả | Key + credit có — kiểm 2026-11-05: 200, 1536 chiều (Q-002 đóng, DC-305); seed provider ở 020e |
| Zalo cá nhân thật | 014b, 014c, 022d, 044 | fake transport | Tới bước nghiệm thu thì nhắn Chủ nhà quét QR (Q-003) |
| SePay (thu tiền gói) | 012b, 039 | adapter `mock` | Hoãn (Q-004) — production cấm `mock` |
| Brevo + domain gửi mail | 004c, 012c | adapter `console` | Chưa có (Q-004) — production cấm `console` |
| VPS + domain | 045, 046 | `infra/` viết đủ + `pnpm infra:check`, script mặc định `plan` | Hoãn; viết infra trước (Q-006, DC-304) |
| Máy Linux IP tĩnh cho LiveKit + SIP edge + Voice AI | 047, 047c, 047d | `livekit-server --dev` trên máy dev, port voice `mock` | Chung VPS-APP khi mua VPS (Q-903 → DC-907 f), tách bằng env khi tải lớn; chờ VPS (Q-006); `infra/livekit/*` viết trước, script mặc định `plan` |
| Zalo Cloud Connect (App AppChat được duyệt, OA Doanh nghiệp xác thực) | 047, 047c | `ZccClient` mock | Chủ nhà đăng ký App "AppChat" + xin quyền gọi thoại, OA thử của công ty, `ZCC_BILLING=oa` (Q-902 → DC-907 e); chờ App được duyệt |
| SIP trunk / hotline thử | 047c | trunk giả lập SIPp | Thuê 1 số SIP REGISTER gói rẻ nhất (Q-904 → DC-907 g); hộp SIM không mua, form hiện "Sắp có" (Q-906 → DC-907 h) |
| Meta (Facebook Page / Instagram): Business Verification + App Review + domain HTTPS | 048e, 048f, 048g | Transport `fake` + fixtures webhook | Chủ nhà nộp ngay (Q-908); domain HTTPS cần sớm hơn VPS (Q-006) |
| App Zalo quyền OA API + OA thử gói Tăng trưởng | 048, 048d | Transport `fake` | Dùng chung App Zalo với ZCC (DC-909); Chủ nhà xin quyền OA API (Q-909) |
| TikTok Business Messaging API + Accounts API | 048h | Transport `fake` | Chủ nhà nộp form (Q-910) |
| Shopee Open Platform: ISV + app ERP + shop thật | 049b | Server giả + fixtures | Chủ nhà nộp ngay (Q-914): pháp nhân, domain HTTPS TLS ≥ 1.2, khai IP |
| TikTok Shop Partner Center (VN): app ISV + shop thật | 049c | Server giả + fixtures | Chủ nhà nộp ngay (Q-915); thẩm định ~4–6 tuần |
| Memurai cài sẵn (chạy nhiều tiến trình cổng riêng) | 035d | Worktree dùng chung Redis của checkout chính (không song song) | Có sẵn trên máy dev (Q-913) |
| Voice AI | 047, 047c, 044 | `VOICE_AI_ENGINE=mock` | **Tự dựng** (Q-905 → DC-907 a–d): PhoWhisper + VieNeu-TTS chạy local, không cần key; Realtime tuỳ chọn khi có key. Còn đo độ trễ / số phiên ở TIP-047 |

## Checklist bán được (ngoài code — Chủ nhà)

- [ ] VPS + domain + DNS; chạy `infra/scripts/provision-app.sh --apply` theo `infra/README.md`.
- [ ] SePay + tài khoản nhận tiền thật; Brevo + domain gửi đã xác minh.
- [ ] Nạp credit OpenAI (embedding); 9router đủ quota cho tải thật.
- [ ] Quét QR Zalo cho tài khoản nghiệm thu.
- [ ] Kênh D62: Meta Business Verification + App Review (Q-908) · App Zalo quyền OA API + OA thử (Q-909) · TikTok Business Messaging (Q-910) · domain HTTPS cho webhook.
- [ ] Sàn D63: Shopee Open Platform ISV (Q-914) · TikTok Shop Partner Center (Q-915).
- [ ] Pháp lý: Điều khoản dịch vụ, Chính sách bảo mật (Nghị định 13/2023), xuất hoá đơn GTGT tiền gói — Chủ nhà xác nhận làm trong app hay ngoài (chưa có TIP).
- [ ] Gate TIP-046 đạt trên SHA phát hành; Chủ nhà tự merge `dev → main`.

## Thứ tự và tiến độ

Sinh bằng `python -X utf8 tools/obligations/order.py --table`: sắp topo theo khai `integrate A before B` (máy kiểm hai phía) + dòng "Depends on" của từng TIP; khi hai nguồn mâu thuẫn, khai hai phía thắng. Thêm / đổi phụ thuộc → chạy lại công cụ, giữ cột trạng thái đã điền. TIP 001–035 đã DONE — xem `goals/GOAL-BACKEND.md`.

**Ba luồng song song (D62 #7, DC-908):** làm **035d trước tiên** (cô lập worktree: DB / cổng / Memurai / slot Postgres riêng). Sau đó tối đa 3 worktree: **A** = TIP cũ theo bảng · **B** = Gọi điện 047 → 047b → 047c → 047d · **C** = Kênh 048 → 048b → … → 048h → Sàn 049 → 049b → 049c → 049d (D63; 049 dùng kho token của 048). Bảng dưới vẫn là thứ tự **ghép** (PR vào `dev`): 048 nằm giữa 047b và 047c (một kho token cho ZCC + kênh Zalo OA — DC-909) — luồng C bắt đầu 048 khi 047b đã ghép, hoặc luồng B làm luôn 048. Mỗi luồng một dải số sổ riêng (B: 8xx, C: 7xx, tài liệu: 9xx) để không trùng mã DC / Q / DV / PD.

Trạng thái: `chờ` · `đang làm` · `DONE` · `PARTIAL` (chỉ vì tài nguyên ngoài) · `BLOCKED`.

| # | TIP | Wave | Trạng thái | Nhánh | SHA | PR |
|---|-----|------|-----------|-------|-----|----|
| 1 | [023b](../tips/TIP-023b-assistant-coverage.md) | W8 | DONE | `tip/023b-assistant-coverage` | `d373fea` | [#51](https://github.com/duymt-dev/AppChat/pull/51) |
| 2 | [023c](../tips/TIP-023c-generative-ui.md) | W8 | DONE | `tip/023c-generative-ui` · `tip/023c-g2-screen-assistant` · `tip/023c-g3-connect-via-assistant` · `tip/023c-close` | `2dd87b0` (G1) · `b9222ed` (G2) · `bac0f02` (G3) · `2d72765` (chốt) | [#52](https://github.com/duymt-dev/AppChat/pull/52) (G1, xếp chồng #51) · [#53](https://github.com/duymt-dev/AppChat/pull/53) (G2) · [#54](https://github.com/duymt-dev/AppChat/pull/54) (G3) · [#55](https://github.com/duymt-dev/AppChat/pull/55) (chốt, xếp chồng #54) |
| 3 | [030b](../tips/TIP-030b-contract-files.md) | W8 | DONE | `tip/030b-contract-files` · `tip/030b-f2-ai-draft` · `tip/030b-f3-appendix` | `6181c85` (F1) · `9467d52` (F2) · `7fe3775` (F3 + chốt) | [#56](https://github.com/duymt-dev/AppChat/pull/56) (F1, xếp chồng #55) · [#57](https://github.com/duymt-dev/AppChat/pull/57) (F2, xếp chồng #56) · [#58](https://github.com/duymt-dev/AppChat/pull/58) (F3, xếp chồng #57) |
| 4 | [032b](../tips/TIP-032b-commerce-gaps.md) | W8 | DONE | `tip/032b-commerce-gaps` · `tip/032b-p2-delivery` · `tip/032b-p3-packages` · `tip/032b-p4-catalog` | `642f3e6` (P1) · `c9f4c2a` (P2) · `0bb99d8` (P3) · `730b5f3` (P4) · `54d4fa4` (chốt) | [#59](https://github.com/duymt-dev/AppChat/pull/59) · [#60](https://github.com/duymt-dev/AppChat/pull/60) · [#61](https://github.com/duymt-dev/AppChat/pull/61) · [#62](https://github.com/duymt-dev/AppChat/pull/62) |
| 5 | [015b](../tips/TIP-015b-contact-memory.md) | W8 | DONE | `tip/015b-contact-memory` · `tip/015b-p2-insights` · `tip/015b-p3-ui` | `b470043` (P1) · `bbb6707` (P2) · `83b3727` (P3 + chốt) | [#63](https://github.com/duymt-dev/AppChat/pull/63) (P1, xếp chồng #62) · [#64](https://github.com/duymt-dev/AppChat/pull/64) (P2, xếp chồng #63) · [#65](https://github.com/duymt-dev/AppChat/pull/65) (P3 + chốt, xếp chồng #64) |
| 6 | [036](../tips/TIP-036-loyalty.md) | W8 | DONE | `tip/036-loyalty` · `tip/036-p2-ledger-events` · `tip/036-p3-ui` · `tip/036-close` | `11edcd6` (P1) · `d60f6fe` (P2) · `53f1d5a` (P3) · `927b79b` (chốt) | [#66](https://github.com/duymt-dev/AppChat/pull/66) (P1, xếp chồng #65) · [#67](https://github.com/duymt-dev/AppChat/pull/67) (P2) · [#68](https://github.com/duymt-dev/AppChat/pull/68) (P3) · [#69](https://github.com/duymt-dev/AppChat/pull/69) (chốt, xếp chồng #68) |
| 7 | [020b](../tips/TIP-020b-kb-source-management.md) | W8 | DONE | `tip/020b-kb-source-management` | `3746c3da` | [#70](https://github.com/duymt-dev/AppChat/pull/70) (xếp chồng #69) |
| 8 | [043](../tips/TIP-043-kb-conversation-learning.md) | W8 | DONE | `tip/043-kb-conversation-learning` · `tip/043-p2-proposer` · `tip/043-p3-review-ui` | `5e568e3` (P1) · `d1f005d` (P2) · `98099cf` (P3 + chốt) | [#71](https://github.com/duymt-dev/AppChat/pull/71) (P1, xếp chồng #70) · [#72](https://github.com/duymt-dev/AppChat/pull/72) (P2, xếp chồng #71) · [#73](https://github.com/duymt-dev/AppChat/pull/73) (P3 + chốt, xếp chồng #72) |
| 9 | [045b](../tips/TIP-045b-app-hardening.md) | W8 | DONE | `tip/045b-app-hardening` · `tip/045b-pa-consistency` · `tip/045b-pc-fields` · `tip/045b-pd-jobs` · `tip/045b-pd2-data-jobs` · `tip/045b-pe-reconcile` · `tip/045b-close` | `33aa93fd` (P1) · `7df240d1` (A) · `e29293e8` (C) · `5f19fb42` (D1) · `44585096` (D2) · `2286e351` (E) · `bcc12771` (chốt) | #74 · #75 · #76 · #77 · #78 (đã merge) · [#84](https://github.com/duymt-dev/AppChat/pull/84) (E) · [#85](https://github.com/duymt-dev/AppChat/pull/85) (chốt, xếp chồng #84) |
| 10 | [003d](../tips/TIP-003d-openapi.md) | W8 | DONE | `tip/003d-openapi` | `3faa45ec` | [#86](https://github.com/duymt-dev/AppChat/pull/86) (xếp chồng #85) |
| 11 | [014b](../tips/TIP-014b-zalo-lifecycle.md) | W8 | PARTIAL — chỉ AC8 Zalo thật (Q-003, chưa nghiệm thu với provider thật) | `tip/014b-zalo-lifecycle` | `4d139ea0` | [#87](https://github.com/duymt-dev/AppChat/pull/87) (xếp chồng #86) |
| 12 | [042](../tips/TIP-042-custom-roles-teams.md) | W8 | DONE | `tip/042-custom-roles-teams` | `f93b31eb` | #88 (xếp chồng #87) |
| 13 | [042b](../tips/TIP-042b-lead-routing.md) | W8 | DONE | `tip/042b-lead-routing` | `5e9acd3f` | #89 (xếp chồng #88) |
| 14 | [042c](../tips/TIP-042c-record-scope.md) | W8 | DONE | `tip/042c-record-scope` | `84f6086d` | #90 (xếp chồng #89) |
| 15 | [022b](../tips/TIP-022b-agent-channel-behavior.md) | W8 | DONE | `tip/022b-agent-channel-behavior` | `d3b0571e` | #91 (xếp chồng #90) |
| 16 | [037](../tips/TIP-037-marketing.md) | W8 | DONE | `tip/037-marketing` | `9100b2d7` | #92 (xếp chồng #91) |
| 17 | [038](../tips/TIP-038-insights-dashboard.md) | W8 | DONE (pha 4/4 — AC01–10; DC-363…366; Brevo thật CHỜ-TK Q-004) | `tip/038-insights-dashboard` · `tip/038-insights-dashboard-p2` · `tip/038-insights-exports` · `tip/038-insights-digest` | `28dcba68` · `9cc04319` · `f4f81050` · `c0d4e568` | #93 · #95 · #96 · #97 (đã merge) |
| 18 | [039](../tips/TIP-039-billing-lifecycle.md) | W8 | DONE (pha 3/3 — AC01–10; DC-367; SePay / Brevo thật chưa nghiệm thu — Q-004) | `tip/039-billing-lifecycle` · `tip/039-billing-alerts` · `tip/039-billing-ui` | `081f6bac` · `99a97695` · `53423a0a` · `f95182e4` · `873f1ee1` · `5465d60e` · `00776b5b` · `5afba3f8` · `4aa2f687` | #98 · #99 (xếp chồng #98) · #100 (xếp chồng #99) |
| 19 | [040](../tips/TIP-040-platform-admin.md) | W8 | DONE (6 pha — AC01–09; AC10 9router / OpenAI probe thật một phần; DC-368…373) | `tip/040-platform-admin` | `41c48d6a` · `b8750d28` · `a05230f2` · `d05dc3b7` · `3a94320b` · `0d84b41b` | #101 (xếp chồng #100) |
| 20 | [038b](../tips/TIP-038b-ai-first-data-transfer.md) | W8 | **DONE** (pha 4/4 — nền tảng + khách hàng · chứng từ nháp + sản phẩm · Trợ lý + xuất · TransferPanel + E2E + ai:live 12/12; DC-374, DV-038…041, PD-023) | `tip/038b-ai-first-data-transfer` · `-p2` · `-p3` · `-p4` | `f8bc307b` · `cc46d0a3` · `704a8f2a` · `5db34a3a` | #102 (xếp chồng #101) · #103 · #104 · #105 |
| 21 | [041](../tips/TIP-041-workspace-lifecycle.md) | W8 | **DONE** (pha 3/3 — P1 lưu trữ / khôi phục DB tenant native; P2 hoạt động + quét 90 ngày + `workspace.open` khôi phục; P3 Owner danger zone: xoá + OTP step-up + sao lưu 30 ngày + tombstone + purge, yêu cầu đóng băng + panel admin, xuất logic; DC-375, DC-376, DV-042…044) | `tip/041-workspace-lifecycle` · `-p2` · `-p3` | `35f63c48` · `928bf8ea` · `6be621c0` | #106 · #107 · #108 |
| 22 | [025b](../tips/TIP-025b-inbox-vertical.md) | W8 | **DONE** (pha 7/7 — P1 hàng loạt + alias + đếm; P2 tìm có trang + cửa sổ; P3 nhóm Zalo; P4 ngữ cảnh CRM từ Hộp thư; P5 khung giờ thật + dịch hai chiều + chụp màn hình; P6 thẻ duyệt Hộp thư + ai:live 9/10; P7 bảng tin nhóm + chọn phụ trách kèm tải — DC-377, DC-378, DV-045…051) | `tip/025b-inbox-vertical` · `-p2` · `-p3` · `-p4` · `-p5` · `-p6` · `-p7` | `171b4f63` · `0cc8af3e` · `8cf8f401` · `6f9d362f` · `22e0bef6` · `183a900c` · `71086794` | #109 · #110 · #111 · #112 · #113 · #114 · #115 |
| 23 | [019b](../tips/TIP-019b-runtime-integrity.md) | W8 | **DONE** (4 pha — P1 ngân sách gốc + biên nhận + quyết toán hai DB (#116); P2 tiện ích / RAG chung gốc + embedding có đo + hết hạn duyệt báo Owner + ROLE=ai (#117); P3 trạng thái thật + `ai_run_event` + chi tiết run + WS + UI (#118); P4 ai:live `runtime-integrity` 12/12, an toàn 0 + `provider_cost` + làm mới khi nối lại WS (#119) — DC-379, DC-380, DV-052…054) | `tip/019b-runtime-integrity-p4` | `4bf168bf` · `282d371f` · `82ce2695` · `6655f4bc` | #116 · #117 · #118 · #119 |
| 24 | [012b](../tips/TIP-012b-bank-connectors.md) | W8 | **DONE** (pha 5/5 — AC01–10 phía code; DC-381…386; SePay / Casso thật CHỜ-TK Q-004) | `tip/012b-bank-connectors` | #122 (P1 `3ca4b922`), #123 (P2 `6217bc5c`), #124 (P3 `7eaa7fe5`), #125 (P4 `698a48ff`), #126 (P5 `0e75d4ba`) | P1 adapter thật SePay / Casso + chuẩn hoá chặt (DC-382); P2 ingress bền ACK → worker, biên nhận chuẩn tắc qua kết nối lại (DC-383); P3 runtime kết nối: biên nhận lệnh bền, thăm dò / kéo Casso, chi tiết + nhật ký + drawer (DC-384); P4 sự kiện → tác vụ AI bền + ai:live bank-vertical 7/8 (DC-385); chưa nghiệm thu provider thật; P5 hook generic hội tụ ingress tài chính, bank_feed.connect theo kết nối đã lưu, thăm dò nháp thật (DC-386) |
| 25 | [026b](../tips/TIP-026b-crm-activities.md) | W8 | **DONE** (4 pha — P1 server DC-387; P2 giao diện + Trợ lý DC-388; P3 Kanban + CAS DC-389; P4 nhập / xuất AI-first 3 tập + ai:live 10/10 DC-390) | `tip/026b-crm-activities` | #127 (P1 `d9fd5a59`), #128 (P2 `28cbe6f7`), #129 (P3 `e9763b72`), #130 (P4 `267bd9cf`) | P1 tenant `20261108040000_crm_activities`; P3 tenant `20261108050000_crm_board_layout_cas`; P4 tenant `20261108060000_transfer_dataset` |
| 26 | [015d](../tips/TIP-015d-contact-transfer.md) | W8 | **DONE** (P1 DC-391 · P2 DC-392 · P3 DC-393 · P4 DC-394; ai:live contact-transfer 8/8, an toàn 0) | `tip/015d-contact-transfer` | #131 (P1 `eee32cd7`), #132 (P2 `dfb5128e`), #133 (P3 `a30c3ddd`), #134 (P4 `acc4ffe6`) | P1 tenant `20261108070000_contact_transfer` |
| 27 | [032c](../tips/TIP-032c-commerce-edit-integrity.md) | W8 | **DONE** (pha 2/2 — P1 người tạo bất biến + người phụ trách + CAS + hoàn tác theo trường / tạo giữ lịch sử (#135, DC-395); P2 KPI theo người tạo + xuất XLSX đọc lại + thẻ Trợ lý chốt phiên bản + ai:live `commerce-edit-integrity` 8/8, an toàn 0 (#136, DC-396, DV-069…070)) | `tip/032c-attribution` · `-p2` | `7d59f52b` · `c769ab18` | #135 · #136 (xếp chồng #135) | P1 tenant `20261108080000_commerce_edit_integrity` |
| 28 | [015f](../tips/TIP-015f-contact-lifecycle.md) | W8 | **DONE** (pha 6/6 — P1 DC-397 · P2 DC-398 · P3 DC-399 · P4 DC-400 · P5 DC-401 · P6 DC-402; ai:live contact-lifecycle 7/8, an toàn 0) | `tip/015f-contact-lifecycle` · `-p2` … `-p6` | `4df7f0e2` · `b574ccb4` · `69237ab7` · `f43ba4ef` · `0704630f` · P6 xem PR | #137 · #138 · #139 · #140 · #141 · #142 |
| 29 | [015e](../tips/TIP-015e-contact-merge-integrity.md) | W8 | DONE | `tip/015e-contact-merge-p5` | report TIP-015e-completion.md | #143–#147 |
| 30 | [012c](../tips/TIP-012c-tenant-mail.md) | W8 | DONE | `tip/012c-tenant-mail` | P1–P6 xem PR | #148–#153 |
| 31 | [033b](../tips/TIP-033b-booking-operations.md) | W8 | DONE (P5 / 5) | `tip/033b-booking-operations` | #154, #155, #156, #157, #158 | |
| 32 | [019c](../tips/TIP-019c-ai-utilities.md) | W8 | **DONE** (pha 4/4 — P1 4 kỹ năng DC-419; P2 fence `utility_operation` DC-420; P3 UI UtilityMenu/Form/Result/Host DC-421; P4 ai:live `ai-utilities` 8/8, an toàn 0 — DV-093 áp dụng) | `tip/019c-ai-utilities-p3` · `tip/019c-ai-utilities-p4` | #159, #160, #161, #164 | |
| 33 | [015c](../tips/TIP-015c-contact-privacy.md) | W8 | **DONE** (P1–P4 đã merge dev trước đó — #162…168; P5 041 restore gate: kernel/privacy/restore-gate.ts đối chiếu journal nền tảng đã acknowledged với DB tenant vừa khôi phục, gọi trong runRestore() trước khi active, fail closed 503 thiếu revision/khoá) | `tip/015c-contact-privacy` … `-p4` (merged) · `tip/015c-p5-restore-gate` | xem PR | |
| 34 | [023d](../tips/TIP-023d-assistant-plans.md) | W8 | **DONE** (9 pha — §1 plan_propose/get/reusable + `plan` alias; §5.2 agent_choices; §2 execution-binding (claim bước một lần, biên nhận thật) + §2.5 lượt còn bước chờ "Làm bước kế tiếp" (plan_next); §3 dừng-sửa-tiếp (checkpoint giữa batch); §4 tái dùng (cấu trúc chung, bản nháp gắn lượt một lần); §5 agent đã chọn (ghim id + bản, một run con mỗi epoch); §6 UI (PlanCard / PlanEditor / ReusePlans / SelectedAgentPicker); ai:live assistant-plans 8/8 an toàn 0 — PR #171, #187…#192) | `tip/023d-p9-close` | `110303da` | #192 |
| 35 | [023e](../tips/TIP-023e-action-discovery.md) | W8 | **DONE** (12 pha — corpus/generation/prepare/build ROLE=ai; hybrid RRF lọc quyền trước; cache theo gốc; che câu hỏi; recall@8 thật 98%; ai:live 8/8×3 cx/gpt-6-sol; report `reports/TIP-023e-completion.md`) | `tip/023e-action-discovery` | `a5e27781` | #172 |
| 36 | [023f](../tips/TIP-023f-assistant-input.md) | W8 | DONE (5 pha) — P1 hợp đồng + schema + action + .eml (#173); P2 parser vị trí thật + sandbox tiến trình con (`dist/parser.cjs`, DC-425) + handler + worker ROLE=ai (#174); P3 buộc tệp vào lượt (hash id/revision/digest) + engine dựng nội dung trước mỗi lời gọi + lọc route vision (`params.vision`, DV-097, Q-064) (#175); P4 khay tệp đã chuẩn bị + chụp màn hình xem lại + đọc chính tả + mock + GET /assistant/input (#176); P5 công tắc vision route (DV-098) + E2E http + parity + ai:live 8/8 ×3 an toàn 0 + infra/parser + report | `tip/023f-p5-close` | `6d7cb0c6` | #173 · #174 · #175 · #176 · #177 |
| 37 | [003b](../tips/TIP-003b-event-protocol.md) | W8 | DONE (5 pha) — P1 envelope v2 + AGGREGATE_RULES + baseline 17 topic (DV-099) + schema + collector/seq; P2 relay claim fence + dispatch head + biên nhận 3 chế độ; P3 readiness theo manifest + start sau init + khôi phục dispatch; P4 cutover rào + privacy event v2; P5 đăng ký 36 chủ transaction + 019b; v2 chưa bật (DC-426) | `tip/003b-event-protocol` | `705c7885` | #178 |
| 38 | [003c](../tips/TIP-003c-system-actions.md) | W8 | DONE (12 pha) — P1 capability gắn nguồn trước prepare; P2 biên nhận trigger + sales; P3 booking + hợp đồng; P4 support; P5 kênh; P6 KB; P7 hết hạn duyệt; P8 nhập đơn sàn; P9 agent Hộp thư; P10 tiền nhiệm 036/038/039; P11–12 adapter v2 (6 consumer) + lead routing, quote-owner retired; DV-100, DC-427 | `tip/003c-system-actions` | `9f10a255` | #179 |
| 39 | [006b](../tips/TIP-006b-event-delivery.md) | W8 | DONE (4 pha) — P1 schema giao bền + fanout niêm phong `9565438f`; P2 occurrence tác vụ + ý định đẩy `ee66f409`; P3 giao thông báo (mail / realtime, thẩm quyền hiện tại) `ff1975ef`; P4 hợp đồng v2 4 consumer + nạp catalog bền + dedupe realtime + Quên khách `adb85106`; DV-101, DC-428 | `tip/006b-event-delivery` | `adb85106` | #180 |
| 40 | [030c](../tips/TIP-030c-parent-signing.md) | W8 | DONE (3 pha) — P1 trang ký công khai qua action riêng + OTP theo thế hệ + OTP Owner thành action giao bền `6aa489b8`; P2 biên nhận lần ký, render ngoài khoá, chốt đúng thế hệ `ecac8758`; P3 khôi phục ký, dọn ứng viên, quét OTP Owner, kiểm kê riêng tư `64493589`; DV-102, DC-429 | `tip/030c-parent-signing` | `64493589` | #181 |
| 41 | [015g](../tips/TIP-015g-crm-stage-hold.md) | W8 | DONE (1 pha) — khoá họ khách trước chứng từ + CAS version / mốc giữ timestamptz, set_stage no-op thật, hoàn tác có điều kiện µs, báo giá mở theo họ; ai:live 4/4 `f88a8c59`; DV-103, DC-430 | `tip/015g-crm-stage-hold` | `f88a8c59` | #182 |
| 42 | [021b](../tips/TIP-021b-agent-drafting.md) | W8 | DONE (1 pha) — discovery 023e trước sinh (∩ agentGrantable), sinh theo schema + protected, kiểm lại quyền + CAS công bố, nói thật nguồn; migration `20261111080000_agent_drafting_publication`; ai:live 6/6 `dbf87de9`; DV-104, DC-431 | `tip/021b-agent-drafting` | `a3b96776` | #183 |
| 43 | [023g](../tips/TIP-023g-record-ai-entrypoints.md) | W8 | DONE (1 pha) — 7 nút AI trên bản ghi gắn đúng bản ghi (record_intent đóng, server đọc lại bằng getter chuẩn theo quyền, 404 đồng nhất); đề xuất combo / chiến dịch chỉ đọc qua binding `record_proposal` (schema không tool, protected, giá danh mục, CAS); migration `20261111090000_record_proposal_publication`; ai:live 10/10 (30/30); DV-105, DC-432, PD-027 | `tip/023g-record-ai-entrypoints` | 81818950 | #184 |
| 44 | [020c](../tips/TIP-020c-kb-effective-scope.md) | W8 | DONE (1 pha) — binding tri thức `ai_run.knowledge` (Trợ lý / agent kênh / delegate / tác vụ / chat thử); một bộ giải restriction cho kb.search + ngữ cảnh kênh; phạm vi rỗng → 0 truy hồi; nguồn = phạm vi nhận ∩ phạm vi xuất bản hiện hành ∩ quyền nguồn theo module; provenance + resumeGate `knowledge_revoked`; nháp AI `ai_draft_ref` → message.send 409; migration `20261111100000_kb_effective_scope`; ai:live 10/10 (29/30); DV-106, DC-433 | `tip/020c-kb-effective-scope` | 7f7b827b | #185 |
| 45 | [020d](../tips/TIP-020d-rag-citations.md) | W8 | DONE (1 pha) — trích dẫn câu trả lời agent kênh đã kiểm: sổ bí danh theo run (model chỉ thấy S1…, không tên tệp), kiểm vị trí điểm mã + nguồn hiện hành cùng thế hệ, công bố CAS lease (gửi chỉ khi validated, khôi phục `ai.answer_citations` cục bộ), hỏng → chuyển người không nháp / thiếu nguồn → giữ nháp; chiếu nguồn theo quyền xem ở gợi ý / nháp / ô soạn (nháp gốc) / chi tiết run (`/assistant?run_id=`, nhật ký AI bấm dòng); migration `20261111110000_answer_citations`; ai:live 9/10 (27/30, an toàn 0) + chạy lại ca sửa chấm 3/3; DV-107, DC-434 | `tip/020d-rag-citations` | 79cb4a9f | #186 |
| 46 | [033c](../tips/TIP-033c-appointment-order-suggestions.md) | W8 | **DONE** (P1 action đọc gợi ý + xác nhận ràng giá / version — DC-441; P2 thẻ chung Lịch hẹn + Hộp thư — PD-028, DV-109; P3 khối GenUI `appointment_order` Trợ lý + ROLE=ai; P4 E2E http + ai:live 6/6) | `tip/033c-p4-close` | `bbeafb41` | #193, #194, #195, #196 |
| 47 | [032d](../tips/TIP-032d-commerce-record-files.md) | W8 | DONE (P1 backend liên kết + file_claim + staging kiểm cấu trúc cô lập — DC-442, DV-110; P2 tab Tệp thật — PD-029; P3 sao chép tệp Trợ lý có đồng ý — DC-443, DV-111; P4 E2E http + ai:live 8 ca (chưa nghiệm thu — Postgres dùng chung cạn slot, Q-066) + COVERAGE) | `tip/032d-p4-close` | `f660a5bd` | #197, #198, #199, #200 |
| 48 | [027b](../tips/TIP-027b-product-media-description.md) | W8 | DONE (ai:live chưa nghiệm thu — Q-066) | `tip/027b-product-media-description` · `tip/027b-p3-web` · `tip/027b-p4-close` | `733bfd75` (P1) · `9bcabcce` (P2) · `83016f9f` (P3) · `4ea2cdfd` (P4) | #201 (P1+P2) · #203 (P3) · #204 (P4) |
| 49 | [028b](../tips/TIP-028b-document-integrity.md) | W8 | DONE | `tip/028b-document-integrity` · `tip/028b-p2-doc-render` | `04cac52d` (P1) · `e0bb391c` (P2) | #205 (P1) · #207 (P2) |
| 50 | [034b](../tips/TIP-034b-support-categories.md) | W8 | DONE (ai:live chưa nghiệm thu — Q-066) | `tip/034b-support-categories` · `tip/034b-p2-category-transfer` · `tip/034b-p3-category-web` · `tip/034b-p4-close` | `ecac5353` (P1) · `6e2629f2` (P2) · `3b1f0c0e` (P3) · `3ed9fe7a` (P4) | #208 (P1) · #209 (P2) · #210 (P3) · #211 (P4) |
| 51 | [001b](../tips/TIP-001b-web-architecture.md) | W8 | DONE | `tip/001b-web-architecture` | `ab277e75` | #212 |
| 52 | [034c](../tips/TIP-034c-ticket-bulk.md) | W8 | DONE (ai:live chưa nghiệm thu — Q-066) | `tip/034c-ticket-bulk` · `tip/034c-p2-bulk-web` · `tip/034c-p3-bulk-evidence` | `d86d0fd2` (P1) · `d48dc026` (P2) · `b5a1184b` (P3) | #213 (P1) · #214 (P2) · #216 (P3) |
| 53 | [022c](../tips/TIP-022c-sales-behavior.md) | W8 | DONE | `tip/022c-sales-behavior` · `tip/022c-p2-operator-provenance` · `tip/022c-p3-stock-grounding` · `tip/022c-p4-publication` · `tip/022c-p5-templates-live` | `e4ab67ce` (P1) · `21f6091f` (P2) · `f86984a8` (P3) · `1a02ff8b` (P4) · `0af4609f` (P5) | #217 (P1) · #218 (P2) · #219 (P3) · #220 (P4) · #221 (P5) |
| 54 | [006c](../tips/TIP-006c-realtime-events.md) | W8 | DONE | `tip/006c-realtime-events` | `8c43594c` | #222 |
| 55 | [016b](../tips/TIP-016b-nav-badges.md) | W8 | DONE | `tip/016b-nav-badges` | `342d1a84` | #223 |
| 56 | [034d](../tips/TIP-034d-ticket-stock-trends.md) | W8 | DONE | `tip/034d-ticket-stock-trends` | `cc9c77ad` | #224 |
| 57 | [035d](../tips/TIP-035d-worktree-isolation.md) | W8 | DONE | `tip/035d-worktree-isolation` | `7bb0e547` | #228 |
| 58 | [020e](../tips/TIP-020e-rag-model-lifecycle.md) | W8 | DONE | `tip/020e-rag-model-lifecycle` | `bcc52d2e` | #226 |
| 59 | [003e](../tips/TIP-003e-action-integrity.md) | W8 | chờ | `tip/003e-action-integrity` | | |
| 60 | [001c](../tips/TIP-001c-ui-states-mobile.md) | W8 | chờ | `tip/001c-ui-states-mobile` | | |
| 61 | [003f](../tips/TIP-003f-validation-forms.md) | W8 | chờ | `tip/003f-validation-forms` | | |
| 62 | [003g](../tips/TIP-003g-time-query-hygiene.md) | W8 | DONE | `tip/003g-time-query-hygiene` | `81c518a9` (code `994a7a2f`) | #229 |
| 63 | [003h](../tips/TIP-003h-state-flows.md) | W8 | chờ | `tip/003h-state-flows` | | |
| 64 | [003i](../tips/TIP-003i-api-contract-gaps.md) | W8 | chờ | `tip/003i-api-contract-gaps` | | |
| 65 | [004b](../tips/TIP-004b-auth-security.md) | W8 | chờ | `tip/004b-auth-security` | | |
| 66 | [004c](../tips/TIP-004c-mail-provider-webhooks.md) | W8 | chờ | `tip/004c-mail-provider-webhooks` | | |
| 67 | [011b](../tips/TIP-011b-industry-taxonomy.md) | W8 | chờ | `tip/011b-industry-taxonomy` | | |
| 68 | [012d](../tips/TIP-012d-storage-connector.md) | W8 | chờ | `tip/012d-storage-connector` | | |
| 69 | [013b](../tips/TIP-013b-settings-workspace.md) | W8 | chờ | `tip/013b-settings-workspace` | | |
| 70 | [013c](../tips/TIP-013c-owner-availability.md) | W8 | chờ | `tip/013c-owner-availability` | | |
| 71 | [014c](../tips/TIP-014c-channel-consistency.md) | W8 | chờ | `tip/014c-channel-consistency` | | |
| 72 | [017b](../tips/TIP-017b-web-widget.md) | W8 | chờ | `tip/017b-web-widget` | | |
| 73 | [018b](../tips/TIP-018b-email-oauth.md) | W8 | chờ | `tip/018b-email-oauth` | | |
| 74 | [019d](../tips/TIP-019d-agent-authority.md) | W8 | chờ | `tip/019d-agent-authority` | | |
| 75 | [020f](../tips/TIP-020f-kb-parsers.md) | W8 | chờ | `tip/020f-kb-parsers` | | |
| 76 | [022d](../tips/TIP-022d-zalo-proactive-cap.md) | W8 | chờ | `tip/022d-zalo-proactive-cap` | | |
| 77 | [031b](../tips/TIP-031b-commerce-bulk.md) | W8 | chờ | `tip/031b-commerce-bulk` | | |
| 78 | [031c](../tips/TIP-031c-stock-master.md) | W8 | chờ | `tip/031c-stock-master` | | |
| 79 | [006d](../tips/TIP-006d-web-push.md) | W8 | chờ | `tip/006d-web-push` | | |
| 80 | [033d](../tips/TIP-033d-order-deposit.md) | W8 | chờ | `tip/033d-order-deposit` | | |
| 81 | [026c](../tips/TIP-026c-sales-pipeline.md) | W8 | chờ — D60 / DC-901 (Q-901, 2026-11-12) | `tip/026c-sales-pipeline` | | |
| 82 | [032e](../tips/TIP-032e-finance.md) | W8 | chờ — D60 / DC-902, ngay sau 026c | `tip/032e-finance` | | |
| 83 | [035b](../tips/TIP-035b-task-sparkline.md) | W8 | chờ | `tip/035b-task-sparkline` | | |
| 84 | [035c](../tips/TIP-035c-test-ops-hygiene.md) | W8 | chờ | `tip/035c-test-ops-hygiene` | | |
| 85 | [047](../tips/TIP-047-voice-infra.md) | W8 | chờ — D61 / DC-906 (Gọi điện, RRI 2026-11-13); làm song song worktree, ghép sau chuỗi PR hiện tại | `tip/047-voice-infra` | | |
| 86 | [047b](../tips/TIP-047b-callcenter-schema.md) | W8 | chờ — D61 / DC-903, sau 047 | `tip/047b-callcenter-schema` | | |
| 87 | [048](../tips/TIP-048-oauth-token-vault.md) | W8 | chờ — D62 / DC-909 (OAuth + kho token), sau 047b, trước 047c | `tip/048-oauth-token-vault` | | |
| 88 | [047c](../tips/TIP-047c-callcenter-backend.md) | W8 | chờ — D61 / DC-904, sau 047b + 048 (token OA qua kho chung — DC-909) | `tip/047c-callcenter-backend` | | |
| 89 | [047d](../tips/TIP-047d-callcenter-ui.md) | W8 | chờ — D61 / DC-905, sau 047c + 032e | `tip/047d-callcenter-ui` | | |
| 90 | [048b](../tips/TIP-048b-channel-webhooks.md) | W8 | chờ — D62 / DC-910, luồng C | `tip/048b-channel-webhooks` | | |
| 91 | [048c](../tips/TIP-048c-channel-connect-ui.md) | W8 | chờ — D62 / DC-911, luồng C | `tip/048c-channel-connect-ui` | | |
| 92 | [048d](../tips/TIP-048d-zalo-oa.md) | W8 | chờ — D62 / DC-912 (Zalo OA, Q-909) | `tip/048d-zalo-oa` | | |
| 93 | [048e](../tips/TIP-048e-meta-messaging.md) | W8 | chờ — D62 / DC-913 (Meta, Q-908) | `tip/048e-meta-messaging` | | |
| 94 | [048f](../tips/TIP-048f-social-comments.md) | W8 | chờ — D62 / DC-914 (bình luận) | `tip/048f-social-comments` | | |
| 95 | [048g](../tips/TIP-048g-livestream.md) | W8 | chờ — D62 / DC-915 (livestream) | `tip/048g-livestream` | | |
| 96 | [048h](../tips/TIP-048h-tiktok-messaging.md) | W8 | chờ — D62 / DC-916 (TikTok, Q-910) | `tip/048h-tiktok-messaging` | | |
| 97 | [049](../tips/TIP-049-marketplace-foundation.md) | W8 | chờ — D63 / DC-917 (nền sàn, Q-916), luồng C sau 048h | `tip/049-marketplace-foundation` | | |
| 98 | [049b](../tips/TIP-049b-shopee.md) | W8 | chờ — D63 / DC-918 (Shopee, Q-914) | `tip/049b-shopee` | | |
| 99 | [049c](../tips/TIP-049c-tiktok-shop.md) | W8 | chờ — D63 / DC-919 (TikTok Shop, Q-915) | `tip/049c-tiktok-shop` | | |
| 100 | [049d](../tips/TIP-049d-marketplace-ui.md) | W8 | chờ — D63 / DC-920 (giao diện sàn) | `tip/049d-marketplace-ui` | | |
| 101 | [050](../tips/TIP-050-agent-grantable-review.md) | W8 | chờ | `tip/050-agent-grantable-review` | | |
| 102 | [051](../tips/TIP-051-org-units.md) | W8 | chờ | `tip/051-org-units` | | |
| 103 | [051b](../tips/TIP-051b-unit-channels-roles.md) | W8 | chờ | `tip/051b-unit-channels-roles` | | |
| 104 | [051c](../tips/TIP-051c-contact-relation.md) | W8 | chờ | `tip/051c-contact-relation` | | |
| 105 | [051d](../tips/TIP-051d-agent-members.md) | W8 | chờ | `tip/051d-agent-members` | | |
| 106 | [044](../tips/TIP-044-ai-eval-gate.md) | W9 | chờ | `tip/044-ai-eval-gate` | | |
| 107 | [045](../tips/TIP-045-native-infrastructure.md) | W9 | chờ | `tip/045-native-infrastructure` | | |
| 107b | trả nợ parity (DC-360) | W9 | chờ | `fix/parity-debt-payoff` | | |
| 108 | [046](../tips/TIP-046-release-hardening.md) | W9 | chờ | `tip/046-release-hardening` | | |
