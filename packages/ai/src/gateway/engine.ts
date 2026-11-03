// AiSdkEngine (Blueprint §5.1): vòng bước tự viết quanh `streamText` của AI SDK v7 — mỗi bước một lời gọi model (tool khai không
// `execute`), engine tự chạy tool qua ToolSpec. Nhờ vậy: dừng đúng chỗ khi tool cần người (`paused` + state đủ chạy tiếp ở process
// khác), loop guard (cùng tool + input lần thứ 3), maxSteps, ngân sách credit cả run, huỷ bằng signal, fallback provider khi
// bước lỗi 5xx / 429 / timeout trước khi có chữ nào ra. Usage từng bước → hook trừ credit (spike K4).
import { jsonSchema, streamText, tool, type ModelMessage, type ToolSet } from 'ai';
import { isFallbackError } from '../router/router';
import { callKey, countCalls, resultPart, toJson } from './messages';
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

interface StepResult {
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

    while (true) {
      if (signal.aborted) return yield done('cancelled');
      if (step >= req.maxSteps) return yield done('max_steps');
      if (spent >= req.budget.maxCredits) return yield done('budget');
      try {
        await req.hooks?.beforeStep?.(step);
      } catch (err) {
        return yield { type: 'error', code: errOf(err).code ?? 'STEP_REJECTED', message: errOf(err).message ?? 'step_rejected', stepIdx: step };
      }

      const deltas: string[] = [];
      let r: StepResult;
      try {
        r = await this.step(req, messages, tools, signal, (d) => deltas.push(d));
      } catch (err) {
        if (signal.aborted) return yield done('cancelled');
        const code = err instanceof EngineError ? err.code : 'LLM_ERROR';
        return yield { type: 'error', code, message: String(errOf(err).message ?? err).slice(0, 300), stepIdx: step };
      }
      for (const d of deltas) yield { type: 'delta', stepIdx: step, text: d };
      text = r.text;
      messages.push(...r.messages);
      const usage = { stepIdx: step, provider: r.candidate.provider, model: r.candidate.model, tokensIn: r.tokensIn, tokensOut: r.tokensOut, latencyMs: r.latencyMs };
      let credits = 0;
      try {
        credits = (await req.hooks?.onUsage?.(usage))?.credits ?? 0;
      } catch (err) {
        return yield { type: 'error', code: errOf(err).code ?? 'USAGE_FAILED', message: errOf(err).message ?? 'usage_failed', stepIdx: step };
      }
      spent += credits;
      yield { type: 'usage', usage, credits };
      const stepIdx = step;
      step++;
      if (!r.calls.length) return yield done('stop');

      const results: Record<string, unknown>[] = [];
      for (let i = 0; i < r.calls.length; i++) {
        const call = r.calls[i]!;
        const k = callKey(call.toolName, call.input);
        const n = (seen.get(k) ?? 0) + 1;
        seen.set(k, n);
        if (n >= LOOP_LIMIT) return yield done('loop_guard');
        yield { type: 'tool_call', stepIdx, call };
        const t0 = Date.now();
        const outcome = await runTool(specs.get(call.toolName), call, stepIdx);
        yield { type: 'tool_result', stepIdx, call, outcome, latencyMs: Date.now() - t0 };
        if (outcome.kind === 'needs_confirmation' || outcome.kind === 'needs_approval') {
          const canonical = outcome.kind === 'needs_confirmation' && outcome.canonicalInput !== undefined ? { canonicalInput: outcome.canonicalInput } : {};
          return yield { type: 'paused', outcome, state: { messages: [...messages], results, pendingToolCall: call, skipped: r.calls.slice(i + 1), stepIdx: step, ...canonical } };
        }
        results.push(resultPart(call, outcome));
      }
      messages.push({ role: 'tool', content: results });
    }
  }

  /** Một bước model: thử lần lượt các ứng viên; chuyển ứng viên khi lỗi đáng chuyển và chưa có chữ nào phát ra. */
  private async step(req: RunRequest, messages: RunMessage[], tools: ToolSet, signal: AbortSignal, onDelta: (d: string) => void): Promise<StepResult> {
    const candidates = await this.models.candidates(req.tier, 'chat', { tools: req.tools.length > 0 });
    if (!candidates.length) throw new EngineError('NO_MODEL_ROUTE', `Chưa có model cho mức ${req.tier}`);
    let last: unknown;
    for (const c of candidates) {
      const out: string[] = [];
      try {
        const r = await this.once(c, req.system, messages, tools, signal, (d) => out.push(d));
        out.forEach(onDelta);
        return r;
      } catch (err) {
        last = err;
        if (signal.aborted || out.length || !isFallbackError(err)) throw err;
      }
    }
    throw last;
  }

  private async once(c: ModelCandidate, system: string, messages: RunMessage[], tools: ToolSet, signal: AbortSignal, onDelta: (d: string) => void): Promise<StepResult> {
    const t0 = Date.now();
    const s = streamText({
      model: c.handle as never,
      system,
      messages: messages as unknown as ModelMessage[],
      ...(Object.keys(tools).length ? { tools } : {}),
      abortSignal: signal,
      maxRetries: 1,
      timeout: { firstChunkMs: FIRST_CHUNK_MS },
    });
    let text = '';
    const calls: ToolCallRef[] = [];
    let tokensIn = 0;
    let tokensOut = 0;
    for await (const p of s.fullStream) {
      if (p.type === 'text-delta') {
        text += p.text;
        onDelta(p.text);
      } else if (p.type === 'tool-call') calls.push({ toolCallId: p.toolCallId, toolName: p.toolName, input: p.input });
      else if (p.type === 'finish-step') {
        tokensIn += p.usage.inputTokens ?? 0;
        tokensOut += p.usage.outputTokens ?? 0;
      } else if (p.type === 'error') throw p.error;
      else if (p.type === 'abort') throw Object.assign(new Error('aborted'), { name: 'AbortError' });
    }
    const response = await s.response;
    return { text, calls, messages: toJson(response.messages) as RunMessage[], tokensIn, tokensOut, candidate: c, latencyMs: Date.now() - t0 };
  }
}

async function runTool(spec: ToolSpec | undefined, call: ToolCallRef, stepIdx: number): Promise<ToolOutcome> {
  // Tool ngoài danh sách của run (agent-gateway §3, Blueprint §3.3b) → FORBIDDEN, run tiếp với tool còn lại.
  if (!spec) return { kind: 'error', code: 'FORBIDDEN', message: `Tool ${call.toolName} không được cấp cho lượt chạy này` };
  try {
    return await spec.execute(call.input, { stepIdx, toolCallId: call.toolCallId });
  } catch (err) {
    return { kind: 'error', code: errOf(err).code ?? 'TOOL_FAILED', message: String(errOf(err).message ?? err).slice(0, 300) };
  }
}
