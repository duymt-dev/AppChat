// Agent chuyên trách đã chọn cho lượt Cowork (TIP-023d §5.1, §5.3-5.6). Danh tính = UUID + phiên bản ĐÃ XUẤT BẢN ghim lúc nhận lượt (tên /
// vai trò chỉ để hiển thị). Ghim nằm trong `ai_run.input.selected_agent` (server ghi) → mọi đường chạy tiếp (xác nhận, duyệt, sửa kế hoạch,
// worker khởi động lại) dựng lại từ đó, không nhận từ model. Agent tạm dừng / xoá / bỏ xuất bản / xuất bản bản mới → chặn rõ ràng
// (AGENT_UNAVAILABLE), không rơi về agent khác cùng vai trò / tên, không âm thầm dùng quyền đầy đủ của Trợ lý.
//   - run gốc: lập / điều phối kế hoạch (assistant.plan_*) + tra cứu trong phạm vi quyền agent ∩ người ra lệnh; ghi nghiệp vụ → delegate;
//   - đúng MỘT run con của agent đã chọn mỗi (run gốc, plan_epoch); tool = grant agent ∩ người ra lệnh hiện hành ∩ chế độ, kiểm mỗi lần gọi;
//   - mức AI của run con = mức cấu hình đã xuất bản của agent, hạ theo gói (không lấy mức người dùng chọn cho Trợ lý).
import type { ActionDef } from '@appchat/actions';
import type { TenantDb } from '@appchat/db';
import { AI_TIERS, AppError, tierAllowed, type AiTierKey, type AuthzContext } from '@appchat/shared';
import { agentAuthz } from '../../agents/agent-authz';
import { publishedAgent } from '../../reply/reply-context';
import { decideStep, type StepDecision } from './driver';

export interface SelectedAgent {
  id: string;
  version: number;
  /** Mức AI hiệu lực của run con (cấu hình đã xuất bản, hạ theo gói lúc nhận lượt). */
  tier: AiTierKey;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Mức cấu hình của agent hạ về mức cao nhất gói cho phép (cùng cổng gói như Trợ lý — không giá / công thức mới). */
export function eligibleTier(want: string, planKey: string): AiTierKey {
  const start = (AI_TIERS as readonly string[]).includes(want) ? AI_TIERS.indexOf(want as AiTierKey) : 0;
  for (let i = start; i >= 0; i--) if (tierAllowed(AI_TIERS[i]!, planKey)) return AI_TIERS[i]!;
  return 'standard';
}

/** Lúc nhận lượt: agent phải đang chạy + đã xuất bản. Không có / tạm dừng / chưa xuất bản / xoá → cùng một 404 (không lộ lý do). */
export async function pinSelected(db: TenantDb, id: string, planKey: string): Promise<SelectedAgent> {
  const a = UUID.test(id) ? await publishedAgent(db, id) : null;
  if (!a) throw new AppError('NOT_FOUND', 404, { selected_agent_id: 'unavailable' });
  return { id: a.agent.id, version: a.version, tier: eligibleTier(a.cfg.model_tier, planKey) };
}

/** Đọc ghim từ `ai_run.input` (server ghi) — sai khuôn → bỏ, không tin dữ liệu lạ. */
export function selectedOf(raw: unknown): SelectedAgent | undefined {
  const s = raw as Partial<SelectedAgent> | null | undefined;
  return s && typeof s.id === 'string' && UUID.test(s.id) && Number.isInteger(s.version) && (AI_TIERS as readonly string[]).includes(s.tier ?? '')
    ? { id: s.id, version: s.version!, tier: s.tier! }
    : undefined;
}

export const selectedCtx = (input: { selected_agent?: unknown }): { selected?: SelectedAgent } => {
  const s = selectedOf(input.selected_agent);
  return s ? { selected: s } : {};
};

/** Agent đúng bản đã ghim, còn chạy. Đã xuất bản bản mới → null (cấu hình mới không thay bản đã ghim). */
export async function pinnedAgent(db: TenantDb, s: SelectedAgent) {
  const a = await publishedAgent(db, s.id);
  return a && a.version === s.version ? a : null;
}

export type RootAuthority = { ok: true; authz: AuthzContext } | { ok: false; code: string; message: string };

/** Quyền lời gọi của run gốc khi đã chọn agent: plan_* theo người dùng; tra cứu theo agent ∩ người dùng; ghi nghiệp vụ → phải giao. */
export async function rootAuthority(db: TenantDb, s: SelectedAgent, commander: AuthzContext, def: Pick<ActionDef, 'id' | 'risk'>): Promise<RootAuthority> {
  if (def.id.startsWith('assistant.plan_')) return { ok: true, authz: commander };
  const a = await pinnedAgent(db, s);
  if (!a) return { ok: false, code: 'AGENT_UNAVAILABLE', message: 'Agent đã chọn không còn chạy đúng phiên bản đã chọn — báo người dùng bỏ chọn hoặc chọn agent khác' };
  if (def.risk !== 'read') return { ok: false, code: 'SELECTED_AGENT_ONLY', message: `Người dùng đã chọn agent ${a.agent.name} — thao tác ghi phải giao cho agent này bằng delegate` };
  return { ok: true, authz: agentAuthz({ id: a.agent.id, toolIds: a.cfg.tools }, commander) };
}

/** Ràng bước kế hoạch cho lời gọi ghi của run con dưới gốc có kế hoạch (cùng cổng claim với run gốc — §5.4). */
export const childPlanGuard = (db: TenantDb, rootRunId: string) => (actionId: string): Promise<StepDecision> => decideStep(db, rootRunId, actionId);

/** Khoá run con duy nhất của agent đã chọn dưới gốc: một con mỗi plan_epoch (sửa kế hoạch → con mới cho phần còn lại). */
export async function selectedChildKey(db: Pick<TenantDb, 'assistantPlan'>, rootRunId: string): Promise<string> {
  const plan = await db.assistantPlan.findUnique({ where: { rootRunId }, select: { planEpoch: true } });
  return `selected:${plan?.planEpoch ?? 0}`;
}

export const isSelectedChild = (childKey: string | null | undefined): boolean => !!childKey?.startsWith('selected:');
