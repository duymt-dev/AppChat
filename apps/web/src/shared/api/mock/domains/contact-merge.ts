// Mock ứng viên trùng (TIP-015e §1.3): GET /contacts/duplicates/candidates chiếu từ nhóm trùng của fixture prototype (không sửa fixture) sang
// hình dạng thật — hạng luật theo bằng chứng (email + tên > email > MST > tên), cặp còn lại sau khi gộp (contact.merge mock bỏ nhóm theo id).
// Tìm theo tên / email không dấu. Id hai phía tạo ổn định từ id nhóm; contact.merge nhận `<chính>~<phụ>` → khớp nhóm theo phần đuôi.
import { foldText, type DuplicateCandidate } from '@appchat/shared';
import type { MockRoute } from '../routes';

type Group = { id: string; pct: number; by: string; a: { name: string; email: string; phone: string; src: string }; b: { name: string; email: string; phone: string; src: string } };

const SRC: Record<string, string> = { 'Zalo cá nhân': 'zalo_personal', 'Form web': 'website', Manual: 'manual', 'Email sync': 'email' };
const side = (g: Group, k: 'a' | 'b', i: number): DuplicateCandidate['a'] => {
  const s = g[k];
  const [src = '', day = '01/01'] = s.src.split(' · ');
  const [dd = '01', mm = '01'] = day.split('/');
  return { id: `${g.id}-${k}`, code: `KH-${9000 + i * 2 + (k === 'a' ? 0 : 1)}`, name: s.name, email: s.email || null, phone: s.phone === '—' ? null : s.phone, source: SRC[src] ?? 'manual', created_at: `2026-${mm}-${dd}T02:00:00.000Z`, version: 1 };
};
const evidenceOf = (by: string): DuplicateCandidate['evidence'] => {
  const out: DuplicateCandidate['evidence'] = [];
  if (/email/i.test(by)) out.push('email');
  if (/MST|Tax/i.test(by)) out.push('tax_code');
  if (/Tên|Name/i.test(by)) out.push('name');
  return out.length ? out : ['name'];
};
const rankOf = (ev: DuplicateCandidate['evidence']) => (ev.includes('email') && ev.includes('name') ? 4 : ev.includes('email') ? 3 : ev.includes('tax_code') ? 2 : 1);

export function candidatesOf(groups: Group[], q?: string): DuplicateCandidate[] {
  const f = q ? foldText(q) : '';
  return groups
    .map((g, i) => {
      const a = side(g, 'a', i);
      const b = side(g, 'b', i);
      const evidence = evidenceOf(g.by);
      return { key: `${a.id}~${b.id}`, score_kind: 'rule' as const, rank: rankOf(evidence), evidence, primary_id: a.created_at <= b.created_at ? a.id : b.id, a, b };
    })
    .filter((c) => !f || [c.a.name, c.b.name, c.a.email ?? '', c.b.email ?? ''].some((x) => foldText(x).includes(f)))
    .sort((x, y) => y.rank - x.rank);
}

/** contact.merge mock: `<chính>~<phụ>` (id `dgN-a` / `dgN-b`) hoặc id nhóm cũ → id nhóm fixture. */
export const groupOfMergeId = (gid: string) => (gid.includes('~') ? gid.split('~')[0]!.replace(/-(a|b)$/, '') : gid);

export const contactMergeRoutes: Record<string, MockRoute> = {
  '/contacts/duplicates/candidates': (db, p) => ({ data: candidatesOf(db.customers.duplicates as Group[], String(p.q ?? '').trim()), next_cursor: null }),
};
