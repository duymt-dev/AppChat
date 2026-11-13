# TIP-047 — exact file manifest

M = sửa, C = tạo mới. Không dùng wildcard thư mục; test liệt kê từng file. `packages/voice` theo khuôn `packages/integrations`. Không chạm `infra/security/ufw.rules` (TIP-045): luật thoại nằm ở file riêng.

| Mode | Exact file | Responsibility |
|---|---|---|
| C | `packages/voice/package.json` | `@appchat/voice` (main `./src/index.ts`), dependency `livekit-server-sdk`, `@livekit/rtc-node`, `@appchat/shared`, `zod`; script lint / typecheck / test |
| C | `packages/voice/tsconfig.json` | Extends base như `packages/integrations` |
| C | `packages/voice/vitest.config.ts` | Vitest oxc như `packages/integrations` |
| C | `packages/voice/eslint.config.mjs` | ESLint package như `packages/integrations` |
| C | `packages/voice/src/index.ts` | Export port, adapter, mock, `roomName`, `voiceEnv`, kiểu sự kiện, mã lỗi |
| C | `packages/voice/src/env.ts` | `voiceEnv()` zod: LIVEKIT_* · VOICE_* · ZCC_* (§1.3) |
| C | `packages/voice/src/errors.ts` | `VOICE_CONFIG_MISSING`, `VOICE_WEBHOOK_INVALID`, `VOICE_ROOM_FAILED`, `VOICE_SIP_FAILED`, `ZCC_*`, `VOICE_AI_UNAVAILABLE` |
| C | `packages/voice/src/types.ts` | `LiveKitEvent`, `SipDialRequest`, `ConsentRef` / `ConsentState`, `VoiceTurn`, `VoiceHandoff`, `Grants` |
| C | `packages/voice/src/room-name.ts` | `roomName(ws, callId)` thuần |
| C | `packages/voice/src/ports/livekit-room.ts` | Interface `LiveKitRoomPort` |
| C | `packages/voice/src/ports/sip-dispatch.ts` | Interface `SipDispatchPort` + `ensureTrunk` |
| C | `packages/voice/src/ports/zcc-client.ts` | Interface `ZccClient` |
| C | `packages/voice/src/ports/track-recorder.ts` | Interface `TrackRecorder` |
| C | `packages/voice/src/ports/voice-ai.ts` | Interface `VoiceAiEnginePort`, `VoiceSession`, `TurnEngine`, `SttPort`, `TtsPort` |
| C | `packages/voice/src/livekit/room.adapter.ts` | `livekit-server-sdk` RoomServiceClient + AccessToken (grants theo vai trò) |
| C | `packages/voice/src/livekit/sip.adapter.ts` | SipClient: trunk / dispatch rule idempotent, dial out, transfer, hangup, DTMF |
| C | `packages/voice/src/livekit/webhook.ts` | `LiveKitWebhookVerifier` (WebhookReceiver, sha256 body) |
| C | `packages/voice/src/livekit/recorder.ts` | `TrackRecorder` bằng `@livekit/rtc-node`: subscribe audio, opus / ogg, 2 kênh, cắt 4 giờ |
| C | `packages/voice/src/zcc/client.ts` | ZCC: gửi / kiểm yêu cầu quyền gọi (OA token v4), ánh xạ lỗi, `cost` |
| C | `packages/voice/src/zcc/webhook.ts` | Kiểm chữ ký webhook ZCC |
| C | `packages/voice/src/ai/realtime.engine.ts` | Bộ cài `realtime`: OpenAI Realtime / Gemini Live ↔ track LiveKit, barge-in, tool call |
| C | `packages/voice/src/ai/pipeline.engine.ts` | Bộ cài `pipeline`: STT → `TurnEngine` → TTS |
| C | `packages/voice/src/ai/session.ts` | Vòng đời phiên dùng chung: `turn.idx`, giới hạn 30 phút / 200 lượt, handoff ≤ 3 giây |
| C | `packages/voice/src/ai/factory.ts` | Chọn bộ cài theo `VOICE_AI_ENGINE` (mặc định mock) |
| C | `packages/voice/src/mock/livekit.mock.ts` | `MockLiveKitRoom`, `MockSipDispatch`, `MockLiveKitWebhook` (id cố định) |
| C | `packages/voice/src/mock/zcc.mock.ts` | `MockZccClient` |
| C | `packages/voice/src/mock/recorder.mock.ts` | `MockTrackRecorder` (ogg mẫu tất định) |
| C | `packages/voice/src/mock/voice-ai.mock.ts` | `MockVoiceAi` chạy kịch bản JSON |
| C | `packages/voice/test/webhook.test.ts` | AC2 chữ ký LiveKit đúng / sai / sửa body |
| C | `packages/voice/test/livekit-room.test.ts` | AC3 `roomName` + grants theo vai trò + TTL |
| C | `packages/voice/test/zcc-client.test.ts` | AC4 yêu cầu / kiểm quyền gọi + ánh xạ lỗi, token không lọt |
| C | `packages/voice/test/voice-ai.test.ts` | AC5 kịch bản mock: idx, usage, handoff, mất kết nối |
| C | `packages/voice/test/livekit.live.test.ts` | AC6 với `livekit-server --dev` (bỏ qua có lý do khi không có server) |
| C | `packages/voice/test/fixtures/livekit-webhook.json` | Body webhook mẫu + chữ ký |
| C | `packages/voice/test/fixtures/voice-ai-script.json` | Kịch bản 3 lượt + tool + handoff |
| C | `infra/livekit/README.md` | Sơ đồ cổng, IP tĩnh (Q-903), SIPp, giới hạn Windows |
| C | `infra/livekit/versions.json` | Phiên bản + sha256 livekit-server / livekit-sip / kamailio / rtpengine |
| C | `infra/livekit/livekit.yaml` | Cấu hình livekit-server (WebRTC UDP, TURN/TLS, Redis DB riêng, webhook) |
| C | `infra/livekit/sip.yaml` | Cấu hình livekit-sip |
| C | `infra/livekit/kamailio.cfg` | SIP edge: trunk ZCC / nhà mạng, REGISTER TLS hộp SIM, Diversion / History-Info |
| C | `infra/livekit/rtpengine.conf` | Dải cổng RTP |
| C | `infra/livekit/ufw-voice.rules` | Mở 5060 / 5061 / RTP / WebRTC UDP + TURN; nguồn tín hiệu ZCC 49.213.78.90–92 |
| C | `infra/livekit/systemd/livekit-server.service` | Unit native, user riêng, CPUQuota / MemoryMax |
| C | `infra/livekit/systemd/livekit-sip.service` | Như trên |
| C | `infra/livekit/systemd/kamailio.service` | Như trên |
| C | `infra/livekit/systemd/rtpengine.service` | Như trên |
| C | `infra/livekit/scripts/voice-plan.sh` | In thay đổi (mặc định, không ghi) |
| C | `infra/livekit/scripts/voice-apply.sh` | Cài theo `versions.json` (sha256), render config, enable — chỉ khi `--apply` + preflight |
| C | `infra/livekit/scripts/dev-livekit.ps1` | Windows dev: `livekit-server --dev` key cố định |
| C | `infra/livekit/tests/config.test.mjs` | AC7 biến config ↔ `.env.example`, giới hạn unit, plan không ghi, sha256 đủ |
| M | `.env.example` | Khối "Voice (D61)" (giá trị trống, `VOICE_AI_ENGINE=mock`) |
| M | `.dependency-cruiser.cjs` | `voice` vào INTERNAL + luật adapter không import core + `web-no-backend` |
| M | `packages/core/package.json` | Dependency `@appchat/voice: workspace:*` (047c dùng) |
| M | `pnpm-lock.yaml` | Cập nhật theo `pnpm install` |
