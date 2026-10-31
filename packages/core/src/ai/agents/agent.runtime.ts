// Chạy agent trên runtime TIP-019 (AiRunner + RunStore): system prompt từ cấu hình, bộ tool = quyền agent (D51, agent-tools)
// gọi ActionExecutor với ngữ cảnh agent; chạy một lượt + chờ kết quả (chat thử Builder, soạn cấu hình, tối ưu prompt). Credit trừ
// qua CreditMeter như mọi run. Agent trực kênh (queue `agent-reply`) dùng lại `agentSystem` / `agentToolSpecs` ở TIP-022.
import { registry, type ActionDef } from '@appchat/actions';
import type { ToolOutcome, ToolSpec } from '@appchat/ai';
import type { AuthzContext } from '@appchat/shared';
import type { TenantDb } from '@appchat/db';
import type { ActionContext } from '../../kernel/actions/action-context';
import type { ActionExecutor } from '../../kernel/actions/executor';
import { MAX_STEPS, type AiRunner, type RunResult } from '../runs/runner';
import { RunStore, type NewRun } from '../runs/run.store';
import { actionTool } from '../runs/tools';
import { agentAuthz } from './agent-authz';
import type { AgentConfig } from './agent.store';
import { AGENT_INTENTS } from './catalog';

const DEFS = new Map(registry.map((a) => [a.id, a]));
const LANG: Record<AgentConfig['language'], string> = {
  vi: 'Trả lời bằng tiếng Việt.',
  en: 'Reply in English.',
  bilingual: 'Trả lời song ngữ Việt – Anh.',
  auto: 'Trả lời theo ngôn ngữ của khách.',
};

/** System prompt của agent: prompt người viết + vai trò / ngôn ngữ / ý định / ngưỡng bàn giao (Blueprint §5.2 khối 1). */
export function agentSystem(c: AgentConfig): string {
  const intents = c.intents.map((i) => AGENT_INTENTS[i]).filter(Boolean);
  return [
    c.prompt.trim() || `Bạn là ${c.name || 'trợ lý AI'} của doanh nghiệp. Trả lời ngắn gọn, lịch sự, đúng sự thật.`,
    '',
    `# KHUNG`,
    `- Tên: ${c.name}${c.role_label ? ` — ${c.role_label}` : ''}`,
    `- ${LANG[c.language]}`,
    ...(intents.length ? [`- Phụ trách: ${intents.join(', ')}`] : []),
    ...(c.keywords.length ? [`- Ưu tiên tin nhắn có từ khoá: ${c.keywords.join(', ')}`] : []),
    ...(c.persona.trim() ? [`- Tính cách: ${c.persona.trim()}`] : []),
    `- Không chắc chắn (độ tin cậy dưới ${c.threshold}%) thì chuyển cho nhân viên, không bịa thông tin.`,
    `- Không tự đưa giá / tồn kho / lịch trống khi chưa tra bằng công cụ.`,
  ].join('\n');
}

const OFFICE = { from: 8 * 60, to: 17 * 60 + 30 };
const VN_OFFSET_MIN = 7 * 60;

/**
 * Agent đang trong khung giờ hoạt động? `office` = 8:00–17:30 giờ VN (gồm 8:00, không gồm 17:30), mọi ngày; `always` / `custom`
 * (lịch tuỳ chỉnh chưa có màn — DC-136) = luôn hoạt động.
 */
export function withinHours(mode: AgentConfig['working_hours'], now: Date): boolean {
  if (mode !== 'office') return true;
  const min = (((now.getUTCHours() * 60 + now.getUTCMinutes() + VN_OFFSET_MIN) % 1440) + 1440) % 1440;
  return min >= OFFICE.from && min < OFFICE.to;
}

export interface AgentRunCtx {
  workspaceId: string;
  agent: { id: string; toolIds: readonly string[] };
  /** Người ra lệnh (`delegate` / Cowork / chat thử) — quyền hiệu lực = agent ∩ người này (§3.3b). */
  commander?: AuthzContext;
  runId: string;
  source: 'agent' | 'task';
  /** Agent trực kênh: hội thoại đang phục vụ (gửi vào đây không cần duyệt — §3.3). */
  servedConversationId?: string;
  /** Biến đổi input trước khi gọi action (khôi phục PII che trong lượt — TIP-022). */
  mapInput?: (input: unknown) => unknown;
}

/** ToolSpec cho các action đã lọc (runToolIds): `execute` → ActionExecutor với ngữ cảnh agent của run. */
export function agentToolSpecs(executor: Pick<ActionExecutor, 'execute'>, ids: readonly string[], r: AgentRunCtx): ToolSpec[] {
  const ctxOf = (stepIdx: number): ActionContext => ({
    workspaceId: r.workspaceId,
    source: r.source,
    actor: { type: 'agent', id: r.agent.id },
    ...(r.commander ? { onBehalfOfUserId: r.commander.userId } : {}),
    runId: r.runId,
    stepId: String(stepIdx),
    ...(r.servedConversationId ? { servedConversationId: r.servedConversationId } : {}),
    authz: agentAuthz(r.agent, r.commander),
  });
  const specs = ids.map((id) => DEFS.get(id)).filter((d): d is ActionDef => !!d).map((d) => actionTool(d, executor, ctxOf));
  const map = r.mapInput;
  return map ? specs.map((s) => ({ ...s, execute: (input, meta) => s.execute(map(input), meta) })) : specs;
}

/**
 * Chat thử (D29, §5.3b `agent.test`): tool chỉ xem trước — action đọc chạy thật, còn lại trả `{ dry_run, would_call }`, không
 * ghi DB / không gửi ra ngoài. Model vẫn chạy thật (trừ credit).
 */
export function dryRunTools(specs: ToolSpec[]): ToolSpec[] {
  return specs.map((s) => {
    const risk = DEFS.get(s.name.replaceAll('__', '.'))?.risk;
    if (risk === 'read') return s;
    return { ...s, execute: async (input): Promise<ToolOutcome> => ({ kind: 'ok', output: { dry_run: true, would_call: s.name.replaceAll('__', '.'), input } }) };
  });
}

export interface OneShot {
  run: Omit<NewRun, 'input'> & { input?: unknown };
  system: string;
  prompt: string;
  /** Tool của run — dựng sau khi có `runId` (ngữ cảnh action ghi run / bước). */
  tools?: (runId: string) => ToolSpec[];
  source: string;
  maxCredits?: number;
}

/** Tạo run + chạy tới khi xong (chạy đồng bộ trong request — lượt ngắn, tối đa MAX_STEPS.agent bước). */
export async function runOnce(db: TenantDb, runner: AiRunner, now: () => Date, ws: string, o: OneShot): Promise<RunResult & { runId: string }> {
  const store = new RunStore(db, now);
  const row = await store.create({ ...o.run, input: o.run.input ?? { text: o.prompt }, maxCredits: o.maxCredits ?? o.run.maxCredits ?? null });
  const r = await runner.start(ws, store, row, { system: o.system, messages: [{ role: 'user', content: o.prompt }], tools: o.tools?.(row.id) ?? [], maxSteps: MAX_STEPS.agent, source: o.source });
  return { ...r, runId: row.id };
}
