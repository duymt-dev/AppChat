// Kiểm khả năng thật của một provider (TIP-040 AC04, DC-371): mỗi khả năng một lời gọi nhỏ có giới hạn thời gian / token, kết quả
// riêng từng khả năng — chat được KHÔNG suy ra embed được. Không trả thân phản hồi / lỗi thô của provider (chỉ mã lỗi đã làm sạch).
import { embed, generateText, jsonSchema, Output, streamText, tool } from 'ai';
import { buildModel, type ProviderCapabilities, type ProviderConfig } from './providers';

export type ProbeCapability = 'chat' | 'tools' | 'json_schema' | 'streaming' | 'embeddings';
export type ProbeError = 'auth' | 'rate_limited' | 'timeout' | 'not_found' | 'unsupported' | 'bad_response' | 'network' | 'provider_error';

export interface ProbeCheck {
  capability: ProbeCapability;
  ok: boolean;
  latency_ms: number;
  error?: ProbeError;
}

export interface ProbeRequest {
  provider: ProviderConfig;
  chatModel?: string | null;
  embedModel?: string | null;
  capabilities: readonly ProbeCapability[];
  timeoutMs?: number;
}

const MAX_TOKENS = 16;

/** Lỗi AI SDK / fetch → mã ngắn (không chép message — có thể chứa URL / key / thân phản hồi). */
export function probeError(e: unknown): ProbeError {
  const o = e as { name?: string; statusCode?: number; cause?: { name?: string } };
  const s = o?.statusCode;
  if (o?.name === 'AbortError' || o?.name === 'TimeoutError' || o?.cause?.name === 'AbortError') return 'timeout';
  if (s === 401 || s === 403) return 'auth';
  if (s === 429) return 'rate_limited';
  if (s === 404) return 'not_found';
  if (s === 400 || s === 422) return 'unsupported';
  if (typeof s === 'number') return 'provider_error';
  if (/NoObjectGenerated|InvalidResponse|TypeValidation|JSONParse/i.test(o?.name ?? '')) return 'bad_response';
  return 'network';
}

async function timed(capability: ProbeCapability, timeoutMs: number, fn: (signal: AbortSignal) => Promise<boolean>): Promise<ProbeCheck> {
  const t0 = Date.now();
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const ok = await fn(ctl.signal);
    return { capability, ok, latency_ms: Date.now() - t0, ...(ok ? {} : { error: 'bad_response' as const }) };
  } catch (e) {
    return { capability, ok: false, latency_ms: Date.now() - t0, error: ctl.signal.aborted ? 'timeout' : probeError(e) };
  } finally {
    clearTimeout(timer);
  }
}

/** Chạy tuần tự (không bắn song song vào provider), mỗi bước tự huỷ khi quá hạn. */
export async function probeProvider(r: ProbeRequest): Promise<ProbeCheck[]> {
  const ms = r.timeoutMs ?? 15_000;
  const out: ProbeCheck[] = [];
  const chat = r.chatModel ? (buildModel(r.provider, r.chatModel, 'chat') as never) : null;
  const base = { maxOutputTokens: MAX_TOKENS, maxRetries: 0 } as const;
  for (const c of r.capabilities) {
    if (c === 'embeddings') {
      if (!r.embedModel) {
        out.push({ capability: c, ok: false, latency_ms: 0, error: 'unsupported' });
        continue;
      }
      let model: never;
      try {
        model = buildModel(r.provider, r.embedModel, 'embed') as never;
      } catch {
        out.push({ capability: c, ok: false, latency_ms: 0, error: 'unsupported' });
        continue;
      }
      out.push(await timed(c, ms, async (signal) => (await embed({ model, value: 'ping', maxRetries: 0, abortSignal: signal })).embedding.length > 0));
      continue;
    }
    if (!chat) {
      out.push({ capability: c, ok: false, latency_ms: 0, error: 'unsupported' });
      continue;
    }
    if (c === 'chat') out.push(await timed(c, ms, async (signal) => (await generateText({ model: chat, prompt: 'Reply with: ok', ...base, abortSignal: signal })).text.length > 0));
    if (c === 'streaming')
      out.push(
        await timed(c, ms, async (signal) => {
          let n = 0;
          for await (const d of streamText({ model: chat, prompt: 'Reply with: ok', ...base, abortSignal: signal }).textStream) n += d.length;
          return n > 0;
        }),
      );
    if (c === 'tools')
      out.push(
        await timed(c, ms, async (signal) => {
          const r2 = await generateText({
            model: chat,
            prompt: 'Call the ping tool now.',
            tools: { ping: tool({ description: 'Ping', inputSchema: jsonSchema({ type: 'object', properties: {}, additionalProperties: false }) }) },
            toolChoice: 'required',
            ...base,
            maxOutputTokens: 64,
            abortSignal: signal,
          });
          return r2.toolCalls.length > 0;
        }),
      );
    if (c === 'json_schema')
      out.push(
        await timed(c, ms, async (signal) => {
          const r3 = await generateText({
            model: chat,
            prompt: 'Return ok=true.',
            output: Output.object({ schema: jsonSchema<{ ok: boolean }>({ type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'], additionalProperties: false }) }),
            ...base,
            maxOutputTokens: 64,
            abortSignal: signal,
          });
          return typeof r3.output?.ok === 'boolean';
        }),
      );
  }
  return out;
}

/** Khả năng đã kiểm → `capabilities` lưu ở `llm_provider` (khả năng không kiểm giữ giá trị cũ). */
export function mergeCapabilities(prev: ProviderCapabilities, checks: readonly ProbeCheck[]): ProviderCapabilities {
  const next: ProviderCapabilities = { ...prev };
  for (const c of checks) if (c.capability !== 'chat') next[c.capability] = c.ok;
  return next;
}
