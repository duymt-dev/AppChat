# TIP-023c: Generative UI (D55) + Trợ lý theo màn có ngữ cảnh + kết nối kênh / nền tảng qua Trợ lý (QR Zalo trong chat, form có ô bí mật)

## HEADER
- **Additional overlap with TIP-037 caps UI:** sequential, shares `packages/actions/src/settings-apps.ts`; integrate this TIP before 037.
- **Parallel-safe with TIP-037:** sequential, shares `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`; integrate this TIP before 037. Recheck when incomplete manifests expand.
- **Parallel-safe with TIP-042b:** sequential, shares `packages/actions/src/index.ts`, `packages/actions/src/settings-apps.ts`; integrate this TIP before 042b; recheck after incomplete manifests are expanded.
- **Parallel-safe with TIP-042:** sequential, shares `packages/actions/src/index.ts`; integrate this TIP before 042. Recheck intersections when incomplete manifests are expanded.
- **Parallel-safe with TIP-020b:** sequential, shares `packages/actions/src/index.ts`; integrate 020b after 036, before 043/045b. For 043 also shares `packages/db/prisma/tenant/ai-kb.prisma`, `packages/core/src/ai/ai.module.ts`, `apps/api/src/http/ai/ai.http.module.ts`, `apps/web/src/features/settings/components/RagSection.tsx`, `apps/web/src/shared/api/mock/domains/settings-ai.ts`, settings/action locale files.
- **Parallel-safe with TIP-043:** sequential, shares `packages/actions/src/index.ts` and (where applicable) `packages/core/src/ai/jobs/ai.jobs.module.ts`; TIP-043 integrates after 015b/023b/023c/030b/032b/036 and before 045b.
- TIP-ID: TIP-023c (bổ sung TIP-023 — chèn trước TIP-036 sau 023b, đóng Q-005, DC-227)
- Project: AppChat V2
- Module: `packages/shared/src/genui/{schema, limits}.ts` · `packages/core/src/ai/assistant/{meta-tools, render}.ts` · `packages/ai/src/prompts` (genui) · FE `apps/web/src/shared/genui/**` (renderer, khối, `GenUiModal`) · `features/assistant/components/ChatThread.tsx` · 7 drawer `features/<module>/components/*AiDrawer.tsx` + `features/inbox/components/InboxAiModal.tsx` · hook dùng chung `shared/assistant/useScreenAssistant.ts` · `packages/actions/src/settings-apps.ts` (đọc trạng thái kết nối) · `standards/ai/generative-ui.md`
- Depends on: TIP-023b (đủ action đọc + khuôn lồng nhau — form genui dựng từ khuôn đó), TIP-014 / 016 / 012 (kết nối kênh / connector)
- Priority: P0 · REQ: E06, E07, E10, B10, H03 · Decision: D55, D55b, DC-227, DC-228
- Estimated effort: 24 giờ (G1 genui lõi 10 · G2 Trợ lý theo màn 8 · G3 kết nối qua Trợ lý 6)
- Nhánh: `tip/023c-generative-ui` từ `origin/dev` (sau khi 023b vào `dev`); một PR mỗi pha.

## CONTEXT

**Ranh giới tuần tự bổ sung:** sequential, shares `packages/actions/src/index.ts` with TIP-036; 023c xong trước 036. Khi viết file manifest đầy đủ phải giữ quan hệ này, không hiểu bảng W8 cũ là cho phép sửa registry song song.
- `standards/ai/generative-ui.md` (D55) đã chốt cây giao diện mức 2 nhưng **chưa có dòng code nào** (`packages/shared/src/genui` không tồn tại); TIP-023 để FE genui thành goal riêng (Q-005) và không có TIP nào trong task graph.
- 7 drawer "Trợ lý AI · [module]" (Khách hàng, Báo giá, Hợp đồng, Đơn hàng, Lịch hẹn, Ticket, Marketing) còn **giả từ goal FE**: ô hỏi trả câu soạn sẵn theo regex, nút lệnh nhanh hiện `ai_runs` do backend đếm theo luật. Hộp lệnh Hộp thư chỉ chuyển sang trang Trợ lý. FE chỉ gửi `context.route` — REQ-E06 đòi màn + bản ghi đang xem + dòng đang chọn.
- Kết nối kênh / nền tảng đã có action (`channel.zalo.start_login` trả `qr`, `channel.email.connect`, `webchat.update_widget`, `integration.connect`, `bank_feed.connect`) nhưng Trợ lý chỉ nhận chuỗi QR, không hiển thị / theo dõi được; ô mật khẩu / API key nếu gõ vào chat sẽ đi tới LLM và nằm trong lịch sử.

## TASK

### Pha G1 — Generative UI lõi
1. **Schema `UiTree`** (`packages/shared/src/genui/schema.ts`, zod) đúng standard §2: `stack`, `row`, `section`, `text`, `stat`, `stat_group`, `table`, `list`, `progress`, `badge`, `chart`, `button`, `button_group`, `form` + **khối mới `qr`** và **ô `secret` trong form** (DC-227). Tone ngữ nghĩa, giới hạn §8, số liệu chỉ `$ref` tới bước run.
2. **Meta-tool `render(tree)`**: validate zod, sai → trả lỗi zod để model sửa một lần, vẫn sai → khối `text` báo lỗi; lưu `assistant_message.content.parts[] {type:'ui', tree, run_id}`; sự kiện lượt mới `{ type: 'ui', tree, run_id, refs }` (refs = output các bước được tham chiếu, đã lọc theo quyền người xem). Prompt genui theo `surface: drawer | assistant` + `screen`.
3. **Renderer FE** `shared/genui/`: một component / khối, chế độ `compact` / `full` (D55b), "Mở rộng" → `GenUiModal` (ModalShell 960, không gọi lại LLM), `$ref` thiếu → "Không có dữ liệu", ẩn nút không quyền (`useCan`), nút `ui` → UiCommandBus, nút / form `action` → `useAction(id).run` (thẻ xác nhận như mọi nguồn). Form sinh ô từ khuôn action (023b), giá trị điền sẵn validate trước khi hiện. Token theme, không px / màu cứng, i18n nhãn hệ thống. Chart: `@ant-design/charts` lazy (đã có trong stack D55).
4. **Ô `secret`**: input type password, giá trị **không bao giờ** về LLM, không vào `assistant_message`, `ai_run_step`, `action_log.input` (executor che theo cờ `secret` của ô trong ActionDef — đánh dấu `fields.password`, `api_key`, `token`…), log che `***`. Gửi form = `useAction` trực tiếp từ trình duyệt; run chỉ nhận kết quả `{ ok, channel_account_id | connection_id }`.
5. **Khối `qr`**: `{ type:'qr', source: { $ref }, poll: { action_id: 'channel.status', input } }` — renderer hiện ảnh QR, hỏi trạng thái mỗi 2 giây qua action đọc `channel.status` (mới, risk read: `waiting | scanned | connected | expired | failed`), hết hạn → nút "Tạo mã mới" (chạy lại action nguồn), `connected` → báo về run (`assistant.resume` với kết quả) để Trợ lý nói tiếp.

6a. **Stream (đóng DV-006):** `POST /assistant/messages` trả SSE (`delta`, `ui` từng phần qua `streamObject`, `confirm`, `done`) khi client gửi `Accept: text/event-stream`; giữ JSON một lần cho client cũ; FE `transport.stream` + render dần (skeleton cho khối chưa đủ dữ liệu — standard §11).

### Pha G2 — Trợ lý theo màn (REQ-E06)
6. **Ngữ cảnh**: hook `useScreenAssistant(module)` gửi `context { route, entity, id, selection[] }` lấy từ store của màn (bản ghi drawer đang mở, dòng đang chọn trong DataTable). AssistantDock + màn Trợ lý dùng chung.
7. **7 drawer + hộp lệnh Hộp thư nối Trợ lý thật**: ô hỏi gửi lượt (`surface: 'drawer'`, cùng phiên theo module), hiện delta / thẻ xác nhận / cây genui compact trong drawer; nút "Phân tích nhanh" = danh sách cố định theo màn (standard §10), mỗi nút một prompt soạn sẵn gửi Trợ lý; khối tóm tắt `ai_runs` đếm theo luật giữ làm đầu drawer (thông tin, không giả AI). Bỏ toàn bộ regex / câu `ack*` giả. Prototype giữ nguyên khung drawer (parity < 5% ở trạng thái mở chưa hỏi).
8. **"Mở trong Trợ lý"**: chuyển phiên drawer sang màn Trợ lý đầy đủ (cùng `session_id`).

### Pha G3 — Kết nối qua Trợ lý
9. **Zalo**: "kết nối Zalo" → `channel.zalo.start_login` → `render` khối `qr` → quét → `connected` → Trợ lý hỏi cấu hình nhanh (form genui gắn `channel.update_settings`: agent phụ trách, chế độ AI, cách chia) → thẻ xác nhận.
10. **Email / widget / connector (SePay, Casso, Brevo…) / bank feed**: form genui gắn action, ô bí mật theo manifest connector (`ConnectorManifest.fields[].secret`), nút "Kiểm tra kết nối" (`channel.test` / probe connector) trước khi gửi.
11. **Danh sách / quản lý**: "kênh nào đang lỗi", "ngắt Zalo số 2", "tạm dừng email hỗ trợ" → action đọc `channel.search` (023b) + `channel.pause / resume / disconnect` (thẻ xác nhận có preview).

## ACCEPTANCE CRITERIA
1. Unit shared: schema nhận / chặn từng khối, giới hạn §8, `qr`, `secret`; core: `render` sai zod → thử lại → khối lỗi; refs lọc theo quyền; executor che ô secret trong `action_log` / `ai_run_step`.
2. Unit web: renderer từng khối, compact / full, ẩn nút không quyền, form validate theo khuôn, ô secret không vào store tin nhắn.
3. Integration: lượt có `render` lưu `parts[ui]` + phát lại khi mở phiên; `channel.status` theo vòng đời đăng nhập (fake transport); tin chứa secret không xuất hiện trong bất kỳ bảng nào (quét `assistant_message`, `ai_run_step`, `action_log`, `outbox`).
4. E2E http: drawer Báo giá đang mở BG-xxxx → hỏi "báo giá này còn hiệu lực không" → trả lời đúng bản ghi; Khách hàng chọn 3 dòng → "gắn thẻ VIP cho các khách đang chọn" → thẻ xác nhận đủ 3; "Phân tích nhanh" → cây genui hiện, "Mở rộng" → modal; kết nối email qua Trợ lý (fake IMAP) → form có ô mật khẩu → xác nhận → kênh mới trong Cài đặt.
5. **Model thật (9router):** "kết nối Zalo" → QR hiện trong chat → quét bằng tài khoản Zalo thật → Trợ lý báo đã kết nối + hỏi gán agent (Chủ nhà quét); bộ câu thử `pnpm ai:live` thêm 10 ca G2 / G3 (theo màn, genui, kết nối), ngưỡng như 023b (Q-023).
6. Parity: các drawer AI và màn Trợ lý < 5% ở trạng thái chưa hỏi; e2e mobile 390 cho drawer + modal genui.
7. Cổng D59 + `pnpm parity --done` (đụng `shared/*`).

## CONSTRAINTS
- Standard `ai/generative-ui.md` là luật: số liệu chỉ qua `$ref`, nút chỉ `ui` / `action`, không HTML / JS / CSS / URL tuỳ ý. Đổi standard = DC-227 (khối `qr`, ô `secret`) — không thêm khối khác ngoài danh sách.
- Bí mật không bao giờ tới LLM, không lưu ngoài bảng credentials đã mã hoá (AES-256-GCM).
- Thư viện mới: không (antd, `@ant-design/charts` đã trong stack D55; QR vẽ bằng ảnh data URL có sẵn từ adapter Zalo).
- Frontend: file ≤ 400 dòng, drawer chỉ là orchestrator; i18n vi + en.
- Kênh / connector ngoài manifest vẫn "Sắp có" (D04 / D28); Brevo thật chờ whitelist IP (Q-004).
