// Lịch sử sản phẩm (`GET /v1/products/:id/activity`, tab Lịch sử): gộp nhật ký thao tác `product.*` (action_log — index biểu thức
// `action_log_product_idx`, migration 027 phần 2) và sổ kho `stock_movement` của sản phẩm, mới nhất trước, tối đa 50 mục.
// Thao tác đã hoàn tác không hiện; dòng kho bù của hoàn tác hiện là "Hoàn tác điều chỉnh tồn".
import { createFmt, interpolate, serverMessages } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';

const LIMIT = 50;

type Kind = 'create' | 'update' | 'price' | 'archive' | 'restore' | 'stock';

interface Item {
  id: string;
  kind: Kind;
  text: string;
  by: string | null;
  at: Date;
}

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

export async function productActivity(
  tx: TenantTx,
  productId: string,
  o: { locale: string; timeZone: string; names: (ids: string[]) => Promise<Map<string, string>> },
) {
  const m = serverMessages(o.locale).catalog.activity;
  const fmt = createFmt(o);
  const [logs, moves] = await Promise.all([
    tx.$queryRaw<{ id: string; action_id: string; actor_id: string | null; on_behalf_of_user_id: string | null; before: unknown; after: unknown; status: string; undone_at: Date | null; created_at: Date }[]>`
      SELECT id, action_id, actor_id, on_behalf_of_user_id, before, after, status::text AS status, undone_at, created_at FROM action_log
      WHERE action_id LIKE 'product.%' AND coalesce(result ->> 'product_id', input ->> 'product_id') = ${productId}
        AND status IN ('succeeded', 'undone')
      ORDER BY created_at DESC LIMIT ${LIMIT}`,
    tx.stockMovement.findMany({ where: { productId }, orderBy: [{ createdAt: 'desc' }], take: LIMIT, select: { id: true, kind: true, qty: true, refType: true, reason: true, actorId: true, createdAt: true } }),
  ]);
  const items: Item[] = [];
  for (const l of logs) {
    const by = l.on_behalf_of_user_id ?? l.actor_id;
    if (l.action_id === 'product.create' && l.status === 'succeeded') items.push({ id: l.id, kind: 'create', text: m.create, by, at: l.created_at });
    if (l.action_id === 'product.archive') {
      items.push({ id: l.id, kind: 'archive', text: m.archive, by, at: l.created_at });
      if (l.undone_at) items.push({ id: `${l.id}:restore`, kind: 'restore', text: m.restore, by, at: l.undone_at });
    }
    if (l.action_id === 'product.update' && l.status === 'succeeded') {
      const from = (l.before as { price?: string } | null)?.price;
      const to = (l.after as { price?: string } | null)?.price;
      if (from && to && from !== to) items.push({ id: l.id, kind: 'price', text: interpolate(m.price, { from: fmt.money(from), to: fmt.money(to) }), by, at: l.created_at });
      else items.push({ id: l.id, kind: 'update', text: m.update, by, at: l.created_at });
    }
  }
  for (const s of moves) {
    const text =
      s.refType === 'adjust_undo'
        ? interpolate(m.undo, { delta: signed(s.qty) })
        : s.kind === 'import'
          ? interpolate(m.import, { qty: s.qty })
          : s.kind === 'adjust'
            ? interpolate(m.adjust, { delta: signed(s.qty), reason: s.reason ?? '' })
            : interpolate(m[s.kind], { delta: signed(s.qty) });
    items.push({ id: s.id, kind: 'stock', text, by: s.actorId, at: s.createdAt });
  }
  items.sort((a, b) => b.at.getTime() - a.at.getTime() || b.id.localeCompare(a.id));
  const top = items.slice(0, LIMIT);
  const names = await o.names([...new Set(top.map((x) => x.by).filter((x): x is string => !!x))]);
  return top.map((x) => ({
    id: x.id,
    kind: x.kind,
    text: x.text,
    by: (x.by && names.get(x.by)) || m.system,
    at: x.at.toISOString(),
    when: `${fmt.date(x.at)} ${fmt.time(x.at)}`,
  }));
}
