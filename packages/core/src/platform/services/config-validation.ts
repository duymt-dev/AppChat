// Kiểm chung cho action cấu hình nền tảng (TIP-040 pha 2, DC-370): CAS phiên bản, provider / giá hợp lệ cho route, tool mẫu agent.
import { registry, isAgentGrantable } from '@appchat/actions';
import { AppError } from '@appchat/shared';
import type { PlatformTx } from '../../kernel/actions/action-context';

/** Sửa bản ghi đã có bắt buộc gửi `if_version`; lệch → 409 kèm phiên bản hiện tại (FE tải lại). */
export function requireVersion(ifVersion: number | undefined, current: number): void {
  if (ifVersion === undefined) throw new AppError('CONFLICT', 409, { if_version: 'required', version: String(current) });
  if (ifVersion !== current) throw casConflict(current);
}

export const casConflict = (current: number) => new AppError('CONFLICT', 409, { if_version: 'stale', version: String(current) });

/** Tool mẫu agent: id có trong registry + agentGrantable (D51 — mẫu không tự cấp quyền vượt). Trả id sai. */
export function invalidTools(tools: readonly string[]): string[] {
  const ok = new Set(registry.filter(isAgentGrantable).map((a) => a.id));
  return [...new Set(tools)].filter((t) => !ok.has(t));
}

type Purpose = 'chat' | 'embed' | 'rerank';

/**
 * Pricebook có đơn vị cho rerank chưa (DC-303): `model_price` chỉ có per-1k token — chưa có đơn vị search / document đã duyệt. Khi Chủ nhà
 * cấp provider + giá, thêm đơn vị vào pricebook rồi đổi cờ này (TIP-040 sở hữu pricebook).
 */
export const RERANK_PRICE_UNIT_READY = false;

/** Mỗi route: provider đang active, đủ khả năng theo mục đích, model có đơn giá active (không giá = không cho định tuyến).
 *  TIP-020e §3.3 (thay `provider-probe.ts` chưa có — Q-071): route rerank cần provider khai `rerank` (probe / adapter thật, không ép
 *  LanguageModel) VÀ pricebook có đơn vị rerank — thiếu → 422 `no_rerank` / `no_rerank_price`, search giữ RRF. */
export async function validateRoutes(tx: PlatformTx, purpose: Purpose, routes: readonly { provider_key: string; model: string }[]): Promise<Record<string, string>> {
  const fields: Record<string, string> = {};
  const seen = new Set<string>();
  const keys = [...new Set(routes.map((r) => r.provider_key))];
  const providers = new Map((await tx.llmProvider.findMany({ where: { key: { in: keys } } })).map((p) => [p.key, p]));
  const prices = await tx.modelPrice.findMany({ where: { OR: routes.map((r) => ({ providerKey: r.provider_key, model: r.model })), active: true }, select: { providerKey: true, model: true } });
  const priced = new Set(prices.map((p) => `${p.providerKey}:${p.model}`));
  routes.forEach((r, i) => {
    const id = `${r.provider_key}:${r.model}`;
    const p = providers.get(r.provider_key);
    const caps = (p?.capabilities ?? {}) as { embeddings?: boolean; rerank?: boolean };
    if (seen.has(id)) fields[`routes.${i}`] = 'duplicate';
    else if (!p) fields[`routes.${i}.provider_key`] = 'not_found';
    else if (p.status !== 'active') fields[`routes.${i}.provider_key`] = 'disabled';
    else if (purpose === 'embed' && !caps.embeddings) fields[`routes.${i}.provider_key`] = 'no_embeddings';
    else if (purpose === 'rerank' && (!caps.rerank || p.kind !== 'openai_compatible')) fields[`routes.${i}.provider_key`] = 'no_rerank';
    else if (purpose === 'rerank' && !RERANK_PRICE_UNIT_READY) fields[`routes.${i}.model`] = 'no_rerank_price';
    else if (!priced.has(id)) fields[`routes.${i}.model`] = 'no_price';
    seen.add(id);
  });
  return fields;
}
