// Chạy agent trên runtime TIP-019 (AiRunner + RunStore): system prompt từ cấu hình, bộ tool = quyền agent (D51, agent-tools)
// gọi ActionExecutor với ngữ cảnh agent; chạy một lượt + chờ kết quả (chat thử Builder, soạn cấu hình, tối ưu prompt). Credit trừ
// qua CreditMeter như mọi run. Agent trực kênh (queue `agent-reply`) dùng lại `agentSystem` / `agentToolSpecs` ở TIP-022.
import { isInternalAction, registry, type ActionDef } from '@appchat/actions';
import type { ToolOutcome, ToolSpec } from '@appchat/ai';
import type { AuthzContext } from '@appchat/shared';
import type { TenantDb } from '@appchat/db';
import type { ActionContext } from '../../kernel/actions/action-context';
import { implementedBy, type ToolExecutor } from '../../kernel/actions/executor';
import { resolveCodes } from '../assistant/code-refs';
import { MAX_STEPS, type AiRunner, type RunResult } from '../runs/runner';
import { RunStore, type NewRun } from '../runs/run.store';
import { isChildRace, reuseChild, type TrustedParent } from '../runs/run-lineage';
import { actionTool, toolActionId } from '../runs/tools';
import { agentAuthz } from './agent-authz';
import { currentAuthority } from './current-authority';
import type { AgentConfig } from './agent.store';
import { AGENT_INTENTS } from './catalog';
import { agentSchedule } from './schedule-config';
import { inSchedule } from '@appchat/shared';

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

/**
 * Agent đang trong khung giờ hoạt động? `office` = 8:00–17:30 Asia/Ho_Chi_Minh (gồm 8:00, không gồm 17:30), mọi ngày; `custom` theo lịch
 * tuần có cấu trúc (TIP-022b — chưa có lịch = giữ hành vi đã xuất bản: luôn hoạt động + cảnh báo); `always` luôn hoạt động.
 */
export function withinHours(mode: AgentConfig['working_hours'], now: Date, weekly: AgentConfig['weekly_schedule'] = null): boolean {
  const s = agentSchedule({ working_hours: mode, weekly_schedule: weekly });
  return !s || inSchedule(s, now);
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
  /** Tác vụ Cowork tắt "hỏi trước khi gửi" (TIP-035). */
  autoSend?: boolean;
  /** Thu hẹp quyền hiệu lực thêm (tác vụ: data scope theo nhóm dữ liệu đã cấp — TIP-035). */
  narrow?: (a: AuthzContext) => AuthzContext;
  /** Biến đổi input trước khi gọi action (khôi phục PII che trong lượt — TIP-022). */
  mapInput?: (input: unknown) => unknown;
  /** DB tenant của run — có thì đổi mã hiển thị (KH-1016, BG-1003) → id như Trợ lý (TIP-023b R1.5) + kiểm quyền hiện hành mỗi lần gọi. */
  db?: TenantDb;
  /**
   * Quyền hiện hành mỗi lần gọi tool (TIP-023b SPEC A): `commander` đọc lại người ra lệnh ban đầu (mất quyền → chặn, không rơi về quyền
   * agent); `draft` = chat thử cấu hình nháp. Vắng → người ra lệnh lấy từ `commander` tĩnh (lượt đồng bộ trong request).
   */
  authority?: { commanderId?: string; commander?: (ws: string, userId: string) => Promise<AuthzContext | null>; draft?: boolean };
}

/**
 * ToolSpec cho các action đã lọc (runToolIds): `execute` → ActionExecutor với ngữ cảnh agent của run. Chỉ action có handler thật
 * (TIP-023b R1.2); thứ tự input: khôi phục PII (`mapInput`) → mã → id (`resolveCodes`) → executor validate.
 */
export function agentToolSpecs(executor: ToolExecutor, ids: readonly string[], r: AgentRunCtx): ToolSpec[] {
  // Quyền đã đọc lại cho lời gọi đang chạy (khoá bước + id lời gọi) — ctxOf dùng thay bản dựng lúc bắt đầu run.
  const live = new Map<string, AuthzContext>();
  // TIP-020c: người ra lệnh hiện hành cho quyền đọc nguồn của `kb.search` (đọc lại mỗi lời gọi, cùng khoá với `live`).
  const knower = new Map<string, AuthzContext>();
  const narrowed = (a: AuthzContext) => (r.narrow ? r.narrow(a) : a);
  const ctxOf = (def: ActionDef, stepIdx: number, toolCallId: string): ActionContext => ({
    workspaceId: r.workspaceId,
    source: r.source,
    actor: { type: 'agent', id: r.agent.id },
    ...(r.commander ? { onBehalfOfUserId: r.commander.userId } : {}),
    runId: r.runId,
    stepId: String(stepIdx),
    // Khoá idempotent theo nguồn + run + lời gọi tool (một bước có thể gọi nhiều tool); id lời gọi nằm trong trạng thái run nên giữ
    // nguyên qua retry / resume — chạy lại không ghi / gửi hai lần, input khác cùng khoá → CONFLICT (TIP-023b R1.5).
    ...(def.risk === 'read' ? {} : { idempotencyKey: `${r.source}:${r.runId}:${stepIdx}:${toolCallId}` }),
    ...(r.servedConversationId ? { servedConversationId: r.servedConversationId } : {}),
    ...(r.autoSend ? { autoSend: true } : {}),
    authz: narrowed(live.get(`${stepIdx}:${toolCallId}`) ?? agentAuthz(r.agent, r.commander)),
    ...(def.id === 'kb.search' && (knower.get(`${stepIdx}:${toolCallId}`) ?? r.commander) ? { knowledgeAuthz: narrowed((knower.get(`${stepIdx}:${toolCallId}`) ?? r.commander)!) } : {}),
  });
  const has = implementedBy(executor);
  const { mapInput: map, db } = r;
  const commanderId = r.authority?.commanderId ?? r.commander?.userId;
  const readCommander = r.authority?.commander ?? (r.commander ? async () => r.commander! : undefined);
  const specs = ids.map((id) => DEFS.get(id)).filter((d): d is ActionDef => !!d && has(d.id) && !isInternalAction(d)).map((d) => {
    const tool = actionTool(d, executor, (i, c) => ctxOf(d, i, c));
    if (!db) return tool;
    // SPEC A: mỗi lời gọi đọc lại agent / grant đã xuất bản / connector / người ra lệnh — thu hồi có hiệu lực ngay lần gọi kế.
    const guarded: ToolSpec = {
      ...tool,
      execute: async (input, meta) => {
        const cur = await currentAuthority({
          db, ws: r.workspaceId, agentId: r.agent.id, def: d, snapshot: r.agent.toolIds,
          ...(commanderId ? { commanderId } : {}), ...(readCommander ? { commander: readCommander } : {}), ...(r.authority?.draft ? { draft: true } : {}),
        });
        if (!cur.ok) return { kind: 'error', code: cur.code, message: cur.reason };
        const key = `${meta.stepIdx}:${meta.toolCallId}`;
        live.set(key, cur.authz);
        const who = d.id === 'kb.search' && commanderId && readCommander ? await readCommander(r.workspaceId, commanderId) : null;
        if (who) knower.set(key, who);
        try {
          return await tool.execute(input, meta);
        } finally {
          live.delete(key);
          knower.delete(key);
        }
      },
    };
    return guarded;
  });
  if (!map && !db) return specs;
  return specs.map((s) => ({
    ...s,
    execute: async (input, meta) => {
      const restored = map ? map(input) : input;
      return s.execute(db ? (await resolveCodes(db, toolActionId(s.name), restored)).input : restored, meta);
    },
  }));
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
  /** Cha tin cậy (`trustedParent` từ ActionContext — TIP-019b §3): run tiện ích là con dưới gốc của cha, dùng chung ngân sách gốc. */
  parent?: TrustedParent | null;
}

/** Tạo run + chạy tới khi xong (chạy đồng bộ trong request — lượt ngắn, tối đa MAX_STEPS.agent bước). Có cha → mỗi khoá một run con. */
export async function runOnce(db: TenantDb, runner: AiRunner, now: () => Date, ws: string, o: OneShot): Promise<RunResult & { runId: string }> {
  const store = new RunStore(db, now);
  const p = o.parent ?? null;
  if (p) {
    const prior = await reuseChild(db, p);
    if (prior) return prior;
  }
  const data = { ...o.run, input: o.run.input ?? { text: o.prompt }, maxCredits: o.maxCredits ?? o.run.maxCredits ?? null, ...(p ? { parentRunId: p.parentRunId, childKey: p.childKey } : {}) };
  let run;
  try {
    run = await store.create(data);
  } catch (e) {
    const again = p && isChildRace(e) ? await reuseChild(db, p) : null;
    if (again) return again;
    throw e;
  }
  const r = await runner.start(ws, store, run, { system: o.system, messages: [{ role: 'user', content: o.prompt }], tools: o.tools?.(run.id) ?? [], maxSteps: MAX_STEPS.agent, source: o.source });
  return { ...r, runId: run.id };
}
