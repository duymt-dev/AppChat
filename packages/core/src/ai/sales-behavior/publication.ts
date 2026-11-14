// Căn cứ công bố của câu trả lời bán hàng (TIP-022c §3.7–3.8, §8a): câu server dựng ghi một dòng `ai_sales_publication` theo run (sản phẩm
// hỏi + thay thế + digest sự thật HIỂN THỊ + digest chữ). Tham chiếu mờ phía client vẫn là run (`ai_draft_ref` / gợi ý copilot / outbox
// `knowledge_run_id`) — không client nào gửi kế hoạch. Ghi tin người kèm nháp (quyền người gửi HIỆN TẠI) và đặt chỗ gửi (send-fence, ngay
// trước kênh) quan sát lại tồn qua cổng kernel trong CHÍNH transaction đó: sự thật làm đổi câu khách thấy (kết luận / giá / tên / thay thế
// hiện ra) đã đổi → 409 / không gửi, không bao giờ âm thầm sửa chữ sau khi người đã xác nhận. Giờ kiểm không tính (câu nói rõ "lúc kiểm").
import { createHash } from 'node:crypto';
import type { TenantDb } from '@appchat/db';
import { AppError, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { uuidv7 } from '../../kernel/ids';
import { isPrivacyFenced } from '../../kernel/privacy/guard';
import { observeStock, type StockObservation, type StockObservationResult, type StockRequest } from '../../kernel/actions/sales-publication';
import { agentAuthz } from '../agents/agent-authz';
import { blankConfig, merge, type AgentConfig } from '../agents/agent.store';
import { verifiedAlternatives } from './alternatives';
import { canReadStock } from './stock';

export type PublicationCheck = 'ok' | 'stock_changed' | 'stock_unverified' | 'content_changed' | 'invalidated';

const sha = (s: string) => createHash('sha256').update(s).digest('hex');
/** Digest chữ gửi khách (đã trim như `message.send`). */
export const contentDigest = (text: string) => sha(text.trim());

/** Sự thật HIỂN THỊ của câu tồn / giá (kết luận, tên, mã, đơn vị, giá; thay thế chỉ khi được nêu) — số tồn không nêu và giờ kiểm không tính. */
export function visibleDigests(requested: readonly StockObservation[], alts: readonly StockObservation[] | null): { items: string; alternatives: string } {
  const items = sha(JSON.stringify(requested.map((o) => [o.productId, o.qty, o.claim, o.name, o.code, o.unit, o.price, o.type])));
  const shown = alts && requested.some((o) => o.claim === 'shortage') ? verifiedAlternatives(requested.map((o) => o.productId), alts) : [];
  return { items, alternatives: shown.length ? sha(JSON.stringify(shown.map((o) => [o.productId, o.name, o.unit, o.price]))) : '' };
}

export interface PublicationInput {
  runId: string;
  conversationId: string;
  agentId: string | null;
  items: StockRequest[];
  alternatives: StockRequest[];
  observed: StockObservationResult;
  alts: StockObservationResult | null;
  /** Câu server dựng (gửi / nháp / gợi ý). */
  content: string;
}

/** Ghi (hoặc thay khi run chạy tiếp dựng lại) căn cứ của câu đã dựng — TRƯỚC khi chữ được gửi / thành nháp / gợi ý. */
export async function recordPublication(db: Pick<TenantDb, 'aiSalesPublication'>, p: PublicationInput, now: Date): Promise<void> {
  const v = visibleDigests(p.observed.items, p.alts?.items ?? null);
  const data = {
    conversationId: p.conversationId,
    agentId: p.agentId,
    items: p.items.map((i) => ({ product_id: i.productId, qty: i.qty })),
    alternatives: p.alternatives.map((i) => ({ product_id: i.productId, qty: i.qty })),
    observationDigest: v.items,
    alternativesDigest: v.alternatives,
    contentDigest: contentDigest(p.content),
  };
  await db.aiSalesPublication.upsert({ where: { runId: p.runId }, create: { id: uuidv7(now.getTime()), runId: p.runId, ...data, createdAt: now }, update: data });
}

type Row = { conversation_id: string; agent_id: string | null; items: unknown; alternatives: unknown; observation_digest: string; alternatives_digest: string; content_digest: string; state: string };

const requests = (v: unknown): StockRequest[] =>
  (Array.isArray(v) ? v : []).map((x: { product_id?: unknown; qty?: unknown }) => ({ productId: String(x.product_id), qty: Number(x.qty) }));

/**
 * Quyền đọc HIỆN TẠI của agent đã ghi câu (phiên bản đang xuất bản — cùng luật `publishedAgent` của reply-context, đọc trực tiếp để
 * đường gửi không kéo runtime trả lời) — tạm dừng / xoá / chưa xuất bản / mất grant → không kiểm được.
 */
async function agentGrant(tx: TenantTx, agentId: string | null): Promise<AuthzContext | null> {
  const a = agentId ? await tx.aiAgent.findUnique({ where: { id: agentId } }) : null;
  if (!a || a.deletedAt || a.status !== 'active' || !a.publishedVersion) return null;
  const v = await tx.aiAgentVersion.findUnique({ where: { agentId_version: { agentId: a.id, version: a.publishedVersion } } });
  return v ? agentAuthz({ id: a.id, toolIds: merge(blankConfig(a.name), v.config as Partial<AgentConfig>).tools }) : null;
}

/**
 * Kiểm căn cứ của run trong transaction của bên gọi (không Executor lồng / mạng / model). Không có dòng → `ok` (tin không phải câu bán hàng
 * có kế hoạch). `authz`: người gửi hiện tại / `'agent'` (grant hiện hành của agent) / bỏ trống = chỉ so sự thật (người gửi đã kiểm lúc ghi).
 * `content`: chữ sắp gửi phải đúng câu server dựng (tin agent).
 */
export async function checkPublication(tx: TenantTx, runId: string | null, o: { now: Date; authz?: AuthzContext | 'agent'; content?: string }): Promise<PublicationCheck> {
  if (!runId) return 'ok';
  const [p] = await tx.$queryRaw<Row[]>`
    SELECT conversation_id, agent_id, items, alternatives, observation_digest, alternatives_digest, content_digest, state
      FROM ai_sales_publication WHERE run_id = ${runId}::uuid`;
  if (!p) return 'ok';
  if (p.state !== 'active') return 'invalidated';
  // "Quên khách" có hiệu lực ngay từ lúc nhận (trước pha xoá) — không công bố tiếp.
  const conv = await tx.conversation.findUnique({ where: { id: p.conversation_id }, select: { contactId: true } });
  if (!conv || (conv.contactId && (await isPrivacyFenced(tx, conv.contactId)))) return 'invalidated';
  if (o.content !== undefined && contentDigest(o.content) !== p.content_digest) return 'content_changed';
  if (o.authz !== undefined) {
    const authz = o.authz === 'agent' ? await agentGrant(tx, p.agent_id) : o.authz;
    if (!authz || !canReadStock(authz)) return 'stock_unverified';
  }
  const items = requests(p.items);
  const alts = requests(p.alternatives);
  // Một lô đọc (sản phẩm hỏi + thay thế), thứ tự id cố định trong bộ quan sát.
  const seen = await observeStock(tx, [...items, ...alts], o.now);
  const v = visibleDigests(seen.items.slice(0, items.length), alts.length ? seen.items.slice(items.length) : null);
  if (v.items === p.observation_digest && v.alternatives === p.alternatives_digest) return 'ok';
  // Đọc không được (bộ quan sát chưa nạp / sản phẩm không còn đọc được) khác với tồn đã đổi — cả hai đều không gửi.
  return seen.items.some((i) => i.claim === 'unknown' && (i.reason === 'unavailable' || i.reason === 'read_denied')) ? 'stock_unverified' : 'stock_changed';
}

/** Gửi nháp / gợi ý AI của người (`message.send.ai_draft_ref`): kiểm dưới quyền người gửi — đổi → 409 `ai_draft: <lý do>`, chữ không bị sửa. */
export async function assertDraftPublication(tx: TenantTx, runId: string, authz: AuthzContext, now: Date): Promise<void> {
  const r = await checkPublication(tx, runId, { now, authz });
  if (r !== 'ok') throw new AppError('INVALID_STATE', 409, { ai_draft: r });
}

/**
 * Đặt chỗ gửi (send-fence): tin agent phải đúng câu đã dựng + grant hiện hành; tin người chỉ so sự thật (quyền đã kiểm lúc ghi). Trả lý do
 * từ chối (`sales_*`) hoặc null. Lời chào không thuộc câu bán hàng.
 */
export async function dispatchSalesReason(tx: TenantTx, ob: { knowledgeRunId: string | null; turnFence: number | null; payload: unknown }, purpose: string | null, now: Date): Promise<string | null> {
  if (!ob.knowledgeRunId || purpose === 'greeting') return null;
  const text = (ob.payload as { text?: unknown } | null)?.text;
  const agent = ob.turnFence !== null ? { authz: 'agent' as const, content: typeof text === 'string' ? text : '' } : {};
  const r = await checkPublication(tx, ob.knowledgeRunId, { now, ...agent });
  return r === 'ok' ? null : `sales_${r}`;
}

/** Quên khách: căn cứ bị vô hiệu + bỏ danh sách sản phẩm (giữ id / run làm khoá — tham chiếu cũ không bao giờ dùng lại). */
export async function erasePublication(tx: Pick<TenantTx, '$executeRaw'>, id: string): Promise<void> {
  await tx.$executeRaw`UPDATE ai_sales_publication SET state = 'invalidated', items = '[]'::jsonb, alternatives = '[]'::jsonb WHERE id = ${id}::uuid`;
}
