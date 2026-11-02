# TIP-023b: Trợ lý toàn năng — phủ đủ action (đọc / ghi), ô lồng nhau, mã → id, thẻ xem trước "đổi gì", test bắt buộc, bộ câu thử với model thật

## HEADER
- **Parallel-safe with TIP-015b:** sequential, shares `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`; integrate TIP-023b before TIP-015b. Recompute after incomplete manifests expand.
- **Parallel-safe with TIP-041:** sequential, shares `packages/actions/src/index.ts`; integrate this TIP before 041. Recheck incomplete manifests.
- **Parallel-safe with TIP-038b:** sequential, shares `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`; integrate this TIP before 038b. Recheck incomplete manifests.
- **Parallel-safe with TIP-040:** sequential, shares `packages/actions/src/index.ts`; integrate this TIP before 040. Recheck incomplete manifests.
- **Parallel-safe with TIP-039:** sequential, shares `packages/actions/src/index.ts`; integrate this TIP before 039. Recheck incomplete manifests.
- **Parallel-safe with TIP-038 (expanded manifest):** sequential, shares `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`; integrate this TIP before 038; recheck after remaining manifests expand.
- **Parallel-safe with TIP-038:** sequential, shares `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`; integrate this TIP before 038. Recheck after incomplete manifests expand.
- **Parallel-safe with TIP-037:** sequential, shares `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`; integrate this TIP before 037. Recheck when incomplete manifests expand.
- **Parallel-safe with TIP-042b:** sequential, shares `packages/actions/src/index.ts`; integrate this TIP before 042b; recheck after incomplete manifests are expanded.
- **Parallel-safe with TIP-042:** sequential, shares `packages/actions/src/index.ts`; integrate this TIP before 042. Recheck intersections when incomplete manifests are expanded.
- **Parallel-safe with TIP-020b:** sequential, shares `packages/actions/src/index.ts`; integrate 020b after 036, before 043/045b. For 043 also shares `packages/db/prisma/tenant/ai-kb.prisma`, `packages/core/src/ai/ai.module.ts`, `apps/api/src/http/ai/ai.http.module.ts`, `apps/web/src/features/settings/components/RagSection.tsx`, `apps/web/src/shared/api/mock/domains/settings-ai.ts`, settings/action locale files.
- **Parallel-safe with TIP-043:** sequential, shares `packages/actions/src/index.ts` and (where applicable) `packages/core/src/ai/jobs/ai.jobs.module.ts`; TIP-043 integrates after 015b/023b/023c/030b/032b/036 and before 045b.
- TIP-ID: TIP-023b (bổ sung TIP-023 — chèn trước TIP-036, DC-224)
- Project: AppChat V2
- Module: `packages/core/src/ai/assistant/{catalog, meta-tools, code-refs}.ts` · `packages/core/src/ai/agents/agent.runtime.ts` (tool agent) · handler `*.handler.ts` các domain đã có (preview + action đọc mới) · `packages/actions/src/*.ts` (action `search` / `get` mới) · `packages/ai/src/prompts` · `packages/core/test/assistant-coverage.test.ts` · `tools/ai-live/` (bộ câu thử model thật)
- Depends on: TIP-023 (Trợ lý), TIP-022 (agent runtime), mọi TIP domain 013–035 (handler đã có)
- Priority: P0 · REQ: D03, E02, E04, E05, E09, E10 · Decision: D03, D51, DC-128, DC-224, DC-225, DC-226
- Estimated effort: 16 giờ (R1 4 · R2 12)
- Nhánh: `tip/023b-assistant-coverage` từ `origin/dev`; một PR mỗi pha.
- **Parallel-safe with:** sequential, shares `packages/actions/src/index.ts` and `packages/core/src/ai/jobs/ai.jobs.module.ts` with TIP-036; 023b phải xong trước 036. Preview/worker registration mở rộng ở 036 phải giữ test phủ action của 023b xanh.

## CONTEXT
Chạy với 9router thật (2026-11-01) lộ ra Trợ lý chỉ làm được ca model giả đã viết sẵn. Đo trên registry (207 action, 189 ghi):
- **Đọc gần như không có:** Bán hàng 50 action ghi / 0 đọc, Hộp thư 25 / 0, Khách hàng 17 / 2. Blueprint §5.2 chỉ cho Trợ lý đọc qua `query_data` (metric tổng hợp — TIP-038) nên không có đường đọc **từng bản ghi** ("báo giá BG-1003 trạng thái gì", "đơn của chị Hoa"). Lỗ hổng thiết kế → DC-224.
- **Ô lồng nhau mù:** `find_actions` trả `{"contact_id":"string","patch":"object"}` — 48 action có ô object / array, model không biết `patch.phone`, `items[].product_id`.
- **Ô id:** ~40 loại ô `*_id`; `code-refs.ts` mới đổi mã → id cho 8 thực thể; nhân viên, dịch vụ, agent, thành viên, thẻ, mẫu, tài khoản kênh… không có action tra theo tên.
- **Thẻ xác nhận chung chung:** 18 / 192 handler có `preview`; còn lại thẻ "AppChat sẽ cập nhật khách hàng khi anh/chị bấm Xác nhận" (DC-128 tạm) — người dùng không thấy đổi gì.
- **14 action chưa có handler** (campaign.* , loyalty.adjust_points / update_config, wallet.update_alerts, follow_up.complete — TIP 036–039) nhưng `find_actions` vẫn trả → model gọi → lỗi.
- Đã vá trên `dev` (ghi vào report TIP này): `bf0bd58` (`contact.search`, mã → id, lỗi validation kèm khuôn, động từ tiếng Việt), `e7781c9` (prompt v3: tự tra trước khi hỏi lại).
- Không TIP nào còn lại (036–046) làm phần này; TIP-044 (eval) chỉ phát hiện.

## TASK

### Pha R1 — khung + chặn hồi quy
1. **Schema đầy đủ cho model:** `briefSchema` → khuôn lồng nhau (object → ô con, array → khuôn phần tử, enum → giá trị, `?` tuỳ chọn), giới hạn độ sâu 3 / 40 ô; dùng cho `find_actions` và lỗi `VALIDATION_FAILED` của `call_action`. Mô tả action không có ví dụ → sinh ví dụ tối thiểu từ khuôn.
2. **Ẩn action chưa có handler:** `find_actions` / `call_action` / tool agent chỉ nhận action có handler đăng ký (`HandlerRegistry.has(id)`); TIP sau cài handler là tự hiện.
3. **Test bắt buộc `assistant-coverage.test.ts`** (unit, chạy trong cổng trước commit của mọi TIP sau):
   - mỗi ô `<thực thể>_id` của action có handler phải có đường tra: `code-refs` hoặc action đọc `<thực thể>.search` / `get` (danh sách miễn trừ có lý do: id nội bộ không người dùng nói ra như `confirm_token`, `message_id` tin cụ thể…);
   - mỗi action ghi có handler phải có `preview` (danh sách nợ giảm dần ở R2, R2 xong = rỗng);
   - mỗi màn danh sách FE (route `GET` §4.4 có trong `apps/api`) có action đọc tương ứng (bảng ánh xạ trong test).
4. **Bộ câu thử model thật `tools/ai-live/`:** `cases.yaml` 30 câu cố định (tra cứu 8 · sửa 6 · tạo 6 · xoá / huỷ 3 · chuỗi nhiều bước 4 · hỏi lại khi mơ hồ 3), chạy trên workspace seed riêng (`fixtures/ai-eval/live-seed.mjs`, không dùng tenant demo), chấm tự động: action gọi cuối, input khớp (ô bắt buộc), có thẻ xác nhận với ghi / không với đọc, không hỏi lại khi đủ dữ kiện. Ra `reports/ai-live-<date>.md` (điểm, ca fail kèm bước, model, version prompt, token). Lệnh `pnpm ai:live` — không chạy trong CI (tốn lượt thật).
5. **Agent trực kênh dùng chung `resolveCodes`** ở `agentToolSpecs` (cùng luật ẩn action chưa có handler).

### Pha R2 — phủ đủ
6. **Action đọc** (risk `read`, `agentGrantable: true`, `skill: true`, cùng hàm list / get + `scopeFilter` của màn — không viết truy vấn thứ hai): `quote.search`/`get`, `contract.search`/`get`, `order.search`/`get`, `invoice.search`/`get`, `appointment.get`, `ticket.get`, `contact.get` (360 rút gọn), `conversation.search`/`get` (tin gần nhất ≤ 20), `staff.search`, `service.search`, `agent.search`, `member.search`, `tag.search`, `doc_template.search`, `channel.search` (tài khoản kênh), `kb.source_search`, `run.search`. Input `{ q?, <lọc theo màn>?, limit ≤ 20 }`, output id + mã + tên + trạng thái + vài ô chính. `code-refs` thêm thực thể còn thiếu có cột `code`.
7. **Preview cho mọi action ghi đã có handler:** `{ summary, risk, diff?: [{field, from, to}], count?, money?, recipients? }` — sửa: diff từng ô; tạo: tóm tắt đối tượng mới; xoá / huỷ: tên + mã + hệ quả; gửi: người nhận + kênh; tiền: số tiền + phương thức; hàng loạt: số bản ghi. Thẻ xác nhận hiện diff (FE `ChatThread` ActionCard thêm dòng diff — chỉ thêm, giữ prototype). Hết danh sách nợ của test R1.
8. **Action ghi còn thiếu theo Blueprint / D50:** `appointment.update` (sửa giờ / dịch vụ / nhân sự / ghi chú / trường tuỳ biến — custom-fields §3), `conversation.create_group` (tạo nhóm Zalo — D50 hết khoá "Sắp có" vì TIP-014 xong; `zca-js` tạo nhóm, nhóm thành hội thoại mới) + bỏ "Sắp có" ở `ConvMenu`.
9. **Ghi sổ:** Blueprint §5.2 thêm dòng "Đọc bản ghi = action `search` / `get` (risk read) qua `call_action`; `query_data` chỉ metric tổng hợp" (DC-224); TIP-023 report ghi khoảng trống E06 → TIP-023c.

### Bổ sung review độc lập: thẻ Sửa và an toàn
- REQ-E03b: thẻ preview phải có nút **Sửa** mở form theo input schema; giữ kiểu object/array/enum và lỗi từng field. Submit sửa chỉ yêu cầu preview mới, không thực thi action; input đổi làm token cũ mất hiệu lực, confirm mới gắn actor/action/input/version/TTL. Nếu bản ghi hoặc quyền đổi giữa preview/confirm thì báo conflict/forbidden và không thực thi input cũ. Không cho sửa field secret vào chat history.
- Shape preview phải tương thích ActionPreview hiện hữu trong packages/actions/src/define.ts (hiện là changes); chọn một shared contract, không để backend trả diff trong khi FE đọc changes. Khi hoàn thiện manifest phải liệt kê define.ts, assistant/card.ts/service/types và FE ChatThread/types; không tự mở thêm đường ghi ngoài Executor.
- Given người dùng sửa phone trong thẻ rồi bấm confirm cũ, When server nhận, Then token/input mismatch bị chặn; confirm mới thực hiện đúng một lần với diff mới. Given role bị thu hồi hoặc request replay, Then không bypass scope và không ghi lặp.
- Gate27/30 của bộ câu thử023b không cho phép bỏ qua lỗi an toàn: **zero authorization leak, zero unconfirmed write** ở mọi lượt. Ba lỗi cho phép theo tỷ lệ chỉ là lựa chọn/diễn đạt không vi phạm quyền hoặc policy;044 giữ release thresholds riêng, không hạ xuống27/30.

## ACCEPTANCE CRITERIA
1. Unit `assistant-coverage.test.ts` xanh với danh sách nợ preview **rỗng** cuối R2; miễn trừ ô id có lý do từng dòng.
2. Unit catalog: `briefSchema(contact.update)` có `patch.phone`; `quote.create` có `items[].product_id`, `items[].qty`; action không handler không xuất hiện trong `find_actions`.
3. Integration `assistant.test.ts`: sửa SĐT khách theo tên → `contact.search` → `contact.update` → thẻ có diff `phone: cũ → mới`; tra "báo giá BG-xxxx" → `quote.get`; agent tool nhận mã KH.
4. Integration mỗi action đọc mới: scope sales chỉ thấy bản ghi của mình (role-isolation harness).
5. **Bộ câu thử thật `pnpm ai:live` với 9router: ≥ 27/30**, báo cáo đính kèm. Ngưỡng < 100% vì bản chất xác suất của LLM (Q-023 — Chủ nhà chốt ngưỡng); ca fail phân loại "lỗi hệ thống" (khuôn / thiếu action / preview — phải sửa) vs "model chọn sai" (ghi lại, không hạ chuẩn).
6. Cổng D59 TIP backend: lint / typecheck / unit / integration / depcheck / build; E2E http `assistant`; full hồi quy một lần ở chốt TIP.

## CONSTRAINTS
- Action-first: action đọc mới đi qua `ActionExecutor` (kiểm quyền + scope), không gọi repo trực tiếp từ meta-tool.
- Không đổi schema input action ghi đã có (L2); thêm action đọc = thêm, không sửa.
- Không gửi dữ liệu bí mật cho model: output action đọc không có secret / credentials (đã có quy tắc connector).
- `query_data` vẫn TIP-038; Generative UI + Trợ lý theo màn = TIP-023c.
- Index: action đọc dùng index list sẵn có; thêm index chỉ khi EXPLAIN cho thấy seq scan (ghi report).
