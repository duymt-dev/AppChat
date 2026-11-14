# TIP-047 — Hạ tầng thoại: `packages/voice` + LiveKit / SIP edge native (Gọi điện, D61)

## HEADER
- **Parallel-safe with TIP-049 (coverage-closure manifest):** sequential, shares `.env.example`; integrate 047 before049.
- **Parallel-safe with TIP-049b (coverage-closure manifest):** sequential, shares `.env.example`; integrate 047 before049b.
- **Parallel-safe with TIP-049c (coverage-closure manifest):** sequential, shares `.env.example`; integrate 047 before049c.
- **Parallel-safe with TIP-035d (coverage-closure manifest):** sequential, shares `.env.example`; integrate 035d before047.
- **Parallel-safe with TIP-048 (coverage-closure manifest):** sequential, shares `.env.example`; integrate 047 before048.
- **Parallel-safe with TIP-048b (coverage-closure manifest):** sequential, shares `.env.example`; integrate 047 before048b.
- **Parallel-safe with TIP-048d (coverage-closure manifest):** sequential, shares `.env.example`; integrate 047 before048d.
- **Parallel-safe with TIP-048e (coverage-closure manifest):** sequential, shares `.env.example`; integrate 047 before048e.
- **Parallel-safe with TIP-048h (coverage-closure manifest):** sequential, shares `.env.example`; integrate 047 before048h.
- **Parallel-safe with TIP-044 (coverage-closure manifest):** sequential, shares `.dependency-cruiser.cjs`, `pnpm-lock.yaml`; integrate 047 before044.
- **Parallel-safe with TIP-045 (coverage-closure manifest):** sequential, shares `pnpm-lock.yaml`; integrate 047 before045.
- **Parallel-safe with TIP-046 (coverage-closure manifest):** sequential, shares `pnpm-lock.yaml`; integrate 047 before046.
- **Parallel-safe with TIP-047d (coverage-closure manifest):** sequential, shares `pnpm-lock.yaml`; integrate 047 before047d.
- **Parallel-safe with TIP-001b (coverage-closure manifest):** sequential, shares `.dependency-cruiser.cjs`; integrate 001b before047.
- **Parallel-safe with TIP-006d (coverage-closure manifest):** sequential, shares `.env.example`; integrate 006d before047.
- **Parallel-safe with TIP-020e (coverage-closure manifest):** sequential, shares `.env.example`; integrate 020e before047.
- **Parallel-safe with TIP-023b (coverage-closure manifest):** sequential, shares `pnpm-lock.yaml`; integrate 023b before047.
- **Parallel-safe with TIP-023c (coverage-closure manifest):** sequential, shares `pnpm-lock.yaml`; integrate 023c before047.
- **Parallel-safe with TIP-030b (coverage-closure manifest):** sequential, shares `pnpm-lock.yaml`; integrate 030b before047.
- **Parallel-safe with TIP-032b (coverage-closure manifest):** sequential, shares `packages/core/package.json`, `pnpm-lock.yaml`; integrate 032b before047.
- **Parallel-safe with TIP-045b (coverage-closure manifest):** sequential, shares `packages/core/package.json`, `pnpm-lock.yaml`; integrate 045b before047.
- **TIP-ID:** TIP-047 · **Project:** AppChat V2 · **Module:** Voice — hạ tầng + Voice AI tự dựng (không DB, không action, không UI) · **Priority:** P0 · **Estimated:** XL (3 pha: P1 package + LiveKit · P2 Voice AI local · P3 infra)
- **Depends on:** 032e và mọi TIP chờ cũ có chung file (dòng khai hai phía ở trên) — trước 047b, 047c, 047d, 044, 045, 046.
- **Vì sao phụ thuộc:**
  - D61 #13: Gọi điện xếp sau 032e. Bốn lớp ghép tuần tự theo ranh giới sync wD:pD: voice + infra → schema → action → FE.
  - 047 không đụng DB / action / UI nên dựng song song được trên worktree riêng.
  - Phải ghép sau khi chuỗi PR hiện tại đã merge, vì `.dependency-cruiser.cjs`, `pnpm-lock.yaml` và `packages/core/package.json` là file dùng chung.
- **Files touched:** [exact M/C manifest](manifests/TIP-047-files.md). Package mới `packages/voice` theo khuôn `packages/integrations`; thư mục mới `infra/livekit/`. Không sửa `infra/security/ufw.rules` của TIP-045 (luật thoại nằm ở `infra/livekit/ufw-voice.rules`, 045 nạp nếu có).
- **Quyết định nguồn:** D61 (#1, #2, #12) · DC-906 · **DC-907** (Voice AI tự dựng) · **DC-909** (một App Zalo chung kênh OA + ZCC, token OA ở kho chung — sửa 2026-11-14) · DV-901 · **DV-902** · Blueprint §1.1, §6b, §8, §11.1.
- **Dòng COVERAGE nhận:** REQ-O01 · REQ-O08 (port + bộ cài local) · D61-voice-infra · D61-voice-ai-engine · DC-906 · DC-907 · DV-901 · DV-902 · BP-6b-voice · BP-11-voice.

## CONTEXT
- **Working dir:** `D:/CODING/AppChat_Ver2` (code); tài liệu nằm ở repo này.
- **Stack:** pnpm monorepo, NestJS. Package nội bộ export thẳng `src/index.ts` (không build). Kiểm hướng import bằng dependency-cruiser. Không Docker (D12, D20).
- **Hiện trạng (rà 2026-11-13, `origin/dev` + chuỗi #202 → #206):**
  - Chưa có `packages/voice`, chưa có `infra/livekit`. `infra/` hiện chỉ có `infra/parser/`; TIP-045 sẽ dựng phần còn lại (PM2, systemd hạ tầng, nginx, `infra/security/ufw.rules`, `infra/versions.lock.json`).
  - Khuôn package mẫu: `packages/integrations` gồm `package.json` (main `./src/index.ts`, script `lint` / `typecheck` / `test`), `tsconfig.json` extends base, `vitest.config.ts` (oxc decorators), `eslint.config.mjs`.
  - `pnpm-workspace.yaml` đã có glob `packages/*`, không phải sửa.
  - `.dependency-cruiser.cjs`:
    - INTERNAL ở L4.
    - Luật adapter (`ai` / `channels` / `integrations` không import `core`) ở L16–19.
    - Có luật `web-no-backend`.
    - Baseline `.dependency-cruiser-known-violations.json` chạy với `--ignore-known`.
  - AI: không có class AgentGateway. Engine là `AiSdkEngine` (`packages/ai/src/gateway/engine.ts:47`), token `AGENT_ENGINE` (`packages/core/src/ai/ai.module.ts:68`). `voice` không import `core` nên chế độ pipeline nhận engine qua port do 047c tiêm vào.
  - Tài liệu ZCC (Zalo, bản Beta):
    - Trunk `<AppID>.zcc.openapi.zaloapp.com`, UDP/TCP 5060, PCMU / PCMA, không REGISTER (tin theo IP).
    - IP tín hiệu 49.213.78.90–92, TCP 80 / 443 / 5060 / 5061; IP media hỏi Zalo.
    - Gọi vào: `From = UserID`, `To = OA_id + mã luồng 3 số`. Gọi ra: `From = OA_id`, `To = UserID | SĐT`.
    - API yêu cầu / kiểm tra quyền gọi dùng OA Access Token v4.
- **Voice AI tự dựng (DC-907, nguồn kiểm 2026-11-13):**
  - STT: PhoWhisper (VinAI, BSD-3, fine-tune Whisper trên 844 giờ tiếng Việt nhiều giọng miền); có bản ggml cho whisper.cpp. VAD Silero + chạy model qua `sherpa-onnx-node` (addon Node native, có stream).
  - TTS: VieNeu-TTS v3 Turbo (Apache-2.0, 23 giọng có sẵn ba miền, 48 kHz). Server OpenAI-compatible `POST /v1/audio/speech` (pcm / wav, chunked hoặc SSE). CPU (ONNX): tiếng đầu ~140 ms int8 / ~300 ms fp32, 1–2 luồng đồng thời; GPU RTX 3060 ~16 luồng. Không ra 8 / 16 kHz (adapter đổi mẫu).
  - TTS dự phòng: Piper `vi_VN-vais1000-medium` (CC BY 4.0, 22,05 kHz) — có báo lỗi một số giọng Piper tiếng Việt đọc mất dấu thanh, phải thử trước khi dùng.
  - Cấm (phi thương mại): F5-TTS Vietnamese (CC-BY-NC-SA), viXTTS (Coqui CPML), Zipformer-30M-RNNT-6000h (CC-BY-NC-ND).
- **Key files to read first:** DC-906 + DC-907 + DV-901 + DV-902 (`DECISIONS.md`, `DEVIATIONS.md`) · Blueprint §6b · `standards/integrations/provider-ports.md` · `standards/ai/agent-gateway.md` · `packages/integrations/{package.json,src/index.ts,src/registry.ts}` · `.dependency-cruiser.cjs` · `infra/parser/` (script `plan` mặc định, `-Apply`).
- **Patterns to follow:** port + adapter + bộ cài `mock` như `packages/integrations/src/ports/*` (kết nối thật nằm sau cờ env, test mặc định dùng mock). Script infra mặc định `plan`, `apply` phải kiểm trước khi chạy (DC-304).

## APPLICABLE STANDARDS
- [integrations/provider-ports](../standards/integrations/provider-ports.md) — port theo năng lực, adapter không import `core`, bí mật qua env / mã hoá.
- [ai/agent-gateway](../standards/ai/agent-gateway.md) — Voice AI chỉ là một kiểu chạy agent: tool = quyền agent ∩ người ra lệnh, credit qua CreditMeter (047c gọi).
- [ops/observability-security](../standards/ops/observability-security.md) — log không chứa SĐT / nội dung cuộc gọi, secret không vào log, metric có nhãn giới hạn.
- [code/file-size-module-layout](../standards/code/file-size-module-layout.md) · [code/testing](../standards/code/testing.md) · [workflow/git-flow-ci](../standards/workflow/git-flow-ci.md).
- Blueprint §11.1 (topology native) + §11.5 (firewall) — chỉ phần thoại.

## Rà trước khi làm
1. Rebase lên `origin/dev` mới nhất (sau khi chuỗi PR hiện tại đã merge).
   - Chạy `python -X utf8 tools/obligations/manifests.py 047` để thấy giao file.
   - TIP chung `.dependency-cruiser.cjs` / `pnpm-lock.yaml` / `packages/core/package.json` phải tích hợp trước, theo dòng HEADER.
2. Ghim phiên bản `livekit-server`, `livekit-sip`, `livekit-server-sdk`, `@livekit/rtc-node`, `livekit-client` vào bản ổn định mới nhất lúc làm.
   - Ghi vào `infra/livekit/versions.json` và report (DV-901 đã duyệt nhóm thư viện, không duyệt sẵn số phiên bản).
   - Kiểm `@livekit/rtc-node` có binary prebuilt cho win32-x64 (máy dev) và linux-x64 (VPS). Thiếu một trong hai: ghi vào report, đề xuất chạy ghi âm / Voice AI chỉ trên Linux / WSL2, không tự đổi thư viện.
3. Kiểm `livekit-server --dev` chạy được trên Windows (binary chính thức). Kamailio / rtpengine không chạy trên Windows: test SIP cần WSL2 hoặc máy Linux. Thiếu thì ghi "chưa nghiệm thu SIP edge" (Q-903).
4. **Voice AI local (DC-907):**
   - Đọc lại giấy phép model lúc tải (PhoWhisper BSD-3, VieNeu-TTS Apache-2.0, Piper vais1000 CC BY 4.0). Giấy phép đổi sang phi thương mại → dừng, hỏi (escalation L2), không tự thay model khác.
   - Ghim bản model (URL + sha256) vào `infra/livekit/voice-models.json`; ghim `sherpa-onnx-node`, `vieneu` (pip) vào `versions.json` / `voice-tts/requirements.txt`.
   - Kiểm `sherpa-onnx-node` có prebuilt win32-x64 + linux-x64. Thiếu thì STT chạy bằng `whisper.cpp` (binary `whisper-server` HTTP) — ghi report, không tự đổi model.
   - Chọn cỡ PhoWhisper theo đo ở AC9 (bắt đầu từ `small`, thử `medium`), ghi WER trên tập thử và độ trễ.
5. Đọc lại tài liệu ZCC bản mới nhất trên developers.zalo.me: endpoint API yêu cầu / kiểm tra quyền gọi, header chữ ký webhook. Lệch với CONTEXT thì cập nhật DC-906 bằng DC mới (dải số của nhánh), không tự suy.

## TASK
Dựng lớp hạ tầng thoại dùng chung cho Gọi điện (D61), không đụng DB / action / UI:
- **`packages/voice`:** port + adapter cho LiveKit (phòng, token, SIP dispatch, kiểm webhook), Zalo Cloud Connect (yêu cầu / kiểm quyền gọi, kiểm webhook), ghi track audio, `VoiceAiEnginePort` hai chế độ (realtime / pipeline). Mỗi port có bộ cài `mock` tất định để 047c test không cần dịch vụ thật.
- **Voice AI tự dựng (DC-907):** bộ cài `pipeline` mặc định chạy local — VAD + STT PhoWhisper trong process (addon Node), TTS VieNeu-TTS qua dịch vụ `voice-tts`; giới hạn số phiên; đo độ trễ / số phiên đồng thời.
- **`infra/livekit/`:** cấu hình + unit systemd native cho `livekit-server`, `livekit-sip`, Kamailio, rtpengine, **`voice-tts`**; script tải model ghim sha256; luật firewall thoại; script `plan` / `apply`; bản dev Windows chỉ `livekit-server --dev`.
- Cập nhật depcheck (voice là adapter, không import `core`) và dependency của `core`.

## SPECIFICATIONS

### 1. `packages/voice` — khung package
1. Theo khuôn `packages/integrations`:
   - `package.json`: name `@appchat/voice`, main `./src/index.ts`, script `lint` / `typecheck` / `test`.
   - Dependency: `livekit-server-sdk`, `@livekit/rtc-node`, `sherpa-onnx-node` (VAD + STT + Piper — DV-902), `@appchat/shared`, `zod`.
   - `tsconfig.json`, `vitest.config.ts`, `eslint.config.mjs` theo khuôn.
2. **Hướng import:** chỉ `@appchat/shared` (và `@appchat/actions` nếu cần schema). **Không** import `@appchat/core` / `@appchat/db` / `@appchat/ai`.
   - Chế độ pipeline nhận `TurnEngine` (gọi agent) qua tham số khởi tạo. 047c tiêm `AiSdkEngine` + quyền agent ∩ người ra lệnh.
   - depcruise: thêm `voice` vào INTERNAL, vào regex luật adapter (L16–19) và luật `web-no-backend` (web không import voice). `livekit-client` chỉ dùng ở `apps/web` / `apps/widget` (047d).
3. Cấu hình đọc qua `voiceEnv()` (zod):
   - LiveKit: `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_WEBHOOK_KEY` (mặc định = API key).
   - SIP edge: `VOICE_SIP_EDGE_HOST`, `VOICE_PUBLIC_IP`.
   - ZCC: `ZALO_APP_ID`, `ZALO_APP_SECRET` (một App Zalo dùng chung kênh Zalo OA và ZCC — DC-909; TIP-048 thêm khối biến này vào `.env.example`, 047 chỉ đọc), `ZCC_BILLING` (`oa` | `app`, mặc định `oa` — DC-904 f).
   - Voice AI: `VOICE_AI_ENGINE` (`mock` | `pipeline` | `realtime`; mặc định `mock` ở dev / test, production đặt `pipeline` — DC-907), `VOICE_STT_PROVIDER` (`local` | `mock`), `VOICE_TTS_PROVIDER` (`local` | `piper` | `mock`), `VOICE_STT_MODEL_DIR`, `VOICE_TTS_URL` (mặc định `http://127.0.0.1:8090`), `VOICE_TTS_VOICE` (một trong 23 giọng có sẵn), `VOICE_AI_MAX_SESSIONS` (mặc định 2), `VOICE_REALTIME_PROVIDER` (`openai` | `gemini`, chỉ khi `realtime`).
   - Thiếu biến bắt buộc ở chế độ thật → lỗi khởi tạo có mã (`VOICE_CONFIG_MISSING`), không chạy ngầm.
   - Secret không bao giờ xuất hiện trong log / lỗi trả ra.

### 2. Port (`packages/voice/src/ports/*.ts`, interface ở Blueprint §6b)
| Port | Hàm | Ghi chú |
|---|---|---|
| `LiveKitRoomPort` | `createRoom(name, opts)` · `deleteRoom(name)` · `token(room, identity, grants, ttlSec)` · `listParticipants(room)` · `removeParticipant(room, identity)` · `muteTrack(...)` | Tên phòng `ws_<workspace>_call_<callId>` (hàm `roomName()` thuần, có test). Token TTL mặc định 10 phút, quyền tối thiểu: agent publish + subscribe, monitor `listen` chỉ subscribe, `whisper` publish tới agent. Widget: token khách riêng, phòng riêng của cuộc |
| `SipDispatchPort` | `dialOut(req)` (trunk, số đích E.164 / UserID ZCC, caller id, room) · `transfer(participant, target)` · `hangup(participant)` · `sendDtmf(...)` | Gói `livekit-server-sdk` SipClient (CreateSIPParticipant / TransferSIPParticipant). Trunk / dispatch rule tạo bằng `ensureTrunk(line)` idempotent theo `line_id` (047c gọi lúc lưu `call_line`) |
| `LiveKitWebhookVerifier` | `verify(rawBody, authHeader) → LiveKitEvent` | Kiểm JWT webhook (sha256 body) bằng `WebhookReceiver`. Trả `{ id, event, room, participant?, track?, createdAt }`. `id` là khoá biên nhận (DC-904 a). Sai chữ ký → `VOICE_WEBHOOK_INVALID` |
| `ZccClient` | `requestConsent(oa, to, reason)` · `checkConsent(oa, to)` · `verifyWebhook(raw, headers)` | OA Access Token v4 do caller truyền vào (token OA ở kho `oauth_grant` của TIP-048, 047c đọc qua `TokenVault.access` — DC-909; voice không lưu, không làm mới token). Lỗi Zalo ánh xạ: `ZCC_NOT_ENTERPRISE`, `ZCC_PERMISSION_DENIED`, `ZCC_QUOTA`, `ZCC_UNAVAILABLE`. Trả `cost` (VND, chuỗi) nếu API có, không có thì `null` |
| `TrackRecorder` | `start(room, opts) → RecordingHandle` · `stop(handle) → { bytes: Uint8Array, durationMs, codec: 'opus', container: 'ogg' }` | `@livekit/rtc-node`: subscribe audio của mọi participant, trộn mono 16 kHz hoặc giữ 2 kênh (khách / nhân viên — tham số, mặc định 2 kênh cho transcript theo người nói). Giới hạn 4 giờ / file, quá thì cắt đoạn. Không ghi đĩa ngoài thư mục tạm của tiến trình; 047c lưu qua FilesService |
| `VoiceAiEnginePort` | `start(init) → VoiceSession` (`on('turn', …)`, `on('handoff', …)`, `stop()`) | Hai bộ cài theo §3. `init`: room, agentId, locale `vi-VN`, system prompt, tools (đã lọc quyền ở 047c), giới hạn lượt, ngưỡng tin cậy |

- Mỗi port có `Mock*` trong `src/mock/*.ts`:
  - Tất định, ghi lại lệnh để test so khớp.
  - Mock webhook sinh sự kiện có `id` cố định để test gửi lặp / sai thứ tự.
  - `MockVoiceAi` chạy kịch bản JSON (lượt khách → lượt AI / gọi tool / handoff).
- `src/index.ts` export port, adapter, mock, `roomName`, `voiceEnv`, kiểu sự kiện. Không export đối tượng đã khởi tạo sẵn.

### 3. Voice AI (D61 #12, DC-906 a)
1. **`pipeline` (mặc định production — DC-907):** VAD → STT (`SttPort`) → `TurnEngine.reply(text, ctx)` (047c tiêm `AiSdkEngine`) → TTS (`TtsPort`) → phát vào phòng LiveKit.
   - **VAD + ngắt lời:** Silero VAD (`sherpa-onnx-node`) trên track khách, khung 30 ms. Khách ngừng nói ≥ 600 ms → chốt lượt. Khách nói khi AI đang phát → dừng phát ngay (barge-in), huỷ phần TTS còn lại.
   - **STT local** (`ai/stt-local.ts`): PhoWhisper chạy qua `sherpa-onnx-node` (hoặc `whisper.cpp` server nếu thiếu prebuilt — Rà #4). Âm 8 kHz (PCMU / PCMA) / 48 kHz (WebRTC) đổi mẫu về 16 kHz mono. Trả `{ text, confidence, durationMs }`; `confidence` thấp → `TurnEngine` có thể hỏi lại hoặc handoff.
   - **TTS local** (`ai/tts-vieneu.ts`): gọi `voice-tts` `POST /v1/audio/speech` (`response_format: pcm`, stream chunked), câu đầu phát ngay khi có chunk đầu; đổi mẫu 48 kHz → mẫu của phòng. Tách câu theo dấu câu để phát sớm. `ai/tts-piper.ts` là dự phòng nhẹ (`VOICE_TTS_PROVIDER=piper`).
   - **Giới hạn phiên:** `VOICE_AI_MAX_SESSIONS` (semaphore trong process). Hết chỗ → `start()` ném `VOICE_AI_BUSY` (047c chuyển người / lời nhắn, không xếp hàng chờ AI).
   - **Chỉ giọng có sẵn:** không có API nhân bản giọng; `VOICE_TTS_VOICE` phải thuộc danh sách giọng có sẵn (kiểm lúc khởi động).
2. **`realtime` (tuỳ chọn, cần key):** adapter OpenAI Realtime (WebSocket) và Gemini Live, nối audio track LiveKit ↔ provider (PCM 16 / 24 kHz đổi mẫu trong adapter), barge-in theo provider. Không bắt buộc cho phát hành.
   - Tool call (cả hai chế độ) map sang `ToolCall { name, args }` trả cho 047c thực thi qua Executor. Voice không tự gọi action.
3. **Sự kiện chung của phiên:**
   - `turn { idx, speaker, text, startedMs, endedMs, latencyMs, usage: { kind: 'voice_realtime' | 'stt' | 'tts' | 'llm', provider, model, units } }` (`provider: 'local'` cho STT / TTS tự dựng; `latencyMs` = khách ngừng nói → tiếng đầu của AI, để đo). `idx` tăng dần, không lặp, để 047c trừ credit idempotent theo `callId:turnIdx`.
   - `handoff { reason: 'low_confidence' | 'customer_request' | 'credit_exhausted' | 'tool_denied' | 'error' }`.
   - `ended`.
4. **Giới hạn:** tối đa 30 phút / phiên AI và 200 lượt; quá thì `handoff` lý do `error`, không cắt cuộc gọi. Mất kết nối provider → `handoff` trong ≤ 3 giây.

### 4. `infra/livekit/` (DC-906 b, c)
1. **Cấu hình mẫu:**
   - `livekit.yaml`: cổng WebRTC UDP, TURN/TLS, Redis DB riêng `VOICE_REDIS_DB`, webhook về `https://<api>/hooks/livekit`, key qua env.
   - `sip.yaml`: livekit-sip.
   - `kamailio.cfg`: trunk ZCC + nhà mạng; nhận REGISTER TLS của hộp SIM; đọc `Diversion` / `History-Info`; chuyển tiếp tới livekit-sip.
   - `rtpengine.conf`: dải cổng RTP.
2. **Unit systemd:** `livekit-server.service`, `livekit-sip.service`, `kamailio.service`, `rtpengine.service`, **`voice-tts.service`** (VieNeu-TTS trong venv Python ghim phiên bản `voice-tts/requirements.txt`, nghe `127.0.0.1:8090`, không mở ra ngoài) — `User` riêng, `CPUQuota`, `MemoryMax`, `Restart=on-failure`, log journald.
   - **Model:** `scripts/voice-models.sh` tải model theo `voice-models.json` (URL + sha256 bắt buộc, sai → dừng) vào `/var/lib/appchat/voice-models`; mặc định `plan`, tải thật khi `--apply`. Model không commit vào git.
3. **Firewall:** `ufw-voice.rules` mở 5060/udp-tcp, 5061/tcp (TLS), dải RTP, cổng WebRTC UDP + TURN của LiveKit. Nguồn tín hiệu ZCC giới hạn 49.213.78.90–92. TIP-045 nạp file này khi có (ghi trong report 045 — không sửa 045 ở đây).
4. **Script:**
   - `scripts/voice-plan.sh`: in thay đổi, không ghi. Đây là mặc định.
   - `scripts/voice-apply.sh`: cài binary theo `versions.json` (sha256 bắt buộc), render config từ env, `systemctl enable --now`. Chỉ chạy khi có `--apply` + kiểm sha256 + preflight cổng.
   - `scripts/dev-livekit.ps1`: Windows dev, chạy `livekit-server --dev` với key dev cố định, không cài dịch vụ.
5. **`versions.json`:** phiên bản + sha256 của từng binary, ghim ở bước Rà #2. **`voice-models.json`:** model PhoWhisper (cỡ chọn ở Rà #4), Silero VAD, VieNeu-TTS v3 Turbo, Piper vais1000 — URL, sha256, giấy phép.
6. **`README.md`:** sơ đồ cổng, yêu cầu IP tĩnh (Q-903), cách thử bằng SIPp, giới hạn Windows.
7. **Test cấu hình:** `infra/livekit/tests/config.test.mjs` (`node --test`). Kiểm:
   - Mọi biến `${...}` trong config đều có trong `.env.example` phần voice.
   - Unit có `CPUQuota` / `MemoryMax`.
   - Script mặc định không ghi.
   - `versions.json` + `voice-models.json` đủ sha256; mỗi model có trường `license` thuộc danh sách cho phép (BSD-3 / Apache-2.0 / MIT / CC-BY-4.0), test chặn giấy phép NC.

### 5. Env, depcheck, wiring
- `.env.example` thêm khối "Voice (D61)" với các biến §1.3. Giá trị trống, `VOICE_AI_ENGINE=mock`.
- `packages/core/package.json` thêm `@appchat/voice: workspace:*`. 047 chỉ khai dependency, chưa import (047c mới dùng). Có ghi dòng depcheck trong report.
- `pnpm-lock.yaml` cập nhật theo `pnpm install`.

### 6. Lỗi
- Mã lỗi voice nằm trong `packages/voice/src/errors.ts`: `VOICE_CONFIG_MISSING`, `VOICE_WEBHOOK_INVALID`, `VOICE_ROOM_FAILED`, `VOICE_SIP_FAILED`, `ZCC_*` (§2), `VOICE_AI_UNAVAILABLE`, `VOICE_AI_BUSY` (hết chỗ phiên), `VOICE_MODEL_MISSING` (chưa tải / sai sha256).
- 047c ánh xạ sang envelope API: 400 / 401 webhook, 502 provider, 503 không cấu hình. Message không chứa SĐT / token.

## ACCEPTANCE CRITERIA
| AC | Given / When / Then | Evidence |
|---|---|---|
| 1 | Given repo sạch, when `pnpm --filter @appchat/voice lint typecheck test`, then xanh; `pnpm depcheck` không vi phạm mới; voice không import core / db / ai | output lệnh + depcruise |
| 2 | Given `LiveKitWebhookVerifier` + body thật mẫu của LiveKit (fixture), when chữ ký đúng / sai / body sửa 1 byte, then trả sự kiện có `id` / ném `VOICE_WEBHOOK_INVALID` / ném lỗi | `voice/test/webhook.test.ts` |
| 3 | Given `roomName(ws, callId)` + `token()` grants theo vai trò (agent / monitor listen / whisper / khách widget), when giải JWT, then đúng phòng, đúng quyền publish / subscribe, TTL ≤ 10 phút | `voice/test/livekit-room.test.ts` |
| 4 | Given `ZccClient` với HTTP giả lập (nock / server tạm), when yêu cầu quyền gọi thành công / OA không phải Doanh nghiệp / hết hạn mức / Zalo 5xx, then trả `ConsentRef` + `cost` / `ZCC_NOT_ENTERPRISE` / `ZCC_QUOTA` / `ZCC_UNAVAILABLE`; token không lọt vào lỗi | `voice/test/zcc-client.test.ts` |
| 5 | Given `MockVoiceAi` kịch bản 3 lượt + 1 tool + handoff, when chạy, then `turn.idx` 0..n không lặp, `usage` đủ kind, `handoff` đúng lý do; mất kết nối provider giả → handoff ≤ 3 giây | `voice/test/voice-ai.test.ts` |
| 6 | Given `livekit-server --dev` chạy local (Windows hoặc Linux), when test tích hợp tạo phòng → token → `TrackRecorder` ghi 5 giây tiếng mẫu từ participant giả (`@livekit/rtc-node`), then file opus/ogg đọc được, thời lượng ±200 ms | `voice/test/livekit.live.test.ts` (bỏ qua có ghi lý do khi không có server; chạy được thì dán output) |
| 7 | Given `infra/livekit`, when `node --test infra/livekit/tests` + `bash infra/livekit/scripts/voice-plan.sh`, then config đủ biến, unit có giới hạn, plan không ghi gì; `voice-apply.sh` thiếu `--apply` hoặc sha256 sai → thoát mã ≠ 0 | output test + plan |
| 8 | Given máy Linux / WSL2 có Kamailio + rtpengine + livekit-sip (khi có Q-903), when SIPp gọi vào trunk giả, then cuộc vào phòng LiveKit, webhook `participant_joined` về API giả; không có máy thì ghi "chưa nghiệm thu SIP edge (Q-903)" | log SIPp hoặc dòng ghi trung thực |
| 9 | Given model đã tải (`voice-models.sh --apply`) + `voice-tts` chạy local, when chạy `test/pipeline.local.test.ts` với 20 câu thoại tiếng Việt mẫu (16 kHz và bản 8 kHz μ-law), then STT trả chữ có dấu, WER ghi lại cho từng cỡ PhoWhisper; TTS stream chunk đầu; khách nói chen → dừng phát ≤ 300 ms; báo cáo p50 / p95 `latencyMs` (mục tiêu ≤ 2,5 giây, không đạt thì ghi số đo + đề xuất GPU / realtime, không báo PASS giả) | `voice/test/pipeline.local.test.ts` + bảng đo trong report |
| 10 | Given `VOICE_AI_MAX_SESSIONS=2`, when mở phiên thứ 3, then `VOICE_AI_BUSY`; đo CPU / RAM khi chạy đủ 2 phiên song song trên máy dev và ghi số phiên đề xuất cho VPS | `voice/test/voice-ai.test.ts` (giới hạn) + số đo trong report |

### Commands / evidence gate
- Cổng commit (D59): `pnpm --filter @appchat/voice lint typecheck test` · `pnpm depcheck` · `pnpm lint:size`.
- Chạy với LiveKit thật: `pwsh infra/livekit/scripts/dev-livekit.ps1` (hoặc `livekit-server --dev`), rồi `pnpm --filter @appchat/voice test -- test/livekit.live.test.ts`.
- Infra: `node --test infra/livekit/tests` · `bash infra/livekit/scripts/voice-plan.sh` · `bash infra/livekit/scripts/voice-models.sh` (plan).
- Voice AI local: `bash infra/livekit/scripts/voice-models.sh --apply --dir .data/voice-models` → chạy `voice-tts` (`python -m venv` theo `infra/livekit/voice-tts/README.md`) → `pnpm --filter @appchat/voice test -- test/pipeline.local.test.ts`.
- Thiếu tài nguyên (Q-902 ZCC thật, Q-903 máy Linux IP tĩnh): ghi "chưa nghiệm thu với provider thật" từng ô. Voice AI không cần key (DC-907); chế độ `realtime` không bắt buộc.

## CONSTRAINTS
- **DO NOT:**
  - Dùng Docker / `livekit-egress` (D12, D20, D61 #1).
  - Import `@appchat/core` / `@appchat/db` / `@appchat/ai` từ `packages/voice`.
  - Đụng DB, migration, action, UI, `apps/*` (thuộc 047b / 047c / 047d).
  - Ghi secret / SĐT / nội dung cuộc gọi vào log.
  - Sửa `infra/security/ufw.rules` hay file khác của TIP-045.
  - Dùng model / thư viện giấy phép phi thương mại (F5-TTS Vietnamese, viXTTS, Zipformer-30M-RNNT-6000h…) hoặc nhân bản giọng người thật (DC-907).
  - Nhúng Python vào process Node; `voice-tts` chỉ là dịch vụ HTTP nội bộ `127.0.0.1`.
  - Commit file model vào git.
  - Thêm G.729 (livekit-sip không hỗ trợ — PD-902).
- **REUSE:**
  - Khuôn `packages/integrations` (package, port + mock, registry).
  - `AppError` / mã lỗi của `@appchat/shared`.
  - Mẫu script `plan` / `apply` của `infra/parser`.
- **SKIP:**
  - Lưu ghi âm, credit, consent, định tuyến, webhook controller (047c).
  - Bảng dữ liệu (047b).
  - WebPhone / widget (047d).
  - Softphone / IP Phone / Mobile app, auto-dialer (D61 Sắp có).
  - Adapter STT / TTS của nhà cung cấp trả phí (FPT.AI / Viettel AI…) — chỉ khi DC mới yêu cầu.

## Quality Gate
- [x] Manifest chính xác (file-level M/C). Giao file với TIP khác khai hai phía bằng `manifests.py --sync 047 047b 047c 047d`; `--check` / `--order` không thêm lỗi.
- [x] Port khớp Blueprint §6b + DC-906. Voice không import core (provider-ports). Pipeline nhận engine qua port.
- [x] 10 AC có Given/When/Then + bằng chứng; ô thiếu tài nguyên ghi trung thực (Q-902 / 903); Voice AI đo thật (AC9–10), không báo PASS khi chưa đạt mục tiêu.
- [x] Không đụng file của 045 (luật firewall riêng, 045 nạp).
- **Gap đã khai:**
  - Prebuilt `@livekit/rtc-node` trên Windows phải kiểm lúc làm (Rà #2).
  - SIP edge chỉ nghiệm thu được trên Linux.
  - Endpoint API ZCC có thể đổi (bản Beta) → Rà #5.
  - Độ trễ / số phiên Voice AI trên CPU là ước tính (DC-907 b) — đo ở AC9–10; âm điện thoại 8 kHz làm STT kém hơn, phải thử bằng cuộc gọi thật khi có Q-903 / Q-904.

## ⚠️ BUILDER-CHECKLIST (agent PHẢI hoàn thành trước khi báo DONE)
- [ ] Implement đúng `Files touched` (manifest), không thêm file ngoài scope. File mới trong giới hạn 200–400 dòng (BE), trần 600.
- [ ] AC 1–10 có kết quả từng cái (PASS / bỏ qua kèm lý do tài nguyên), dán output thật; không "pass" chung chung. AC9–10 kèm bảng số đo.
- [ ] **Adapter không import core (BUILDER-HANDOFF, provider-ports):** depcruise xanh với luật mới cho `voice`.
- [ ] **Không Docker, native systemd (D12 / D20):** script mặc định `plan`, `apply` có kiểm sha256 + preflight.
- [ ] **Bí mật / PII:** không log key, token OA, SĐT, transcript; lỗi trả ra không chứa dữ liệu nhạy cảm.
- [ ] **Giấy phép model (DC-907):** mọi model trong `voice-models.json` có giấy phép thương mại, test chặn NC xanh; không nhân bản giọng.
- [ ] Không báo DONE nếu test chưa chạy. `git status --short` sạch, báo kèm Git SHA (`git rev-parse --short HEAD`).
