// Mock kế hoạch Cowork (TIP-023d §6) — cùng hợp đồng server: GET /assistant/sessions/:id/plan (chiếu tiến độ), GET /assistant/agent-choices
// (keyset, chỉ agent đang chạy + đã xuất bản), action plan_request_edit / plan_update / plan_resume / plan_reusable / plan_reuse. Mock không
// gọi model: lượt Cowork có chữ "kế hoạch" sinh một kế hoạch 3 bước mẫu (bước 1 đã xong — biên nhận giả lập), không tự đánh "xong" bước khác.
import { ApiRequestError } from '@appchat/shared';

/** Chỉ phần state cần đọc (agent cho picker) + hình handler — không import store / handlers để tránh vòng phụ thuộc mock. */
type Db = { agents: { agents: { id: string; name: string; role?: string; role_label: string; model_tier: string; status: string; deleted?: boolean }[] } };
type Handler = { execute(db: Db, input: never): unknown };

type Phase = 'draft' | 'active' | 'pause_requested' | 'paused' | 'editing' | 'resuming' | 'completed' | 'cancelled' | 'failed';
interface Step { id: string; position: number; kind: 'action' | 'delegate' | 'analysis'; title: string; instructions: string; action_or_agent_id: string | null; depends_on: string[]; state: string }
interface Plan { id: string; session_id: string; root_run_id: string | null; revision: number; plan_epoch: number; phase: Phase; selected_agent_id: string | null; source_plan_id: string | null; steps: Step[]; created_at: string; updated_at: string }

const plans = new Map<string, Plan>();
const candidates = [{ id: '0190f0c1-0000-7000-8000-000000000001', source_plan_id: '0190f0c1-0000-7000-8000-000000000000', source_revision: 1, generic_title: 'Tạo khách hàng → Tạo báo giá', step_count: 2, actions: ['contact.create', 'quote.create'], tokens: ['khach', 'bao', 'gia'] }];
let seq = 0;
/** Id dạng UUID như server (input action kiểm `uuid`). */
const uid = () => `0190f0b1-0000-7000-8000-${String(++seq).padStart(12, '0')}`;
const now = () => new Date().toISOString();
const notFound = () => new ApiRequestError(404, { code: 'NOT_FOUND', message: 'plan', fields: { plan_id: 'not_found' } });
const conflict = () => new ApiRequestError(409, { code: 'CONFLICT', message: 'revision', fields: { if_revision: 'stale' } });
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').toLowerCase();

export const resetPlans = () => plans.clear();

/** Lượt Cowork "lập kế hoạch…" → kế hoạch mẫu gắn phiên (đủ để thẻ / sửa / tiếp tục chạy được trên mock). */
export function planForTurn(session: string, mode: string, text: string, draft?: { plan_id: string } | null) {
  if (draft) {
    const d = plans.get(draft.plan_id);
    if (d && d.phase === 'draft' && d.session_id === session) Object.assign(d, { phase: 'active', root_run_id: uid(), updated_at: now() });
    return;
  }
  if (mode !== 'cowork' || !/kế hoạch|ke hoach|plan/i.test(text)) return;
  const id = uid();
  const ids = [uid(), uid(), uid()];
  const step = (i: number, title: string, action: string, state: string): Step => ({ id: ids[i - 1]!, position: i, kind: 'action', title, instructions: '', action_or_agent_id: action, depends_on: i > 1 ? [ids[i - 2]!] : [], state });
  plans.set(id, {
    id, session_id: session, root_run_id: uid(), revision: 1, plan_epoch: 0, phase: 'active', selected_agent_id: null, source_plan_id: null,
    steps: [step(1, 'Tạo khách hàng', 'contact.create', 'succeeded'), step(2, 'Tạo báo giá', 'quote.create', 'waiting_confirmation'), step(3, 'Gửi báo giá', 'quote.send', 'pending')],
    created_at: now(), updated_at: now(),
  });
}

const dto = (p: Plan) => ({ ...p, progress: p.steps.length ? p.steps.filter((s) => s.state === 'succeeded').length / p.steps.length : 0 });
const own = (planId: string) => plans.get(planId) ?? (() => { throw notFound(); })();
const control = (i: { plan_id: string; if_revision: number }) => {
  const p = own(i.plan_id);
  if (p.revision !== i.if_revision) throw conflict();
  return p;
};
const out = (p: Plan) => ({ plan_id: p.id, revision: p.revision, plan_epoch: p.plan_epoch, phase: p.phase });

export const assistantPlanParamRoute = (path: string) => {
  const m = path.match(/^\/assistant\/sessions\/([^/]+)\/plan$/);
  if (!m) return null;
  return () => {
    const sid = decodeURIComponent(m[1]!);
    const rows = [...plans.values()].filter((p) => p.session_id === sid).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    return { data: rows[0] ? dto(rows[0]) : null };
  };
};

export const assistantPlanRoutes: Record<string, (db: Db, p: Record<string, unknown>) => unknown> = {
  '/assistant/agent-choices': (db, p) => {
    const limit = Math.min(Number(p.limit) || 30, 100);
    const rows = db.agents.agents.filter((a) => !a.deleted && a.status === 'active');
    const start = p.cursor ? Number(atob(String(p.cursor))) : 0;
    const page = rows.slice(start, start + limit);
    return { data: page.map((a) => ({ id: a.id, name: a.name, role: a.role ?? 'custom', role_label: a.role_label, model_tier: a.model_tier })), next_cursor: start + limit < rows.length ? btoa(String(start + limit)) : null };
  },
};

type Ctl = { plan_id: string; if_revision: number };
export const assistantPlanHandlers: Record<string, Handler> = {
  // Sửa: dừng nhận việc mới; mock không có việc đang dở → xả xong ngay (`paused`).
  'assistant.plan_request_edit': { execute: (_db, i: Ctl) => {
    const p = control(i);
    if (p.phase === 'active') Object.assign(p, { phase: 'paused', plan_epoch: p.plan_epoch + 1, updated_at: now() });
    return out(p);
  } },
  'assistant.plan_update': { execute: (_db, i: Ctl & { ops: { op: string; step_id: string; after_step_id?: string | null; patch?: { title?: string } }[] }) => {
    const p = control(i);
    if (p.phase !== 'paused') throw conflict();
    for (const o of i.ops) {
      const s = p.steps.find((x) => x.id === o.step_id);
      if (!s || s.state !== 'pending') throw new ApiRequestError(409, { code: 'CONFLICT', message: 'step', fields: { step_id: 'locked' } });
      if (o.op === 'update' && o.patch?.title) s.title = o.patch.title;
      if (o.op === 'remove') p.steps = p.steps.filter((x) => x.id !== s.id);
      if (o.op === 'move') {
        p.steps = p.steps.filter((x) => x.id !== s.id);
        p.steps.splice(o.after_step_id ? p.steps.findIndex((x) => x.id === o.after_step_id) + 1 : 0, 0, s);
      }
    }
    p.steps.forEach((s, k) => (s.position = k + 1));
    Object.assign(p, { revision: p.revision + 1, updated_at: now() });
    return out(p);
  } },
  'assistant.plan_resume': { execute: (_db, i: Ctl) => {
    const p = control(i);
    if (p.phase !== 'paused') throw conflict();
    Object.assign(p, { phase: 'active', updated_at: now() });
    return out(p);
  } },
  'assistant.plan_reusable': { execute: (_db, i: { limit?: number; text?: string }) => {
    const q = i.text ? fold(i.text).split(/[^a-z0-9]+/).filter((t) => t.length > 1) : [];
    const rows = candidates.filter((c) => !q.length || q.some((t) => c.tokens.includes(t)));
    return { candidates: rows.slice(0, i.limit ?? 3).map(({ actions: _a, tokens: _t, ...c }) => c) };
  } },
  'assistant.plan_reuse': { execute: (_db, i: { candidate_id: string; session_id: string }) => {
    const c = candidates.find((x) => x.id === i.candidate_id);
    if (!c) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: 'candidate', fields: { candidate_id: 'not_found' } });
    const id = uid();
    plans.set(id, {
      id, session_id: i.session_id, root_run_id: null, revision: 1, plan_epoch: 0, phase: 'draft', selected_agent_id: null, source_plan_id: c.source_plan_id,
      steps: c.actions.map((a, k) => ({ id: uid(), position: k + 1, kind: 'action' as const, title: c.generic_title.split(' → ')[k] ?? a, instructions: '', action_or_agent_id: a, depends_on: [], state: 'pending' })),
      created_at: now(), updated_at: now(),
    });
    return { plan_id: id, revision: 1, phase: 'draft' };
  } },
};
