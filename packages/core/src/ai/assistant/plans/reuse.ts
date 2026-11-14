// Tái dùng cấu trúc kế hoạch cũ (TIP-023d §4.1-4.3). Ứng viên chỉ sinh từ plan đã `completed` (mọi bước succeeded / skipped, không còn
// claim chưa rõ) — cấu trúc an toàn: kind + action_id / agent_id + phụ thuộc tương đối + nhãn registry hiện hành. KHÔNG chép title /
// instructions riêng của người dùng, id bản ghi / tệp, input đã chọn, kết quả, biên nhận, token, trạng thái cũ.
// `plan_reuse` tạo plan `draft` MỚI của chủ (mọi bước pending, nguồn = source plan + revision) — không chạy gì, không gắn root; gửi
// lượt mới mới chốt và chạy với quyền hiện hành.
import { registry } from '@appchat/actions';
import { AppError, interpolate, serverMessages } from '@appchat/shared';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { uuidv7 } from '../../../kernel/ids';
import { entityOf } from '../catalog';

const DEFS = new Map(registry.map((a) => [a.id, a]));

/** Một bước của cấu trúc tái dùng — chỉ dữ liệu không riêng tư. `deps` = vị trí (0-based) các bước trước. */
export interface ReuseStep {
  kind: 'action' | 'delegate' | 'analysis';
  target: string | null;
  deps: number[];
}

/** Nhãn chung từ registry (giống thẻ xác nhận): "Tạo khách hàng"; bước phân tích / giao việc → nhãn loại bước. */
export function genericLabel(s: Pick<ReuseStep, 'kind' | 'target'>, locale: string): string {
  const m = serverMessages(locale).ai.assistant;
  if (s.kind !== 'action' || !s.target) return s.kind === 'delegate' ? m.planReuse.delegate : m.planReuse.analysis;
  const def = DEFS.get(s.target);
  if (!def) return m.planReuse.analysis;
  const verb = (m.verbOf as Record<string, string>)[def.id] ?? (/\.create(_and_publish)?$/.test(def.id) ? m.verb.create : m.verb[def.risk]);
  const entity = (m.entity as Record<string, string>)[entityOf(def.id)] ?? (m.module as Record<string, string>)[def.module] ?? def.module;
  return interpolate(m.card.title, { verb, entity });
}

/** Tên chung của cả cấu trúc = nhãn các bước hành động (tối đa 3) nối bằng "→". */
export const genericTitle = (steps: readonly ReuseStep[], locale: string): string =>
  steps.map((s) => genericLabel(s, locale)).slice(0, 3).join(' → ').slice(0, 200);

/** Plan vừa `completed` → ghi ứng viên tái dùng (một mỗi plan + revision). Chỉ khi không còn claim chưa xong. */
export async function recordReusable(tx: TenantTx, planId: string, now: Date, locale = 'vi'): Promise<void> {
  const plan = await tx.assistantPlan.findUnique({ where: { id: planId }, select: { ownerUserId: true, revision: true, phase: true } });
  if (!plan || plan.phase !== 'completed') return;
  if (await tx.assistantPlanPrimaryClaim.count({ where: { planId, phase: { in: ['admitted', 'accepted'] } } })) return;
  const steps = await tx.assistantPlanStep.findMany({ where: { planId }, orderBy: { position: 'asc' }, select: { id: true, kind: true, actionOrAgentId: true, dependsOn: true } });
  const pos = new Map(steps.map((s, i) => [s.id, i]));
  // Giao việc: agent cụ thể là lựa chọn của lần trước — cấu trúc chỉ giữ "có bước giao việc", người chọn agent lại lúc dùng.
  const structure: ReuseStep[] = steps.map((s) => ({ kind: s.kind, target: s.kind === 'action' ? s.actionOrAgentId : null, deps: s.dependsOn.map((d) => pos.get(d)!).filter((n) => n !== undefined) }));
  const exists = await tx.assistantPlanReuseCandidate.findFirst({ where: { sourcePlanId: planId, sourceRevision: plan.revision }, select: { id: true } });
  if (exists) return;
  await tx.assistantPlanReuseCandidate.create({
    data: { id: uuidv7(now.getTime()), ownerUserId: plan.ownerUserId, sourcePlanId: planId, sourceRevision: plan.revision, genericTitle: genericTitle(structure, locale), structure: structure as object, eligible: true, createdAt: now, updatedAt: now },
  });
}

/** Ứng viên của chủ, đọc lại theo quyền hiện hành: action trong cấu trúc phải còn đăng ký + còn handler; không thì không dùng được. */
export async function ownCandidate(tx: TenantTx, ownerUserId: string, id: string, isImplemented: (actionId: string) => boolean) {
  const c = await tx.assistantPlanReuseCandidate.findUnique({ where: { id } });
  if (!c || c.ownerUserId !== ownerUserId || !c.eligible) throw new AppError('NOT_FOUND', 404, { candidate_id: 'not_found' });
  const structure = c.structure as unknown as ReuseStep[];
  if (structure.some((s) => s.kind === 'action' && (!s.target || !DEFS.has(s.target) || !isImplemented(s.target)))) throw new AppError('CONFLICT', 409, { candidate_id: 'structure_unavailable' });
  return { candidate: c, structure };
}

/** Plan draft mới từ cấu trúc: tiêu đề bước = nhãn chung (người sửa lại trước khi gửi), instructions rỗng, mọi bước pending. */
export async function createDraftFrom(tx: TenantTx, a: { ownerUserId: string; sessionId: string; sourcePlanId: string; sourceRevision: number; structure: readonly ReuseStep[]; now: Date; locale: string }): Promise<{ id: string; revision: number }> {
  const id = uuidv7(a.now.getTime());
  const ids = a.structure.map(() => uuidv7(a.now.getTime()));
  await tx.assistantPlan.create({ data: { id, ownerUserId: a.ownerUserId, sessionId: a.sessionId, rootRunId: null, revision: 1, planEpoch: 0, phase: 'draft', sourcePlanId: a.sourcePlanId, sourceRevision: a.sourceRevision, createdAt: a.now, updatedAt: a.now } });
  for (let i = 0; i < a.structure.length; i++) {
    const s = a.structure[i]!;
    await tx.assistantPlanStep.create({
      data: { planId: id, id: ids[i]!, position: i + 1, kind: s.kind, title: genericLabel(s, a.locale), instructions: '', actionOrAgentId: s.kind === 'action' ? s.target : null, dependsOn: s.deps.filter((d) => d < i).map((d) => ids[d]!), state: 'pending', executionGeneration: 1, createdAt: a.now, updatedAt: a.now },
    });
  }
  return { id, revision: 1 };
}
