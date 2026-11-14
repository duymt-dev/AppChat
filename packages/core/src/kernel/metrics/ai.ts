// Metric lời gọi model + credit (TIP-045b): một điểm ghi cho AiRunner (mọi run Trợ lý / agent / job AI). Nhãn provider / model / purpose
// là giá trị CẤU HÌNH (provider đăng ký, model của route, `source` run cố định trong mã) — đã qua `boundedLabel`, không chứa id.
import { appMetrics, boundedLabel } from './registry';

export interface LlmUsageSample {
  provider: string;
  model: string;
  purpose: string;
  tokensIn: number;
  tokensOut: number;
  latencyMs?: number;
  credits: number;
}

export function recordLlmUsage(u: LlmUsageSample): void {
  const m = appMetrics();
  const l = { provider: boundedLabel(u.provider), model: boundedLabel(u.model), purpose: boundedLabel(u.purpose) };
  m.llmTokens.inc({ ...l, kind: 'in' }, u.tokensIn);
  m.llmTokens.inc({ ...l, kind: 'out' }, u.tokensOut);
  if (u.latencyMs !== undefined) m.llmLatency.observe(l, u.latencyMs / 1000);
  if (u.credits > 0) m.creditCharged.inc({ purpose: l.purpose }, u.credits);
}

export function recordLlmError(provider: string | undefined, model: string | undefined, purpose: string): void {
  appMetrics().llmErrors.inc({ provider: boundedLabel(provider), model: boundedLabel(model), purpose: boundedLabel(purpose) });
}
