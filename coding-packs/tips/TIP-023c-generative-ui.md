# TIP-023c: Generative UI (D55) + Trợ lý theo màn có ngữ cảnh + kết nối kênh / nền tảng qua Trợ lý (QR Zalo trong chat, form có ô bí mật)

## HEADER
- **Parallel-safe with TIP-023b (complete manifest intersection):** sequential, shares `apps/web/src/features/assistant/components/ChatThread.tsx`, `packages/actions/src/index.ts`, `packages/core/src/ai/ai.module.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`; integrate TIP-023b before TIP-023c.
- **Parallel-safe with TIP-023b (exact manifest audit):** sequential, shares `apps/web/src/features/assistant/components/ChatThread.tsx`, `packages/actions/src/index.ts`, `packages/core/src/ai/ai.module.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`; integrate TIP-023b before TIP-023c. Recompute on later manifest expansion; this is not whole-graph parallel clearance.
- **Parallel-safe with TIP-032b:** sequential, shares `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`; integrate TIP-023c before TIP-032b. Recompute after incomplete manifests expand.
- **Parallel-safe with TIP-015b:** sequential, shares `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`; integrate TIP-023c before TIP-015b. Recompute after incomplete manifests expand.
- **Parallel-safe with TIP-041:** sequential, shares `packages/actions/src/index.ts`; integrate this TIP before 041. Recheck incomplete manifests.
- **Parallel-safe with TIP-038b:** sequential, shares `apps/web/src/features/assistant/components/ChatThread.tsx`, `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`; integrate this TIP before 038b. Recheck incomplete manifests.
- **Parallel-safe with TIP-040:** sequential, shares `packages/actions/src/index.ts`; integrate this TIP before 040. Recheck incomplete manifests.
- **Parallel-safe with TIP-039:** sequential, shares `packages/actions/src/index.ts`; integrate this TIP before 039. Recheck incomplete manifests.
- **Parallel-safe with TIP-038 (expanded manifest):** sequential, shares `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`; integrate this TIP before 038; recheck after remaining manifests expand.
- **Parallel-safe with TIP-038:** sequential, shares `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`; integrate this TIP before 038. Recheck after incomplete manifests expand.
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

### Rà trước khi làm — điểm nối chiều dọc đã kiểm code
- Đọc `plans/VERTICAL-FLOW-PRIORITY.md` và exact manifest023b (kể cả annex). Không sửa canonical confirmation/current-authority thành đường ghi riêng của GenUI. Manifest023c vẫn phải hoàn thiện trước build; các yêu cầu dưới đây không tự chứng minh đủ file/wiring.
- `channel-connect.handlers.ts` trả `qr` là **đường đọc login**, không phải ảnh. `ChannelControl` giữ state trong Redis TTL180s, worker login sinh QR sau và timeout150s; không render đường `/settings/channels/.../login` thành dataURL. Cần adapter DTO map starting→waiting, trạng thái scanned/connected/expired/failed, kèm attempt ID/revision để phân biệt lần quét lại.
- `assistant.controller.ts` hiện chỉ trả JSON; `sessions.ts` trả session/messages với next_cursor=null, recent query chưa có tie-break id. `useAssistantChat` dùng seq local và gọi UI command ngay; replay SSE không được reuse show() mà phát lại side effect.
- `useAction` mặc định gọi nguồn UI; policy UI risk write không buộc preview. Vì thế gọi useAction từ GenUI **chưa đủ** chứng minh mọi nút ghi do model đề nghị đều được xác nhận. Cần intent/token server gắn actor/workspace/run/tree/node/action/input và source assistant, không tin source=assistant từ body tuỳ ý.
- AgentAiDrawer là trường hợp khác7 drawer giả: hiện đã gọi agent.draft_from_description và agent.create_and_publish theo D29, phần gợi ý khác mới chuyển trang. Khi nối cùng screen-assistant phải giữ draft→preview→publish và open builder, không thay chức năng thật bằng chat chung hoặc tự publish. D55 renderer cũng áp drawer Agents; không tuyên bố cả8 drawer đều đang dùng regex giả.

### Hợp đồng an toàn cần khép trước manifest
1. **QR attempt:** channel.status kiểm quyền channels.manage/current membership và tenant account; poll2s chỉ khi component visible và attempt hiện hành chưa terminal, dừng khi unmount/workspace switch/revoke/expiry. Regenerate dùng reconnect tài khoản đang nối thay vì mỗi lần tạo account mới/quota mới; stale QR event không ghi đè attempt mới. QR bytes/token không đưa vào model, persisted message hoặc report; run giữ typed opaque reference, browser fetch ảnh ephemeral có auth. Reopen phiên cũ chỉ hiện hết hạn/trạng thái, không phát lại QR cũ.
2. **Resume không tin browser:** browser chỉ báo handle đã hoàn thành để server kiểm action_log/current login state và attempt; không nhận `{ok:true}` từ client làm chứng cứ connected. Receipt unique(run,node,attempt), duplicate poll/WS/reload chỉ resume một lần; session của actor khác, stale attempt hoặc revoked permission không được resume. Action result an toàn mới vào run; không copy credential/QR vào tool output.
3. **Secret path:** schema metadata là nguồn secret duy nhất, model không được đổi field secret thành text hay prefill secret; frontend state local của password input, clear khi submit/unmount/switch. Secret gửi trực tiếp executor qua transport, preview trả redacted fields nhưng vẫn bind input digest; không lưu raw secret vào canonical pending-action023b, SSE, message, run step, action log, idempotency response, outbox hoặc telemetry. Nếu phải giữ giữa preview và confirm, dùng vault ngắn hạn mã hoá, actor/tenant/action-bound handle, TTL và consume-once; server key không ra browser/model. Raw password không phải idempotency key. Gõ bí mật vào chat: hướng dẫn dùng form, lọc pattern được nhận diện trước lưu/model; không hứa phát hiện được mọi chuỗi bí mật tuỳ ý.
4. **GenUI action intent:** intent phát server sau validate tree+action+scope, chỉ cho action có implementation. useAction mang intent handle; server tự resolve source/policy theo intent đã ký, recheck authority/input/version trước preview/confirm. Node bị sửa hoặc cross-session token bị chặn. Không gọi handler trực tiếp từ render/resume; command thay UI không được chứa API write. Secret form gửi token handle, không gửi secret vào transcript.
5. **Refs:** `$ref` có grammar đóng step ID+allowed path, chặn prototype traversal và foreign run, không eval JSONPath. Server kiểm run/session/actor rồi resource/field authority hiện tại, không chỉ tin quyền ở lúc tạo step. Workspace switch/revoke/record delete phải clear cached refs và từ chối lazy fetch; ref unavailable hiện không có dữ liệu, không tự nhờ model đoán số. Persist tree+ref descriptor, không persist một bản copy payload vượt scope.
6. **SSE durable:** request_id/idempotency scoped workspace/user/session, atomic claim trước tạo message/run; replay same input trả cùng run, mismatch409. Events có run_id/event_id/sequence, resume từ cursor đã xác thực; không tạo run mới khi reconnect. Streaming chỉ hiện node hoàn chỉnh đã validate, skeleton cho partial node không tương tác; không enable action chưa qua whole-tree limits/validation. Replayed ui command chỉ cập nhật state an toàn, không tự chạy action. JSON fallback giữ cùng run/result contract.
7. **Filehandle trước030b:**023c cần guard cơ bản độc lập (tenant/uploader/purpose/expiry/access/mime/size), không phụ thuộc parser/guard030b vì030b tích hợp sau023c.030b tái dùng guard và bổ sung document-specific scanning sau,038b bổ sung mapping/import/export. Extension registry ở shared, domain đăng ký từ feature entrypoint, không shared→feature import hoặc raw external URL.
8. **Session và context:** paginate session theo user_id + last_message_at,id và messages theo session_id+created_at,id; expression index khớp f_unaccent(lower(title)) khi tìm, payload rows lấy deferred join sau IDs. Context entity/id/selection là gợi ý không phải authority, server resolve và giới hạn theo permission; không gửi nguyên selected row JSON chứa field ẩn. Drawer/full dùng cùng session_id, không trộn conversation/contact khi chuyển bản ghi.

### AC xuyên luồng bổ sung
- Given agent/Zalo login request trả route chứ không ảnh, When worker sinh QR rồi quét lại, Then UI chỉ hiện ảnh attempt mới từ authorized ref; stale connected của attempt cũ không resume run mới, quota account không tăng do regenerate.
- Given GenUI đề nghị contact.update risk write, When click node hoặc gửi form, Then có preview/confirm dù UI thông thường có thể chạy trực tiếp; sửa token/node/actor không bypass. Secret sentinel không xuất hiện trong DB/log/stream/model capture ở cả preview, validation error, retry và confirm.
- Given SSE rớt sau action commit hoặc sau event persist, When reconnect/reopen trên tab khác, Then cùng run/action receipt, không duplicate write, không lặp UI mutation; current revoked permission làm ref unavailable.
- Given một file uploaded hợp lệ nhưng actor khác/tenant khác dùng handle, When gửi assistant request hoặc reopen persisted tree, Then bị chặn trước model/storage read; không đổi tên file để bypass mime/size/purpose.
- Given drawer Agents hiện draft hợp lệ, When mở rộng hoặc mở Trợ lý, Then draft không tự publish; chỉ explicit confirmation qua action chuẩn mới publish. Giữ parity khung D29 và test riêng với7 drawer nghiệp vụ.

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

8a. **Session browser (REQ-E10a):** nối list/search/open phiên vào endpoint assistant controller hiện có, lọc theo user/workspace và scope hiện tại; search có debounce, phân trang ổn định, empty/error/retry. Mở phiên cũ render persisted parts, không gọi lại model và không phát lại action ghi. Không lẫn session giữa workspace khi switch.
8b. **Highlight (REQ-E05b):** UiCommand highlight gắn entity/id theo màn, kiểm bản ghi trong dữ liệu user được xem; nếu chưa tải thì fetch đúng trang/bản ghi theo API scope rồi focus/highlight, không tìm DOM rồi âm thầm bỏ qua. Không chuyển highlight thành mutation; thay filter hoặc đóng drawer phải bỏ highlight cũ. Keyboard và mobile dùng được.
8c. **Attachment primitive cho038b:**023c sở hữu chọn/upload file qua Files API hiện hữu, progress/cancel/retry, filehandle tenant-scoped và preview metadata an toàn; gửi handle trong assistant request không gửi đường dẫn storage/URL bí mật. Server kiểm owner/purpose/access và giới hạn file trước chuyển cho domain extension.023c cung cấp extension registry cho panel nghiệp vụ, không import TransferPanel038b chưa tồn tại;038b đăng ký importer/exporter sau. File invalid/expired/foreign phải fail trước model, không mặc nhiên tin handle từ client. Guard file reuse module an toàn030b khi đã tích hợp; không viết parser file CRM/commerce ở023c.

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

8. Given phiên cũ có action đã confirm, When reopen/search/switch workspace hoặc SSE reconnect, Then không chạy lại action, refs kiểm lại quyền và không lộ dữ liệu user cũ; abort giữa stream không tạo hai run khi retry cùng idempotency key.
9. Given highlight tới bản ghi ngoài trang đang tải và filehandle tenant khác, When chạy UI command hoặc upload/message request, Then bản ghi hợp lệ được tải/focus theo scope còn file foreign bị từ chối trước model; có empty/error/cancel/retry và không lộ URL storage.

## CONSTRAINTS
- Standard `ai/generative-ui.md` là luật: số liệu chỉ qua `$ref`, nút chỉ `ui` / `action`, không HTML / JS / CSS / URL tuỳ ý. Đổi standard = DC-227 (khối `qr`, ô `secret`) — không thêm khối khác ngoài danh sách.
- Bí mật không bao giờ tới LLM, không lưu ngoài bảng credentials đã mã hoá (AES-256-GCM).
- Thư viện mới: không (antd, `@ant-design/charts` đã trong stack D55; QR vẽ bằng ảnh data URL có sẵn từ adapter Zalo).
- Frontend: file ≤ 400 dòng, drawer chỉ là orchestrator; i18n vi + en.
- Kênh / connector ngoài manifest vẫn "Sắp có" (D04 / D28); Brevo thật chờ whitelist IP (Q-004).

## Nhập/xuất AI-first — DC244

Attachment/GenUI của023c phải cho [TIP038b](TIP-038b-ai-first-data-transfer.md) dùng filehandle và typed mapping/preview/progress/download.038b nhận nghiệp vụ nhập/xuất, không để model tựrenderHTML/fileURL hoặc bỏ userconfirmation. Khi hoàn thiện manifest023c, nối TransferPanel host qua approvedUIcommand, khôngimport featurechéo.
