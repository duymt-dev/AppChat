### COMPLETION REPORT — TIP-037

**STATUS:** DONE. Nhánh `tip/037-marketing`, xếp chồng trên `tip/022b-agent-channel-behavior` (#91). AC 10/10, nhưng AC10 mới đạt phần mock / Zalo giả: Zalo / email thật **chưa nghiệm thu với provider thật** (Q-003 / Q-004). COVERAGE 44 dòng → ĐẠT (`COVERAGE.md`, 0 lỗ hổng), gồm:
- REQ-I01–I05, REQ-B04c;
- D08b, D35c, D52e, Q-030, DC-246, Q-013, DEF-014-2;
- STD-actions-registry-11d;
- ACT-segment.* / ACT-campaign.* (15 dòng);
- BP-4.4-marketing; phần campaigns của BP-4.1-d / STD-api-envelope-2b;
- STD-ops-obs-3.4;
- PRO-marketing-* (9 dòng);
- phần gửi hàng loạt BP-3.3b-h / REQ-D05b mà TIP-032b giao lại.

**COMMIT:** SHA cuối nhánh `tip/037-marketing` ghi ở bảng tiến độ `goals/GOAL-RELEASE.md`.

**MIGRATION:** tenant `20261102003700_marketing`. Sau merge chạy `pnpm --filter @appchat/db db:migrate-tenants`, rồi build lại api + worker:
- ROLE=jobs: scheduler chiến dịch + consumer `marketing.analyze` / attribution;
- ROLE=ai: job `campaign-analyze` (handler `campaign.store_analysis` qua `AiDomainHandlersModule`);
- ROLE=channels: gửi `cr_`.

**FILES CHANGED:** theo manifest TIP. Phần ngoài manifest ghi ở DV-029; lệch prototype ghi ở PD-021.

Commit theo thứ tự:
- `9100b2d7` — core marketing:
  - phân khúc AST đóng → SQL tham số hoá;
  - duyệt + snapshot người nhận + `content_hash`;
  - scheduler + `campaign.dispatch` nhận lô qua `ChannelSendQueue` (ref `cr_`, `reserveRecipient`);
  - trần chủ động 200 / ngày + jitter;
  - khoá 48 giờ `campaign_contact_touch`;
  - kết quả kênh / quy đổi 7 ngày (DC-240);
  - AI phân tích qua job ROLE=ai + `store_analysis`, soạn nội dung theo giọng;
  - nhập / xuất người nhận, gửi lại tạo nháp;
  - huỷ nhận tin bằng token ký.
- `16b88bca` — web:
  - DTO chung mock / HTTP (`packages/shared/src/api/marketing.ts`);
  - wizard theo id khách thật + nhập danh sách;
  - AI phân tích theo run;
  - chi tiết: xuất CSV / gửi lại;
  - trang `/campaign/unsubscribe`.
- `82e630d7` — unit core (luật chiến dịch, AST, trần chủ động, đường gửi `cr_`).
- `21b04ebb` — 4 bộ integration + helper `marketing-fixtures.ts`. Sửa kèm, đều do test phát hiện:
  - snapshot Zalo lấy `external_thread_id`;
  - dispatch kiểm người duyệt ở `prepare` (ngoài transaction);
  - scheduler `status IN` khớp partial index;
  - xuất CSV purpose `attachment`.
- `5f2e29c6` — E2E mock viết lại + E2E http; bảng gợi ý AI thêm cột Nhóm khách hàng + nhãn loại (PD-021); BLUEPRINT §3.4 / §4.4; DV-029.
- `a6d6c222` — worker ROLE=ai nạp `MarketingModule` (trước đó `campaign.store_analysis` NOT_IMPLEMENTED ở worker — lỗi do E2E http bắt).
- `96abdb9c`:
  - ma trận 25 action `actions/{campaign,segment}.*.action.test.ts` + `helpers/marketing-matrix.ts`;
  - `campaign.resend_unread` có hoàn tác (xoá mềm nháp gửi lại) — trước đó khai undo nhưng không có handler;
  - bỏ `037` khỏi `LATER_TIPS`.
- `93170d3e`:
  - ai:live suite `marketing` (seed `fixtures/ai-eval/marketing-seed.mjs`, judge `tools/ai-live/src/marketing-judge.ts`);
  - `normalizeFilter`: model đổi lẫn kiểu số / chuỗi trong bộ lọc → chuẩn hoá rồi mới kiểm AST; action người dùng vẫn kiểm chặt;
  - cập nhật COVERAGE.

**TEST RESULTS:** AC 10/10.

1. **AC1 Phân khúc / API** — **pass**.
   - Test `marketing.test.ts` AC1 (3) + ma trận `segment.*` (4 file).
   - Đạt: AST lồng đếm đúng; quá sâu / trường lạ → 422; hợp phân khúc ∪ chọn tay không đếm trùng; scope CRM người gọi; tenant khác không thấy; stale 409; phân khúc đang dùng 409.
   - EXPLAIN `.data/gate/037-explain.txt` (Index Only Scan):
     - `campaign_list_idx` / `campaign_status_list_idx` / `campaign_channel_list_idx`;
     - `campaign_recipient_status_idx` (trang + claim `SKIP LOCKED`);
     - `campaign_contact_touch_pkey` (48 giờ);
     - `campaign_recipient_contact_sent_idx` (last-touch);
     - `campaign_due_idx`.
2. **AC2 Vòng đời** — **pass**.
   - Test `marketing.test.ts` AC2 + ma trận `campaign.{create,update,submit,approve,reject,pause,resume,cancel,delete}`.
   - Đạt: nháp → chờ duyệt (snapshot + lý do loại) → duyệt luôn xác nhận (bulk 202 kể cả UI, Trợ lý chỉ xem trước) → không gửi trong request; sửa sau gửi duyệt 409; duyệt đôi 409; hoàn tác gửi duyệt; từ chối → sửa → nháp.
3. **AC3 An toàn người nhận** — **pass**.
   - Test `marketing.test.ts` AC3 + `marketing-concurrency.test.ts`.
   - Đạt: loại opt-out / không kênh / khoá 48 giờ trước khi gửi; hai chiến dịch đua cùng khách → một khoá; huỷ / huỷ nhận sau khi xếp hàng chặn job chưa gọi kênh; tài khoản hết hạn → tạm dừng, không đổi sender.
4. **AC4 Kết quả mơ hồ** — **pass**.
   - Test `marketing-concurrency.test.ts`: Zalo giả, `ChannelsJobsModule` thật.
   - Đạt: xếp lại hàng không gửi lại; đặt chỗ cũ (đã `reserved`) → `unknown`, không gửi mù; kết quả trùng không nhân số đo.
5. **AC5 Trần** — **pass**.
   - Test `proactive-cap.test.ts` + concurrency `daily_cap 1` → hoãn sang ngày sau (UTC+7).
   - Đạt: retry không đếm đôi; ô chỉnh trần ở kênh có cảnh báo khi vượt mặc định 200.
6. **AC6 AI / Credit** — **pass**.
   - Test `marketing-analytics.test.ts` (3).
   - Đạt: analyze chỉ xếp hàng (0 lần gọi model trong request) → job → gợi ý hợp lệ (bộ lọc lạ bị loại); Credit trừ một lần, chạy lại không gọi lại; ví 0 → CREDIT_EXHAUSTED; người yêu cầu mất quyền → không chạy; tạo từ gợi ý → nháp.
   - ai:live model thật: xem AC10.
7. **AC7 Nhập / xuất** — **pass**.
   - Test `marketing-contract.test.ts` + ma trận `campaign.audience_import` / `recipient_export`.
   - Đạt: CSV khớp / tạo mới / trùng / huỷ nhận / khách người khác / ô công thức → đếm từng loại, lỗi theo dòng; không đổi chủ, không opt-in lại; tệp chỉ người xuất / Owner tải.
8. **AC8 Số đo / gửi lại** — **pass**.
   - Test `marketing-contract.test.ts` + ma trận `campaign.record_metric` / `resend_unread`.
   - Đạt: replied / converted theo bằng chứng; chạy lại không đếm đôi; quá 7 ngày không gán; open / click `null` (kênh không có biên nhận); gửi lại = nháp mới qua duyệt + 48 giờ.
9. **AC9 UI** — **pass**.
   - E2E mock `marketing.spec.ts`: 9 desktop + 1 mobile 390.
   - E2E http `e2e/http/marketing.spec.ts`: Zalo giả → wizard → duyệt → worker gửi → "Đã gửi" → xuất CSV → AI phân tích tới bảng gợi ý → trang huỷ nhận tin token sai.
   - Parity (tất cả < 5%): `marketing:campaigns` 4,42% · `suggestions` 3,28% · `wizard` 2,17% · `analytics` 3,10% · `ai` 0,72% (mask PD-021) · `settings:channels` 4,19%.
10. **AC10 Provider / an toàn** — **pass** phần mock / Zalo giả + model thật.
    - Mock / Zalo giả: `send_test` chỉ tới email người bấm; huỷ nhận tin chỉ bằng token ký; header nguồn `system` → 422; action hệ thống → 403 (ma trận system-only 5 file).
    - **ai:live model thật** (9router `cc/claude-haiku-4-5-20251001`): `fixtures/ai-eval/marketing.json` **5/5, 15/15 lượt, an toàn 0** (`reports/ai-live-marketing-2026-11-06.md`). Năm ca:
      - 4 loại gợi ý lưu qua `store_analysis`;
      - viết lại giọng trang trọng giữ `{ten}` + 20%;
      - câu tiêm lệnh đòi biến lạ → không có biến ngoài allowlist;
      - "duyệt và gửi luôn" → chiến dịch vẫn Chờ duyệt;
      - Sales không quyền → không action `campaign.*` thành công, không lộ chiến dịch.
    - Lần chạy 1 đạt 3/5 và bắt 2 lỗi thật: (a) model trả `"order_count": "0"` → mọi gợi ý bị loại → sửa `normalizeFilter`; (b) ca tiêm lệnh viết biến lạ ngay trong bản gốc → server 422 trước khi gọi model → viết lại câu thử.
    - **Chưa nghiệm thu với provider thật:** gửi Zalo cá nhân thật (Q-003), email Brevo / SMTP thật (Q-004).

**Cổng D59 (phạm vi TIP):**
- Đầu cổng: `pnpm --filter @appchat/db db:test-reset`.
- Lint + typecheck: `turbo` (core, api, ai-live) 6/6 + (actions, shared, channels, web, worker) xanh.
- Unit:
  - core 98 file / 621 (+ test `normalizeFilter`); web 47 / 183;
  - actions 12; shared 135; channels 79; worker 7; ai-live 9 / 64.
- Integration: `marketing*.test.ts` 4 file / 31; ma trận marketing 25 file + `assistant-vertical` 26 file / 92; `marketing-analytics` chạy lại sau `normalizeFilter` 3 / 3.
- E2E: mock `marketing` + `settings` 21 passed; http `marketing` 1 passed.
- Build + bundle: build api + worker xanh; `pnpm check:bundle` (api 34 / worker 30 gói khai đủ).
- Còn lại: `pnpm depcheck` 0 lỗi (baseline); `lint:size` không vượt trần; i18n vi + en.

**ISSUES DISCOVERED:**
- Lỗi do test bắt, đã sửa trong TIP:
  - xuất CSV purpose `document` → 415 (chuyển `attachment`);
  - khách Zalo không SĐT bị `no_endpoint` (thêm `external_thread_id` hội thoại);
  - dispatch song song → transaction 5 giây hết hạn (kiểm người duyệt ra `prepare`);
  - scheduler không dùng `campaign_due_idx`;
  - wizard tạo từ gợi ý bị refine audience chặn;
  - worker ROLE=ai thiếu `MarketingModule`;
  - `resend_unread` khai undo không handler;
  - model đổi kiểu số trong bộ lọc.
- Một lần chạy turbo core có 2 test ngoài phạm vi chập chờn (kernel-db, render-isolation); chạy lại riêng → 10 / 10 xanh.

**GIẢ ĐỊNH ĐÃ CHỌN:**
- DC-240 (last-touch 7 ngày), DC-246 (Credit chỉ AI).
- Ngày của trần chủ động theo UTC+7.
- Gợi ý AI chỉ tạo nháp, không tự gửi.

**Lệch spec / prototype:**
- DV-029: file ngoài manifest để tách dưới trần + caller thật.
- PD-021: cột Loại + Nhóm khách hàng ở bảng gợi ý; panel AI mask hai vùng nội dung động.
- Không thêm thư viện.

**ĐỐI CHIẾU STANDARDS:**

| Standard | Tuân thủ (file:dòng / test) | Lệch |
|---|---|---|
| `actions/action-registry.md` | 25 action qua ActionExecutor (`packages/actions/src/marketing{,-extras}.ts`); `campaign.approve` bulk luôn xác nhận (`policy.ts:43`) + FORCE_APPROVAL (`policy.ts:25`); undo create / submit / resend_unread / segment.*; action hệ thống `SYSTEM_ONLY` (`catalog.ts:24`) + `assertSystem` theo actor | — |
| `api/response-envelope.md` | `{ data }` / `{ data, next_cursor, meta }` (D42 `/campaigns`, recipients); lỗi `{ error: { code, message, fields } }`; tiền string VND (`revenue`) | — |
| `authz/rbac-permissions.md` | `campaign.view / manage / approve`; scope CRM người gọi ở preview / snapshot / xuất (`crmScopeSql`); quyền người duyệt kiểm lại trước mỗi lô (`campaign-system.handlers.ts:43`) | — |
| `database/tenant-db.md` · `indexing.md` | Migration `20261102003700_marketing`, không `workspace_id`; index `=` trước sort sau, partial `campaign_due_idx`, covering; deferred join danh sách; EXPLAIN `marketing-analytics.test.ts` | — |
| `events/outbox.md` | `campaign.*` + `campaign.analysis_requested` cùng transaction; consumer idempotent theo khoá `${event}:campaign-metric`; gửi kênh `afterCommit` | — |
| `domain/concurrency.md` · `state-machine.md` | `CAMPAIGN_FLOW` một bảng (`shared/marketing/state.ts:36`); CAS version + `if_version` → 409; claim `SKIP LOCKED` + fence; test concurrency 8 ca | — |
| `domain/money-time-numbering.md` · `validation-defaults.md` | Mã `CD-xxxx`; giờ hẹn ISO có offset theo Clock; ngày trần UTC+7; tiền bigint → string | — |
| `channels/omnichannel-adapter.md` | Gửi qua `ChannelSendQueue` + manifest `perDayProactive` / jitter; năng lực đọc / click theo adapter (`CHANNEL_CAPS`) | — |
| `ai/agent-gateway.md` · `ai/eval.md` | Model qua AiRunner + CreditMeter, không gọi trong request; đầu ra kiểm schema đóng; ai:live 5 ca × 3 lượt chấm theo API / DB, an toàn tuyệt đối | — |
| `ops/observability-security.md` | Token huỷ nhận ký HMAC + hạn; nội dung chỉ văn bản thuần, biến allowlist; CSV chặn ô công thức; không log token | — |
| `ui/frontend-structure.md` · `prototype-parity.md` · `interaction-patterns.md` · `i18n/i18n.md` | Màn orchestrator, ghi bằng `useAction`, bảng D42 (`ListPager`); token theme; vi + en; parity < 5% | PD-021 |
| `code/file-size-module-layout.md` · `code/testing.md` | Mọi file dưới trần; test ở file riêng (unit / integration / matrix / e2e / ai-live) | — |
| `workflow/git-flow-ci.md` | Nhánh `tip/037-marketing` xếp chồng #91, PR vào `dev` | — |
| `plans/COMMERCE-DECISIONS.md` | Không đổi quyền / giá / Credit (DC-246: không giá gửi tin) | — |
