// AiSdkEngine (Blueprint §5.1): vòng bước tự viết quanh `streamText` của AI SDK v7 — mỗi bước một lời gọi model (tool khai không
// `execute`), engine tự chạy tool qua ToolSpec. Nhờ vậy: dừng đúng chỗ khi tool cần người (`paused` + state đủ chạy tiếp ở process
// khác), loop guard (cùng tool + input lần thứ 3), maxSteps, ngân sách credit cả run, huỷ bằng signal, fallback provider khi
// bước lỗi 5xx / 429 / timeout trước khi có chữ nào ra. Usage từng bước → hook trừ credit (spike K4). Delta phát NGAY khi model trả
// (liveStep — TIP-023c, đóng DV-006), không đợi bước xong; đã phát chữ thì không fallback sang provider khác (không trộn hai câu).
// TIP-019b: mỗi ứng viên = một lời gọi thật có hook `beforeAttempt` / `afterAttempt` (biên nhận + quyết toán ở core); SDK không tự gửi
// lại (`maxRetries: 0`); lỗi không rõ đã chạy chưa → không chuyển ứng viên; hết ngân sách sau usage → không chạy tool nào của bước đó.
// TIP-021b: `responseSchema` → một bước không tool qua structured.ts (không phát delta chữ thô); usage ghi trước, rồi mới kiểm schema.
import { jsonSchema, streamText, tool, type ModelMessage, type ToolSet } from 'ai';
import { classifyAttemptError, type AttemptOutcome } from './attempts';
import { outputTokens, requestBytes, REQUEST_MAX_BYTES } from './limits';
import { liveStep } from './delta-stream';
import { callKey, countCalls, resultPart, toJson } from './messages';
import { hydrateMessages, stripMedia } from './input-parts';
import { assertStructuredRequest, parseStructured, StructuredError, structuredOutput } from './structured';
import type { AgentEngine, ModelCandidate, ModelSource, RunEvent, RunMessage, RunRequest, StopReason, ToolCallRef, ToolOutcome, ToolSpec } from './types';

export const LOOP_LIMIT = 3;
const FIRST_CHUNK_MS = 30_000;

export class EngineError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'EngineError';
  }
}

/** Mảnh phát khi bước đang chạy: chữ, hoặc input tool đang đến dần (TIP-023c structured stream — chỉ để dựng khung xương). */
type Live = string | { toolCallId: string; toolName: string; delta: string };

interface StepResult {
  candidateIdx: number;
  text: string;
  calls: ToolCallRef[];
  messages: RunMessage[];
  tokensIn: number;
  tokensOut: number;
  candidate: ModelCandidate;
  latencyMs: number;
}

const errOf = (err: unknown) => err as { code?: string; message?: string };

export class AiSdkEngine implements AgentEngine {
  constructor(private readonly models: ModelSource) {}

  async *run(req: RunRequest, signal: AbortSignal): AsyncIterable<RunEvent> {
    const specs = new Map(req.tools.map((t) => [t.name, t]));
    const tools: ToolSet = Object.fromEntries(req.tools.map((t) => [t.name, tool({ description: t.description, inputSchema: jsonSchema(t.inputSchema as never) })]));
    const messages: RunMessage[] = [...req.messages];
    const seen = countCalls(messages);
    let spent = req.budget.spent ?? 0;
    let step = req.startStep ?? 0;
    let text = '';
    const done = (reason: StopReason): RunEvent => ({ type: 'finish', reason, text, messages, steps: step });
    try {
      assertStructuredRequest(req);
    } catch (err) {
      return yield { type: 'error', code: (err as StructuredError).code, message: (err as Error).message, stepIdx: step };
    }

    while (true) {
      if (signal.aborted) return yield done('cancelled');
      if (step >= req.maxSteps) return yield done('max_steps');
      if (spent >= req.budget.maxCredits) return yield done('budget');
      try {
        await req.hooks?.beforeStep?.(step);
      } catch (err) {
        return yield { type: 'error', code: errOf(err).code ?? 'STEP_REJECTED', message: errOf(err).message ?? 'step_rejected', stepIdx: step };
      }

      let r: StepResult;
      try {
        const live = liveStep<Live, StepResult>((emit) => this.step(req, step, messages, tools, signal, emit));
        let it = await live.next();
        for (; !it.done; it = await live.next())
          yield typeof it.value === 'string' ? { type: 'delta', stepIdx: step, text: it.value } : { type: 'tool_input', stepIdx: step, ...it.value };
        r = it.value;
      } catch (err) {
        if (signal.aborted) return yield done('cancelled');
        // Lỗi do hook ném (ví hết / gốc đã huỷ / ngân sách) giữ mã của hook; lỗi nhà cung cấp → LLM_ERROR.
        const code = err instanceof EngineError ? err.code : (errOf(err).code && /^[A-Z_]+$/.test(errOf(err).code!) ? errOf(err).code! : 'LLM_ERROR');
        return yield { type: 'error', code, message: String(errOf(err).message ?? err).slice(0, 300), stepIdx: step };
      }
      text = r.text;
      messages.push(...r.messages);
      const usage = { stepIdx: step, provider: r.candidate.provider, model: r.candidate.model, tokensIn: r.tokensIn, tokensOut: r.tokensOut, latencyMs: r.latencyMs };
      let credits = 0;
      try {
        credits = req.hooks?.afterAttempt
          ? (await req.hooks.afterAttempt({ stepIdx: step, candidate: r.candidateIdx, provider: usage.provider, model: usage.model }, { kind: 'usage', tokensIn: r.tokensIn, tokensOut: r.tokensOut, latencyMs: r.latencyMs })).credits
          : ((await req.hooks?.onUsage?.(usage))?.credits ?? 0);
      } catch (err) {
        return yield { type: 'error', code: errOf(err).code ?? 'USAGE_FAILED', message: errOf(err).message ?? 'usage_failed', stepIdx: step };
      }
      spent += credits;
      yield { type: 'usage', usage, credits };
      const stepIdx = step;
      step++;
      if (req.responseSchema) {
        // Usage đã ghi (kể cả khi khuôn sai) — kiểm schema của engine; sai → lỗi rõ, không sửa ngầm, không gọi lần hai.
        try {
          text = parseStructured(req.responseSchema, r.text);
        } catch (err) {
          return yield { type: 'error', code: err instanceof StructuredError ? err.code : 'STRUCTURED_MALFORMED', message: (err as Error).message, stepIdx };
        }
        return yield done('stop');
      }
      if (!r.calls.length) return yield done('stop');
      // Rào mềm (DC-251): usage thật đã ghi; hết ngân sách → bỏ mọi tool model vừa yêu cầu, không mở lời gọi kế.
      if (spent >= req.budget.maxCredits) return yield done('budget');

      const results: Record<string, unknown>[] = [];
      for (let i = 0; i < r.calls.length; i++) {
        const call = r.calls[i]!;
        const k = callKey(call.toolName, call.input);
        const n = (seen.get(k) ?? 0) + 1;
        seen.set(k, n);
        if (n >= LOOP_LIMIT) return yield done('loop_guard');
        if (signal.aborted) return yield done('cancelled');
        try {
          await req.hooks?.beforeTool?.(stepIdx, call.toolName);
        } catch (err) {
          return yield { type: 'error', code: errOf(err).code ?? 'TOOL_REJECTED', message: errOf(err).message ?? 'tool_rejected', stepIdx };
        }
        yield { type: 'tool_call', stepIdx, call };
        const t0 = Date.now();
        const outcome = await runTool(specs.get(call.toolName), call, stepIdx, specs);
        yield { type: 'tool_result', stepIdx, call, outcome, latencyMs: Date.now() - t0 };
        if (outcome.kind === 'needs_confirmation' || outcome.kind === 'needs_approval' || outcome.kind === 'waiting_child') {
          const canonical = outcome.kind === 'needs_confirmation' ? { ...(outcome.canonicalInput !== undefined ? { canonicalInput: outcome.canonicalInput } : {}), ...(outcome.binding !== undefined ? { binding: outcome.binding } : {}) } : {};
          return yield { type: 'paused', outcome, state: { messages: [...messages], results, pendingToolCall: call, skipped: r.calls.slice(i + 1), stepIdx: step, ...canonical } };
        }
        results.push(resultPart(call, outcome));
      }
      messages.push({ role: 'tool', content: results });
    }
  }

  /** Một bước model: thử lần lượt các ứng viên; chuyển ứng viên khi lỗi đáng chuyển và chưa có chữ nào phát ra. */
  private async step(req: RunRequest, stepIdx: number, messages: RunMessage[], tools: ToolSet, signal: AbortSignal, onDelta: (d: Live) => void): Promise<StepResult> {
    // TIP-023f §3.1-3.2: tham chiếu tệp dựng lại MỖI lần gửi (quyền / nguồn hiện hành), bản sao — tin lưu không chứa bytes.
    const hydrated = await hydrateMessages(messages, req.inputs);
    const structured = !!req.responseSchema;
    const candidates = await this.models.candidates(req.tier, 'chat', { tools: req.tools.length > 0, vision: hydrated.vision, ...(structured ? { structured } : {}) });
    if (!candidates.length) {
      // Có route chat nhưng không route nào khai sinh theo schema → mã riêng (core chọn mẫu tất định có lý do, không gắn mode model).
      if (structured && (await this.models.candidates(req.tier, 'chat', { tools: false })).length)
        throw new EngineError('STRUCTURED_UNSUPPORTED', `Chưa có model sinh theo schema cho mức ${req.tier}`);
      if (hydrated.vision) throw new EngineError('VISION_UNAVAILABLE', `Chưa có model đọc được ảnh cho mức ${req.tier} — không gửi thiếu ảnh`);
      throw new EngineError('NO_MODEL_ROUTE', `Chưa có model cho mức ${req.tier}`);
    }
    // Chữ (kể cả phần trích từ tệp) tính theo trần request; bytes ảnh inline đã giới hạn ở resolver (≤ 4 ảnh / cửa sổ, §2.2).
    const bytes = requestBytes(req.system, stripMedia(hydrated.messages), req.tools);
    if (bytes > REQUEST_MAX_BYTES) throw new EngineError('REQUEST_TOO_LARGE', `Yêu cầu ${bytes} byte vượt trần ${REQUEST_MAX_BYTES} — rút gọn ngữ cảnh / bớt tool`);
    let last: unknown;
    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i]!;
      const info = { stepIdx, candidate: i, provider: c.provider, model: c.model };
      // Lỗi ở đây (hết ví / gốc đang bận / huỷ) → chưa gọi gì, run dừng với mã lỗi đó.
      await req.hooks?.beforeAttempt?.(info, bytes);
      let emitted = 0;
      const t0 = Date.now();
      try {
        const r = await this.once(c, req, hydrated.messages, tools, signal, (d) => {
          emitted++;
          onDelta(d);
        }, () => emitted++);
        return { ...r, candidateIdx: i };
      } catch (err) {
        last = err;
        const k = classifyAttemptError(err, emitted > 0, signal.aborted);
        const outcome: AttemptOutcome = { kind: k.kind, error: k.error, latencyMs: Date.now() - t0 };
        await req.hooks?.afterAttempt?.(info, outcome);
        if (k.kind === 'unknown' && req.hooks?.afterAttempt) throw new EngineError(signal.aborted ? 'CANCELLED' : 'USAGE_UNKNOWN', `Không rõ kết quả lời gọi ${c.provider}:${c.model} (${k.error}) — không gửi lại`);
        if (signal.aborted || emitted || !k.fallback) throw err;
      }
    }
    throw last;
  }

  private async once(c: ModelCandidate, req: RunRequest, messages: RunMessage[], tools: ToolSet, signal: AbortSignal, onDelta: (d: Live) => void, onSilent: () => void): Promise<Omit<StepResult, 'candidateIdx'>> {
    const t0 = Date.now();
    const s = streamText({
      model: c.handle as never,
      system: req.system,
      messages: messages as unknown as ModelMessage[],
      ...(Object.keys(tools).length ? { tools } : {}),
      ...(req.responseSchema ? { output: structuredOutput(req.responseSchema) } : {}),
      abortSignal: signal,
      // Mỗi lần gửi phải đi qua biên nhận (TIP-019b) — SDK không tự gửi lại ngầm.
      maxRetries: 0,
      maxOutputTokens: outputTokens(req.maxOutputTokens),
      timeout: { firstChunkMs: FIRST_CHUNK_MS },
    });
    let text = '';
    const calls: ToolCallRef[] = [];
    let tokensIn = 0;
    let tokensOut = 0;
    const inputs = new Map<string, string>();
    for await (const p of s.fullStream) {
      if (p.type === 'text-delta') {
        text += p.text;
        // JSON từng mảnh của chế độ schema không bao giờ là đề xuất — không phát; vẫn đếm để không fallback sau khi đã có chữ.
        if (req.responseSchema) onSilent();
        else onDelta(p.text);
      } else if (p.type === 'tool-input-start') inputs.set(p.id, p.toolName);
      else if (p.type === 'tool-input-delta') {
        const name = inputs.get(p.id);
        if (name) onDelta({ toolCallId: p.id, toolName: name, delta: p.delta });
      } else if (p.type === 'tool-call') calls.push({ toolCallId: p.toolCallId, toolName: p.toolName, input: p.input });
      else if (p.type === 'finish-step') {
        tokensIn += p.usage.inputTokens ?? 0;
        tokensOut += p.usage.outputTokens ?? 0;
      } else if (p.type === 'error') throw p.error;
      else if (p.type === 'abort') throw Object.assign(new Error('aborted'), { name: 'AbortError' });
    }
    const response = await s.response;
    return { text, calls, messages: stripMedia(toJson(response.messages) as RunMessage[]), tokensIn, tokensOut, candidate: c, latencyMs: Date.now() - t0 };
  }
}

async function runTool(spec: ToolSpec | undefined, call: ToolCallRef, stepIdx: number, specs: ReadonlyMap<string, ToolSpec>): Promise<ToolOutcome> {
  // Tool ngoài danh sách của run (agent-gateway §3, Blueprint §3.3b) → FORBIDDEN, run tiếp với tool còn lại. Nêu tên tool được dùng để model
  // tự sửa (vd gọi thẳng `contact.search` thay vì `call_action`) — chỉ tên, không cấp thêm gì.
  if (!spec) return { kind: 'error', code: 'FORBIDDEN', message: `Tool ${call.toolName} không được cấp cho lượt chạy này — chỉ dùng: ${[...specs.keys()].join(', ')}` };
  try {
    return await spec.execute(call.input, { stepIdx, toolCallId: call.toolCallId });
  } catch (err) {
    return { kind: 'error', code: errOf(err).code ?? 'TOOL_FAILED', message: String(errOf(err).message ?? err).slice(0, 300) };
  }
}
