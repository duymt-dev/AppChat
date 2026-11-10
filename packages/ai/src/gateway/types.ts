// Agent Gateway (Blueprint §5.1, agent-gateway §1–§6): interface engine + tool + sự kiện run. Core chỉ thấy các kiểu này —
// không import `ai` / `@ai-sdk/*`. Tool = action (origin 'action') hoặc meta-tool / tool phối hợp; logic nghiệp vụ không nằm trong tool.
import type { ActionPreview } from '@appchat/actions';
import type { AttemptInfo, AttemptOutcome } from './attempts';

export type { AttemptInfo, AttemptOutcome } from './attempts';

/** Tin nhắn theo định dạng AI SDK (`ModelMessage`) — lưu nguyên trong `ai_run.state` (jsonb). */
export type RunMessage = Record<string, unknown> & { role: 'system' | 'user' | 'assistant' | 'tool' };

export type JsonSchema = Record<string, unknown>;

export type ToolOutcome =
  | { kind: 'ok'; output: unknown }
  /** `canonicalInput`: input đã chuẩn hoá (mã → id) mà token gắn — xác nhận phải chạy đúng input này (TIP-023b R1.6). */
  | { kind: 'needs_confirmation'; preview: ActionPreview; confirmToken: string; canonicalInput?: unknown }
  | { kind: 'needs_approval'; approvalId: string }
  /** Run con đang chờ (duyệt / thao tác / usage — TIP-019b §4.3): run cha dừng chờ, không coi là xong, chạy tiếp khi con kết thúc. */
  | { kind: 'waiting_child'; runId: string }
  /** Việc nền đã nhận (202 `job_accepted`, TIP-032b): CHƯA xong — model chỉ báo đang chạy + handle; bước cần kết quả cuối không được mở. */
  | { kind: 'job_accepted'; jobId: string; actionLogId: string; statusUrl: string }
  /** Thao tác nền tảng đã commit, phần workspace chưa áp xong (202 `operation_pending`, TIP-045b): CHƯA thành công — hệ thống tự hoàn tất. */
  | { kind: 'operation_pending'; operationId: string; actionLogId: string; statusUrl: string }
  | { kind: 'error'; code: string; message: string };

export interface ToolSpec {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  origin: 'action' | 'meta' | 'external';
  execute(input: unknown, meta: { stepIdx: number; toolCallId: string }): Promise<ToolOutcome>;
}

export type AiTier = 'standard' | 'advanced' | 'max';
export type ModelPurpose = 'chat' | 'embed' | 'rerank';

/** Một model ứng viên do router chọn — `model` là LanguageModel của AI SDK (kiểu mờ với core). */
export interface ModelCandidate {
  provider: string;
  model: string;
  /** LanguageModel (AI SDK) — chỉ engine trong gói này dùng. */
  handle: unknown;
  /** Thế hệ cấu hình opaque của route đã chọn (TIP-023e §1.2) — route có, provider không → vẫn route's; cả hai vắng → undefined.
   *  Dùng để ghim `embedding_space` của một generation vào đúng cấu hình đã phục vụ nó (023e §1.6), không suy luận ngầm. */
  configRevision?: string;
}

export interface ModelSource {
  candidates(tier: AiTier, purpose: ModelPurpose, needs: { tools: boolean }): Promise<ModelCandidate[]>;
}

export interface ToolCallRef {
  toolCallId: string;
  toolName: string;
  input: unknown;
}

/** Trạng thái lưu khi run dừng chờ người — đủ để chạy tiếp ở process khác (không giữ RAM). */
export interface PausedState {
  /** Tới hết tin assistant có các tool call của bước đang dừng. */
  messages: RunMessage[];
  /** Kết quả các tool cùng bước đã chạy trước tool đang chờ (phần `tool-result`). */
  results: Record<string, unknown>[];
  pendingToolCall: ToolCallRef;
  /** Tool cùng bước, sau tool đang chờ — chưa chạy (trả `skipped` khi chạy tiếp). */
  skipped: ToolCallRef[];
  stepIdx: number;
  /** Input chuẩn hoá của lời gọi đang chờ xác nhận — lưu cùng run, không phụ thuộc RAM (chạy tiếp ở process khác). */
  canonicalInput?: unknown;
}

export interface UsageInfo {
  stepIdx: number;
  provider: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
}

export interface RunHooks {
  /** Trước mỗi bước LLM (huỷ / workspace mở) — ném lỗi thì run dừng. */
  beforeStep?(stepIdx: number): Promise<void>;
  /** Sau mỗi bước LLM (cách cũ — khi không khai `afterAttempt`): trừ credit → trả số credit của bước. */
  onUsage?(u: UsageInfo): Promise<{ credits: number }>;
  /**
   * TIP-019b: NGAY trước mỗi lời gọi thật (mỗi ứng viên): nhận chỗ của gốc + kiểm ví + chụp giá + ghi biên nhận. Ném → không gọi,
   * run dừng (`code` của lỗi). `bytes` = kích thước request (đã kiểm trần).
   */
  beforeAttempt?(a: AttemptInfo, bytes: number): Promise<void>;
  /** TIP-019b: sau mỗi lời gọi thật — ghi kết quả (usage / bị từ chối / không rõ) + quyết toán; trả credit đã tính (0 nếu không usage). */
  afterAttempt?(a: AttemptInfo, outcome: AttemptOutcome): Promise<{ credits: number }>;
  /** TIP-019b: trước MỖI tool (kể cả meta) — kiểm lại ví / ngân sách gốc / huỷ. Ném → bỏ tool chưa chạy, run dừng. */
  beforeTool?(stepIdx: number, toolName: string): Promise<void>;
}

export interface RunRequest {
  runId: string;
  workspaceId: string;
  system: string;
  messages: RunMessage[];
  tools: ToolSpec[];
  tier: AiTier;
  /** Mặc định 8 (agent), 16 (Trợ lý). */
  maxSteps: number;
  budget: { maxCredits: number; spent?: number };
  /** Chạy tiếp sau khi dừng: bước bắt đầu. */
  startStep?: number;
  /** Trần chữ ra mỗi lời gọi (mặc định 2048, tối đa 8192 — TIP-019b §1.4). */
  maxOutputTokens?: number;
  hooks?: RunHooks;
}

export type StopReason = 'stop' | 'max_steps' | 'loop_guard' | 'budget' | 'cancelled';

export type RunEvent =
  | { type: 'delta'; stepIdx: number; text: string }
  /** Input tool đang đến dần (chưa kiểm, chưa chạy) — chỉ để dựng khung xương GenUI; không bao giờ là lệnh. */
  | { type: 'tool_input'; stepIdx: number; toolCallId: string; toolName: string; delta: string }
  | { type: 'tool_call'; stepIdx: number; call: ToolCallRef }
  | { type: 'tool_result'; stepIdx: number; call: ToolCallRef; outcome: ToolOutcome; latencyMs: number }
  | { type: 'usage'; usage: UsageInfo; credits: number }
  | { type: 'paused'; state: PausedState; outcome: Extract<ToolOutcome, { kind: 'needs_confirmation' | 'needs_approval' | 'waiting_child' }> }
  | { type: 'finish'; reason: StopReason; text: string; messages: RunMessage[]; steps: number }
  | { type: 'error'; code: string; message: string; stepIdx: number };

export interface AgentEngine {
  run(req: RunRequest, signal: AbortSignal): AsyncIterable<RunEvent>;
}
