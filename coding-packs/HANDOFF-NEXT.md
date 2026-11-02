# HANDOFF — làm tiếp AppChat (2026-11-01)

> Đọc file này đầu phiên mới, sau quy tắc dự án (`CLAUDE.md` — Codex đọc qua `AGENTS.md`). Ghi trạng thái lúc dừng + việc kế tiếp + câu giao việc dán nguyên văn. Dùng được với mọi công cụ (Codex, Claude Code…).

## Tiếp tục câu A — checkpoint 2026-11-02 (chưa xong)

- **Checkpoint scope mới nhất:** thêm `TIP-042c-record-scope.md` (69 file, 8 AC), gán COM-8b-2; gateQ-029 đang hỏi semantics team nhiều nhóm. Rà thấy helper detail cho owner qua trước none và writable inbox dùng read guard; hạ2 dòng ĐẠT quá rộng. Field-level giữ045b. Sổ **1.462 dòng/217 lỗ hổng**; xem `reports/scope-planning-audit-2026-11-02.md`. Chưa code/chưa independent review.

- **Checkpoint routing mới nhất:** đã viết `TIP-042b-lead-routing.md` (44 file, 8 AC), kiểm luồng inbound/contact owner, ghi DC-238 opt-in và định nghĩa tải/lead mới. 042c vẫn chưa có file. REQ-B11d còn SLA nên chưa gán/đánh đạt cả dòng. Sổ vẫn 1.460 dòng/218 lỗ hổng; chưa code, chưa rà độc lập. Xem `reports/routing-planning-audit-2026-11-02.md`.

- **Checkpoint authz mới nhất:** thêm `TIP-042-custom-roles-teams.md` (62 file, 9 AC; chưa ready-to-build vì Q-028). Tách 042b routing và042c scope/serializer vào graph nhưng **chưa viết file**. Hạ hai bằng chứng ĐẠT chưa đủ; sửa Nhóm P1 không còn NGOÀI. Sổ **1.460 dòng, 218 lỗ hổng**; xem `reports/authz-planning-audit-2026-11-02.md`. 042 tích hợp sau045b (consistency hai DB), không dùng số TIP làm thứ tự. Chưa rà độc lập, chưa code.

- **Checkpoint KB mới nhất:** có `TIP-020b-kb-source-management.md` và `TIP-043-kb-conversation-learning.md`; năm nghĩa vụ đã có TIP cụ thể nhận, còn **218 lỗ hổng / 1.459 dòng**. Xem `reports/kb-planning-audit-2026-11-02.md`. Privacy vẫn chưa có TIP; đã dành riêng tên contact.forget, xoá fact 015b dùng contact.memory_forget. Chưa rà độc lập, chưa bắt đầu code.

- **Checkpoint mới nhất:** đã viết `tips/TIP-036-loyalty.md` (63 file manifest, 10 AC), có gate Q-027 đang hỏi Chủ nhà; chưa rà độc lập. Xem `reports/tip-036-planning-audit-2026-11-02.md`. Sổ hiện 1.459 dòng, 223 lỗ hổng; tiếp theo viết 037–046 và TIP bổ sung, đồng thời rà các phần chưa hết.

- Đã bắt đầu rà nốt phần deferred, ghi bằng chứng tại `reports/coverage-deferred-audit-2026-11-02.md`.
- Hai dòng ĐẠT thiếu chứng cứ HTTP/DB đã hạ thành MỘT PHẦN; connector Brevo/SMTP workspace không được coi chỉ thiếu tài khoản. Sổ hiện **223 lỗ hổng** (tăng 3 vì rà chính xác hơn, không phải code bị sửa).
- Unit integrations **22/22**, channels **27/27** xanh; không thay nghiệm thu provider thật. Chỉ sửa Markdown và sinh lại COVERAGE, chưa sửa code/TIP đã DONE.
- Câu A vẫn còn: rà các phần chưa hết, viết/gán đủ TIP, rà file-overlap, rà độc lập. Chi tiết tiếp nối trong report trên; không bắt đầu câu B.
- Windows: chạy `python -X utf8 tools/obligations/merge.py` để tránh lỗi console cp1252 khi in tổng tiếng Việt (không cần sửa script).

## 1. Trạng thái lúc dừng (`dev` = commit chứa file này)

- **Code:** TIP-001 → 035 xong, đã merge `dev` (PR #50 là 035). Sau đó có 2 sửa nhỏ cho demo với model thật, push thẳng `dev` (Chủ nhà cho phép): `bf0bd58` (`contact.search`, mã hiển thị → id, lỗi validation kèm khuôn, động từ tiếng Việt cho `find_actions`), `e7781c9` (prompt Trợ lý v3: tự tra bản ghi trước khi hỏi lại).
- **Phát hiện khi chạy 9router thật:** Trợ lý chỉ làm được ca model giả viết sẵn; task graph 28/10 không theo kịp quyết định sau đó (Generative UI D55, `contact_memory`, phần code của standards ops, luật COMMERCE còn hở, nút FE giả).
- **Tài liệu đã viết (push `dev`):**
  - TIP bổ sung có file: `tips/TIP-023b` (Trợ lý phủ đủ action), `023c` (Generative UI + Trợ lý theo màn + kết nối qua Trợ lý), `032b` (commerce vá luật), `030b` (hợp đồng từ file), `015b` (trí nhớ khách AI), `045b` (bảo mật & vận hành trong app). Đã xếp vào `02-TASK-GRAPH.md`.
  - Mở rộng phạm vi dòng task graph của 036, 038, 039, 044, 046.
  - Sổ: DC-224 … DC-233, Q-023 … Q-026; đóng Q-005 (→ 023c), Q-022 (→ 030b).
  - **`COVERAGE.md` bản nháp 1** — 1.458 nghĩa vụ đối chiếu code: ĐẠT 573 · MỘT PHẦN 314 · GIẢ 118 · CHỜ-TK 43 · CHƯA 309 · NGOÀI 35 · QUY-TẮC 66 · **220 lỗ hổng chưa TIP nhận**. Lượt rà dừng sớm (hết quota) — mục "Ghi chú / chưa rà hết" cuối mỗi phần.
  - Công cụ dựng sổ: `tools/obligations/` (README ở đó).
- **Goal "viết đủ TIP" (DC-233, đảo D57) dừng sau bước 1** theo lệnh Chủ nhà. Bước 2, 3 chưa làm (Q-026).

## 2. Việc kế tiếp (theo thứ tự)

1. **Viết đủ TIP** — dán câu giao việc A (mục 4). Làm tiếp từ sổ đã có, **không dựng lại từ đầu**:
   - Rà nốt mục "chưa rà hết" của 7 phần (`tools/obligations/parts/`).
   - Gom 220 lỗ hổng vào TIP: mở rộng TIP chờ phù hợp, hoặc TIP bổ sung mới `0XXb` (xếp vào `02-TASK-GRAPH.md`) + đoạn "Bổ sung" trỏ sang TIP mới ở `reports/TIP-0XX-completion.md`. Một số cụm đã thấy: nút FE giả ở báo giá / đơn / hợp đồng (AI từng dòng, tab tệp, chuyển tiếp hàng loạt), Hộp thư (nhóm Zalo, 360° sửa / CSV, chụp màn hình, dịch tự động), Cài đặt (nhật ký hoạt động / AI audit, bảo mật, tài khoản nhận tiền, đặt lịch), Trợ lý (đính kèm, micro, lịch sử phiên); SePay / Casso của DN đang nối adapter giả (thiếu code, không phải thiếu tài khoản); người theo dõi khách không thấy chứng từ của khách; agent tự chuyển chủ khách không qua duyệt; worker `ROLE=ai` không nạp module sales / booking / support / contracts (duyệt xong chạy 501); `/booking/slots` sai route (API là `/calendar/slots`); xoá dữ liệu khách theo yêu cầu (`privacy.erase`); WCAG; OpenAPI `/v1/docs`; `if_version` cho contact / contract / order; `useAction` nuốt 202 `approval_required`.
   - Rà + sửa 6 TIP đã có file; viết file đủ phần cho 036–046 (khuôn: HEADER có "Dòng COVERAGE nhận", CONTEXT có hiện trạng code thật, mục **"Rà trước khi làm"**, TASK, ACCEPTANCE CRITERIA đo được — lệnh test + ca 9router thật cho phần AI, CONSTRAINTS).
   - Một lượt rà độc lập COVERAGE ↔ code ↔ TIP. Commit + push thẳng `dev` (chỉ tài liệu).
2. **Code tiếp** — sau khi TIP đủ, dán câu giao việc B: bắt đầu **TIP-023b**, rồi 023c ∥ 032b ∥ 030b ∥ 015b → 036 … 043 → 045b → 044 ∥ 045 → 046.

## 3. Lưu ý vận hành

- **Chi phí:** lượt dựng sổ vừa rồi tốn ~2,1 triệu token (7 lượt rà song song, mỗi lượt ~250–370k). Chia việc theo phần, mỗi phần ghi file dần; dừng giữa chừng vẫn giữ được phần đã rà.
- **Ghi file dần:** lần trước 2 lượt rà chết vì lỗi API, mất trắng phần đã rà vì chỉ ghi file ở cuối.
- **Môi trường demo local** (`.data/local/`, gitignore): `run.sh api|jobs|ai|channels|web`, tài khoản demo `demo@appchat.local`, Zalo thật đã đăng nhập, LLM 9router (`cc/claude-haiku-4-5-20251001`, chưa có model embedding — RAG ingest lỗi), Brevo chờ whitelist IP. Chạy integration test phải tắt worker dev trước (chung Redis).
- **Git:** tài liệu được push thẳng `dev`. Code: nhánh `tip/XXX-*` từ `origin/dev` → PR vào `dev` (`gh pr create --base dev`; kiểm `gh auth status` trước). Không PR vào `main`, không đề cập `dev → main`.
- **Không đổi** luật trong `plans/COMMERCE-DECISIONS.md` và quyền đã chốt.

## 4. Câu giao việc (dán nguyên văn làm yêu cầu đầu phiên — Claude Code: sau `/goal`; Codex: dán làm prompt)

**A — viết đủ TIP (làm trước):**

```
Viết đủ TIP cho phần còn lại của AppChat, chưa code — làm tiếp từ coding-packs/HANDOFF-NEXT.md. Bước 1 (đã có bản nháp): hoàn thiện sổ phủ coding-packs/COVERAGE.md bằng tools/obligations (sửa tools/obligations/parts/part-*.md rồi chạy merge.py, không sửa tay COVERAGE.md) — rà nốt mục "chưa rà hết" của 7 phần; nghĩa vụ của TIP đã DONE phải kiểm bằng code (file:dòng) + test, không tin trạng thái DONE. Bước 2: KHÔNG sửa file TIP đã DONE (001–035); nghĩa vụ chúng chưa đạt → viết TIP bổ sung mới (dạng 0XXb, xếp vào 02-TASK-GRAPH) và ghi đoạn "Bổ sung" trỏ sang TIP mới vào reports/TIP-0XX-completion.md; gán TIP cho cả 220 lỗ hổng. Rà và sửa các TIP chưa làm đã có file (023b, 023c, 032b, 030b, 015b, 045b); viết file đầy đủ cho TIP chưa làm chưa có file (036–046) theo khuôn /vibecode:tip: dòng COVERAGE nhận, CONTEXT có hiện trạng code thật, mục "Rà trước khi làm", TASK, ACCEPTANCE CRITERIA đo được (lệnh test, ca 9router thật cho phần AI), CONSTRAINTS. Bước 3: một lượt rà độc lập COVERAGE ↔ code ↔ TIP. Rà theo từng phần, ghi file dần (lỗi giữa chừng không mất phần đã rà). Câu hỏi ghi QUESTIONS.md, quyết định DECISIONS.md. Xong khi mọi dòng COVERAGE có TIP nhận (hoặc loại khỏi phạm vi có mã D / DC), mọi TIP chưa làm có file đủ phần, lượt rà độc lập không còn lỗ hổng; commit và push thẳng dev (chỉ tài liệu).
```

**B — code (sau khi A xong):**

```
Làm xong backend AppChat theo coding-packs/goals/GOAL-BACKEND.md: lần lượt các TIP chưa làm trong 02-TASK-GRAPH.md bắt đầu từ TIP-023b (TIP đã viết sẵn — DC-233: rà lại CONTEXT với code trước khi làm, lệch thì sửa TIP trước), test theo 3 cổng D59 (khi làm · trước commit · chốt TIP), phần AI nghiệm thu thêm với 9router thật (`pnpm ai:live`), chốt TIP cập nhật COVERAGE.md (sửa tools/obligations/parts rồi merge.py) kèm bằng chứng; việc phải hoãn gán ngay TIP hoặc Q; mỗi TIP một nhánh + commit + PR vào dev; câu hỏi mở ghi QUESTIONS.md, lệch spec ghi DEVIATIONS.md, quyết định theo đề xuất ghi DECISIONS.md. Xong khi mọi dòng COVERAGE là ĐẠT / CHỜ-TK / NGOÀI / QUY-TẮC và TIP-046 DONE.
```
