// Mô tả ngắn bộ lọc phân khúc (AST đóng — packages/shared segment-filter) cho cột "Nhóm khách hàng" của bảng gợi ý AI: lá cấp đầu nối
// bằng " · " (nhánh lồng chỉ ghi "…" — chi tiết đầy đủ ở màn chi tiết). Nhãn qua i18n `marketing.an.f.*`; không tự bịa số liệu.
import type { SegmentNode } from '@appchat/shared';

type T = (key: string, values?: Record<string, string | number>) => string;

function leaf(n: Exclude<SegmentNode, { children: SegmentNode[] }>, t: T, money: (v: string) => string): string {
  const list = (v: string[], map?: (x: string) => string) => v.map((x) => (map ? map(x) : x)).join(', ');
  const neg = (s: string, on: boolean) => (on ? t('an.f.not', { x: s }) : s);
  switch (n.field) {
    case 'group':
      return neg(t('an.f.group', { v: list(n.value, (x) => t(`wiz.grp.${x}`)) }), n.op === 'not_in');
    case 'tag':
      return neg(t('an.f.tag', { v: list(n.value) }), n.op === 'has_none');
    case 'stage':
    case 'source':
    case 'tier':
      return neg(t(`an.f.${n.field}`, { v: list(n.value) }), n.op === 'not_in');
    case 'total_spent':
      return n.op === 'between' ? t('an.f.spentBetween', { v: money(n.value), v2: money(n.value2 ?? n.value) }) : t(n.op === 'gte' ? 'an.f.spentGte' : 'an.f.spentLte', { v: money(n.value) });
    case 'order_count':
      return t(n.op === 'gte' ? 'an.f.ordersGte' : 'an.f.ordersLte', { n: n.value });
    case 'purchased_product':
      return t(n.op === 'any_of' ? 'an.f.bought' : 'an.f.notBought');
    case 'last_order_at':
    case 'last_interaction_at': {
      const k = n.field === 'last_order_at' ? 'Order' : 'Touch';
      if (n.op === 'never') return t('an.f.neverOrder');
      if (n.op === 'older_than_days' || n.op === 'within_days') return t(`an.f.${n.op === 'older_than_days' ? 'idle' : 'recent'}${k}`, { n: n.value });
      return t(n.op === 'before' ? `an.f.before${k}` : `an.f.after${k}`, { d: n.value });
    }
  }
}

export function segmentSummary(f: SegmentNode, t: T, money: (v: string) => string): string {
  const top = 'children' in f ? f.children : [f];
  return top.map((c) => ('children' in c ? '…' : leaf(c, t, money))).join(' · ');
}
