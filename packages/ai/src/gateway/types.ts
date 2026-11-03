// Agent Gateway (Blueprint §5.1, agent-gateway §1–§6): interface engine + tool + sự kiện run. Core chỉ thấy các kiểu này —
// không import `ai` / `@ai-sdk/*`. Tool = action (origin 'action') hoặc meta-tool / tool phối hợp; logic nghiệp vụ không nằm trong tool.
import type { ActionPreview } from '@appchat/actions';

/** Tin nhắn theo định dạng AI SDK (`ModelMessage`) — lưu nguyên trong `ai_run.state` (jsonb). */
export type RunMessage = Record<string, unknown> & { role: 'system' | 'user' | 'assistant' | 'tool' };

export type JsonSchema = Record<string, unknown>;

export type ToolOutcome =
  | { kind: 'ok'; output: unknown }
  /** `canonicalInput`: input đã chuẩn hoá (mã → id) mà token gắn — xác nhận phải chạy đúng input này (TIP-023b R1.6). */
  | { kind: 'needs_confirmation'; preview: ActionPreview; confirmToken: string; canonicalInput?: unknown }
  | { kind: 'needs_approval'; approvalId: string }
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
  /** Trước mỗi bước LLM (kiểm ví > 0) — ném lỗi thì run dừng. */
  beforeStep?(stepIdx: number): Promise<void>;
  /** Sau mỗi bước LLM: trừ credit → trả số credit của bước (cộng vào ngân sách cả run). */
  onUsage?(u: UsageInfo): Promise<{ credits: number }>;
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
  hooks?: RunHooks;
}

export type StopReason = 'stop' | 'max_steps' | 'loop_guard' | 'budget' | 'cancelled';

export type RunEvent =
  | { type: 'delta'; stepIdx: number; text: string }
  | { type: 'tool_call'; stepIdx: number; call: ToolCallRef }
  | { type: 'tool_result'; stepIdx: number; call: ToolCallRef; outcome: ToolOutcome; latencyMs: number }
  | { type: 'usage'; usage: UsageInfo; credits: number }
  | { type: 'paused'; state: PausedState; outcome: Extract<ToolOutcome, { kind: 'needs_confirmation' | 'needs_approval' }> }
  | { type: 'finish'; reason: StopReason; text: string; messages: RunMessage[]; steps: number }
  | { type: 'error'; code: string; message: string; stepIdx: number };

export interface AgentEngine {
  run(req: RunRequest, signal: AbortSignal): AsyncIterable<RunEvent>;
}
