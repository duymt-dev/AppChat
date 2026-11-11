// Một lần chạy tác vụ (job `ai-task`, worker ROLE=ai — Blueprint §5.4, §3.3b):
//   briefing → tổng hợp bằng truy vấn (không qua model) gửi người tạo;
//   còn lại  → agent đã xuất bản chạy mục tiêu (+ danh sách đối tượng của mẫu chủ động / sự kiện kích hoạt). Tool = quyền agent ∩
//              người tạo (hiện tại) ∩ nhóm dữ liệu / công cụ của tác vụ; data scope ngoài nhóm dữ liệu → `none`; executor kiểm lại
//              mỗi lần gọi; `ask_before_send` bật → gửi qua hàng chờ duyệt (run dừng `waiting_approval`, `ai-resume` chạy tiếp).
// Kết quả (công cụ `report`) → tin trong phiên Trợ lý Cowork của người tạo; lỗi → thông báo `ai_task_failed`. Không giữ gì trong RAM.
import type { TenantDb } from '@appchat/db';
import { AI_TASK_TEMPLATES, SCOPE_MODULES, aiTaskAllows, aiTaskScopeModules, can, interpolate, serverMessages, type AiTaskTemplate, type AuthzContext, type PermissionKey } from '@appchat/shared';
import type { ToolExecutor } from '../../kernel/actions/executor';
import { writeOutbox, markDirty } from '../../kernel/outbox/outbox';
import type { KeyValueStore } from '../../kernel/redis';
import type { AppLogger } from '../../kernel/logger/logger';
import { connectedKeys, runToolIds } from '../agents/agent-tools';
import { agentSystem, agentToolSpecs } from '../agents/agent.runtime';
import { publishedAgent } from '../reply/reply-context';
import { appendMessage, openSession, type Part } from '../assistant/sessions';
import { MAX_STEPS, type AiRunner, type RunResult } from '../runs/runner';
import { RunStore, type RunRow } from '../runs/run.store';
import { buildBriefing } from './task-briefing';
import { eventRecordVisible } from '../../insights/services/renewal-suggestions';
import type { Place } from './task-place';
import { collectTargets, type Target } from './task-targets';
import type { TaskRow } from './task.store';
import { inEventTransaction } from '../../kernel/outbox/transaction';

export interface TaskRunDeps {
  executor: ToolExecutor;
  runner: AiRunner | null;
  kv: KeyValueStore;
  log: AppLogger;
  now: () => Date;
  place(ws: string): Promise<Place>;
  userName(userId: string): Promise<string>;
  commander(ws: string, userId: string): Promise<AuthzContext | null>;
  /** Credit còn lại của workspace (bản tin sáng) — null khi không đọc được. */
  credits(ws: string): Promise<number | null>;
}

/** Quyền hiệu lực của lượt chạy: data scope chỉ mở các module thuộc nhóm dữ liệu đã cấp (§3.3b "không rộng hơn người tạo"). */
export function narrowScope(a: AuthzContext, data: readonly string[]): AuthzContext {
  const open = aiTaskScopeModules(data);
  const scope = Object.fromEntries(SCOPE_MODULES.map((m) => [m, open.has(m) ? a.scope[m] : 'none'])) as AuthzContext['scope'];
  return { ...a, isOwner: false, scope };
}

/** Action id được dùng: agent đã cấp ∩ connector đã nối ∩ quyền người tạo ∩ nhóm dữ liệu / công cụ của tác vụ. */
export async function taskToolIds(db: TenantDb, agentTools: readonly string[], commander: AuthzContext, t: Pick<TaskRow, 'dataScope' | 'toolIds'>): Promise<string[]> {
  return runToolIds(agentTools, await connectedKeys(db), (a) => (a.permission === 'self' || can(commander, a.permission as PermissionKey)) && aiTaskAllows(a, t.dataScope, t.toolIds));
}

const fmtDate = (d: Date, tz: string, locale: string) => new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'vi-VN', { timeZone: tz, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(d);
const money = (n: bigint) => `${Number(n).toLocaleString('vi-VN')}₫`;

function targetLines(template: AiTaskTemplate, targets: Target[], place: Place): string[] {
  const tpl = serverMessages(place.locale).tasks.target[template as Exclude<AiTaskTemplate, 'briefing'>];
  return targets.map((x, i) => `${i + 1}. ${interpolate(tpl, { name: x.contact, date: fmtDate(x.at, place.timeZone, place.locale), code: x.ref ?? '', total: x.amount !== undefined ? money(x.amount) : '', conversation: x.conversation_id })}`);
}

/** Mục tiêu giao agent: khung + mục tiêu + hướng dẫn + đối tượng (mẫu chủ động) / sự kiện kích hoạt. */
export function taskPrompt(t: TaskRow, place: Place, userName: string, extra: { targets?: Target[]; event?: { topic: string; payload: Record<string, unknown> } }): { system: string; prompt: string } {
  const m = serverMessages(place.locale).tasks.frame;
  const lines = [interpolate(m.goal, { goal: t.goal })];
  if (t.prompt.trim()) lines.push(interpolate(m.note, { prompt: t.prompt.trim() }));
  if (extra.targets) {
    lines.push(extra.targets.length ? interpolate(m.targets, { n: extra.targets.length }) : m.none);
    lines.push(...targetLines(t.template as AiTaskTemplate, extra.targets, place));
    if (extra.targets.length && t.toolIds.includes('message')) lines.push(m.send);
  }
  if (extra.event) lines.push(interpolate(m.event, { topic: extra.event.topic, payload: JSON.stringify(extra.event.payload).slice(0, 1500) }));
  return { system: interpolate(m.head, { name: t.name, user: userName || '—' }), prompt: lines.join('\n') };
}

/** Gửi kết quả vào phiên Cowork của người tạo (công cụ `report`; bản tin sáng luôn gửi). */
async function report(db: TenantDb, t: TaskRow, runId: string, parts: Part[], now: Date) {
  const s = await openSession(db, t.createdByUserId, 'cowork', t.name, undefined, now);
  await appendMessage(db, s.id, 'assistant', parts, runId, now);
  return s.id;
}

async function notify(d: TaskRunDeps, db: TenantDb, ws: string, kind: 'ai_briefing' | 'ai_task_failed', userId: string, params: Record<string, string>, link: string) {
  await inEventTransaction(db, ws, (tx) => writeOutbox(tx, ws, [{ topic: 'notify.requested', payload: { kind, to: { user_ids: [userId] }, params, link } }], d.now()));
  await markDirty(d.kv, ws);
}

/** Kết thúc run thất bại có lý do đọc được (DC-133) + báo người tạo. */
async function fail(d: TaskRunDeps, db: TenantDb, ws: string, t: TaskRow, run: RunRow, reason: keyof ReturnType<typeof serverMessages>['tasks']['reason'], place: Place) {
  const text = serverMessages(place.locale).tasks.reason[reason];
  await new RunStore(db, d.now).finish(run.id, 'failed', { error: text });
  await notify(d, db, ws, 'ai_task_failed', t.createdByUserId, { name: t.name, reason: text }, '/assistant/cowork');
  return { status: 'failed' as const, reason };
}

/**
 * Sự kiện của job (TIP-012b P4): job mới chỉ mang id outbox nguồn → đọc lại payload ĐÃ COMMIT từ `outbox_event` (không tin dữ liệu trên
 * queue); job cũ còn mang payload thì dùng payload đó. Không tìm thấy → null (run bị huỷ, không đoán).
 */
async function eventOf(db: TenantDb, e: { topic: string; source_event_id?: string; payload?: Record<string, unknown> }) {
  if (!e.source_event_id) return e.payload ? { topic: e.topic, payload: e.payload } : null;
  const row = await db.outboxEvent.findUnique({ where: { id: e.source_event_id }, select: { topic: true, payload: true } });
  return row && row.topic === e.topic ? { topic: row.topic, payload: (row.payload ?? {}) as Record<string, unknown> } : null;
}

export async function runTask(d: TaskRunDeps, db: TenantDb, ws: string, job: { task_id: string; run_id: string; event?: { topic: string; source_event_id?: string; payload?: Record<string, unknown> } }) {
  const store = new RunStore(db, d.now);
  const run = await store.get(job.run_id);
  const t = await db.aiTask.findUnique({ where: { id: job.task_id } });
  if (!run || run.status !== 'queued' || !t) return { status: 'skipped' as const };
  const event = job.event ? await eventOf(db, job.event) : undefined;
  // Tác vụ đã xoá / tắt / đổi sự kiện sau khi nhận (run sự kiện), hoặc sự kiện nguồn không đọc được → huỷ, không gửi gì.
  if (t.deletedAt || (job.event && (!event || t.status !== 'active' || t.trigger !== 'event' || t.eventType !== job.event.topic))) {
    await store.finish(run.id, 'cancelled');
    return { status: 'skipped' as const };
  }
  const now = d.now();
  const place = await d.place(ws);
  await db.aiTask.update({ where: { id: t.id }, data: { lastRunAt: now, runCount: { increment: 1 } } });
  const commander = await d.commander(ws, t.createdByUserId);
  if (!commander) return done(db, t, await fail(d, db, ws, t, run, 'commander', place));
  // Sự kiện gắn bản ghi (hợp đồng — TIP-038): người tạo tác vụ phải còn đọc được bản ghi theo scope HIỆN TẠI (bị thu quyền → không chạy).
  if (event && !(await db.$transaction((tx) => eventRecordVisible(tx, narrowScope(commander, t.dataScope), event.payload)))) return done(db, t, await fail(d, db, ws, t, run, 'commander', place));

  if (t.template === 'briefing') {
    if (!(await store.claim(run.id, ['queued']))) return { status: 'skipped' as const };
    const b = await buildBriefing(db, commander, now, place, await d.credits(ws));
    const parts: Part[] = [{ type: 'text', text: [b.title, ...b.lines.map((l) => `• ${l.text}`), ...(b.lines.length ? [] : [b.summary])].join('\n') }, ...b.lines.map((l) => ({ type: 'ui_command' as const, command: { type: 'navigate' as const, route: l.route } }))];
    await report(db, t, run.id, parts, now);
    await store.finish(run.id, 'completed', { output: { text: b.summary, counts: b.counts } });
    await notify(d, db, ws, 'ai_briefing', t.createdByUserId, { summary: b.summary }, '/assistant');
    return done(db, t, { status: 'completed' as const });
  }

  const a = t.agentId ? await publishedAgent(db, t.agentId) : null;
  if (!a || !d.runner) return done(db, t, await fail(d, db, ws, t, run, 'agent', place));
  const targets = t.template && (AI_TASK_TEMPLATES as readonly string[]).includes(t.template) ? await collectTargets(db, t.template, t.params as Record<string, number>, narrowScope(commander, t.dataScope), now) : undefined;
  const { system, prompt } = taskPrompt(t, place, await d.userName(t.createdByUserId), { ...(targets ? { targets } : {}), ...(event ? { event } : {}) });
  const ids = await taskToolIds(db, a.cfg.tools, commander, t);
  const tools = agentToolSpecs(d.executor, ids, {
    workspaceId: ws,
    agent: { id: a.agent.id, toolIds: a.cfg.tools },
    commander,
    runId: run.id,
    source: 'task',
    ...(t.askBeforeSend ? {} : { autoSend: true }),
    narrow: (x) => narrowScope(x, t.dataScope),
    db,
  });
  await db.aiRun.update({ where: { id: run.id }, data: { agentVersion: a.version, input: { goal: prompt.slice(0, 4000), ...(event ? { event: event.topic } : {}) } } });
  let r: RunResult;
  try {
    r = await d.runner.start(ws, store, run, { system: `${agentSystem(a.cfg)}\n\n${system}`, messages: [{ role: 'user', content: prompt }], tools, maxSteps: MAX_STEPS.agent, source: 'task' });
  } catch (err) {
    d.log.warn({ err, task: t.id }, 'ai-task lỗi');
    return done(db, t, await fail(d, db, ws, t, run, 'error', place));
  }
  if (r.status === 'failed') return done(db, t, await fail(d, db, ws, t, (await store.get(run.id)) ?? run, r.error?.code === 'CREDIT_EXHAUSTED' ? 'credit' : 'error', place));
  if (t.toolIds.includes('report')) {
    const m = serverMessages(place.locale).tasks.report;
    const tail = r.status === 'waiting_approval' ? m.waiting : interpolate(m.done, { credits: r.creditsUsed });
    await report(db, t, run.id, [{ type: 'text', text: [interpolate(m.title, { name: t.name }), r.text.trim(), tail].filter(Boolean).join('\n\n') }], d.now());
  }
  return done(db, t, { status: r.status });
}

async function done<T extends { status: string }>(db: TenantDb, t: TaskRow, r: T): Promise<T> {
  await db.aiTask.update({ where: { id: t.id }, data: { lastRunStatus: r.status } });
  return r;
}
