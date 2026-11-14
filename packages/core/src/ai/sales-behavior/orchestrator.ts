// Điều phối câu trả lời bán hàng của lượt kênh (TIP-022c §3.5–3.6) — gọi từ `decide` của reply.service SAU cổng trích dẫn, TRƯỚC luật
// chuyển người / gửi. Hai nhánh:
//   có `sales_plan` hợp lệ → quan sát tồn HIỆN TẠI (quyền đọc hiện hành của agent) → câu server dựng (response.ts) thay chữ model; lệch dữ
//                            liệu / `unknown` → chuyển người, nháp là câu trung thực server dựng (không giữ lời hứa cũ của model);
//   không kế hoạch          → lượt dùng công cụ sản phẩm / báo giá / bất kỳ câu nào có khẳng định thương mại phải qua lượt kiểm chỉ đọc
//                            (response-check.ts, cùng ngân sách gốc); có khẳng định không căn cứ / không đọc được → chặn tự gửi.
// Không giữ hàng, không đổi tồn, không ETA. Không phải giấy phép gửi: luật chuyển người / gửi của lượt vẫn áp như cũ. Câu server dựng (gửi /
// nháp / gợi ý) ghi căn cứ `ai_sales_publication` theo run TRƯỚC khi rời lượt — ghi tin / đặt chỗ gửi quan sát lại (publication.ts, P4).
import type { AgentReply } from '@appchat/ai';
import type { TenantDb } from '@appchat/db';
import type { AuthzContext } from '@appchat/shared';
import type { AiRunner } from '../runs/runner';
import { agentAuthz } from '../agents/agent-authz';
import { scheduleOf } from '../agents/schedule-config';
import { groundStock } from './stock';
import { renderSalesResponse } from './response';
import { checkResponse, type CommercialClaim } from './response-check';
import { recordPublication } from './publication';

/** Action đọc / ghi thương mại — lượt có gọi một trong số này thì câu trả lời luôn qua bước kiểm. */
const COMMERCE_TOOLS = /^(product|stock|quote|order|invoice|payment)\./;
/** Lý do chuyển người (khoá `ai.handoff.*`). */
export type SalesReason = 'sales_plan_invalid' | 'sales_stock_changed' | 'sales_stock_unknown' | 'sales_claim_ungrounded' | 'sales_check_failed';

export type SalesGateResult =
  | { kind: 'pass'; reply: string | null; grounded?: { observationDigest: string; productIds: string[] } }
  | { kind: 'handoff'; reason: SalesReason; draft: string | null; claims?: CommercialClaim[] };

export interface SalesGateDeps {
  db: TenantDb;
  runner: AiRunner;
  now: () => Date;
  ws: string;
  runId: string;
  conversationId: string;
  agent: { id: string; toolIds: readonly string[] };
  cfg: { language?: string; model_tier: string; weekly_schedule?: unknown };
  /** Khôi phục mã PII che trong lượt (phần dẫn của model gửi khách). */
  unmask: (s: string) => string;
}

const DEFAULT_TZ = 'Asia/Ho_Chi_Minh';

/** Agent được cấp công cụ thương mại, hoặc lượt đã gọi (kể cả lỗi) — câu trả lời không kế hoạch phải qua bước kiểm. */
async function commerceTurn(db: TenantDb, runId: string, toolIds: readonly string[]): Promise<boolean> {
  if (toolIds.some((t) => COMMERCE_TOOLS.test(t))) return true;
  const steps = await db.aiRunStep.findMany({ where: { runId, type: 'tool' }, select: { actionId: true } });
  return steps.some((s) => !!s.actionId && COMMERCE_TOOLS.test(s.actionId));
}

export async function gateSalesReply(d: SalesGateDeps, out: AgentReply, reply: string | null): Promise<SalesGateResult> {
  const locale = d.cfg.language === 'en' ? 'en' : 'vi';
  const plan = out.sales_plan;
  if (plan === 'invalid') return { kind: 'handoff', reason: 'sales_plan_invalid', draft: null };
  if (plan) {
    // Quyền đọc HIỆN TẠI của agent trực kênh (grant đã xuất bản) — mất grant → `unknown`, không bao giờ "còn hàng".
    const authz: AuthzContext = agentAuthz(d.agent);
    const now = d.now();
    const items = plan.items.map((i) => ({ productId: i.product_id, qty: i.qty }));
    const alternatives = plan.alternatives.map((id) => ({ productId: id, qty: plan.items[0]!.qty }));
    const observed = await groundStock(d.db, authz, items, now);
    const alts = alternatives.length ? await groundStock(d.db, authz, alternatives, now) : null;
    const timeZone = scheduleOf(d.cfg.weekly_schedule)?.timezone ?? DEFAULT_TZ;
    const r = renderSalesResponse({ ...plan, narrative: d.unmask(plan.narrative) }, observed, alts, { locale, timeZone });
    await recordPublication(d.db, { runId: d.runId, conversationId: d.conversationId, agentId: d.agent.id, items, alternatives, observed, alts, content: r.text }, now);
    if (r.kind === 'mismatch') return { kind: 'handoff', reason: 'sales_stock_changed', draft: r.text };
    if (r.kind === 'unknown') return { kind: 'handoff', reason: 'sales_stock_unknown', draft: r.text };
    // Phần dẫn của model vẫn có thể lén khẳng định — kiểm riêng phần dẫn (câu server dựng là có căn cứ).
    if (plan.narrative.trim()) {
      const v = await checkResponse(check(d, locale), plan.narrative);
      if (v.kind !== 'clean') return { kind: 'handoff', reason: v.kind === 'claims' ? 'sales_claim_ungrounded' : 'sales_check_failed', draft: r.text, ...(v.kind === 'claims' ? { claims: v.claims } : {}) };
    }
    return { kind: 'pass', reply: r.text, grounded: { observationDigest: r.observationDigest, productIds: r.productIds } };
  }
  if (!reply || !(await commerceTurn(d.db, d.runId, d.agent.toolIds))) return { kind: 'pass', reply };
  const v = await checkResponse(check(d, locale), reply);
  if (v.kind === 'clean') return { kind: 'pass', reply };
  return { kind: 'handoff', reason: v.kind === 'claims' ? 'sales_claim_ungrounded' : 'sales_check_failed', draft: reply, ...(v.kind === 'claims' ? { claims: v.claims } : {}) };
}

const check = (d: SalesGateDeps, locale: 'vi' | 'en') => ({ db: d.db, runner: d.runner, now: d.now, ws: d.ws, parentRunId: d.runId, conversationId: d.conversationId, locale, tier: d.cfg.model_tier });
