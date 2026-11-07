// TIP-014b D (unit, DB giả) — khớp định danh chỉ-đọc: identity đã có → khách còn hiệu lực (theo merged_into_id); SĐT khớp đúng một khách →
// khách đó; SĐT trùng nhiều khách → ambiguous (không tự chọn); không SĐT / không khớp → none. Không ghi gì (không tạo khách / identity).
import { describe, expect, it } from 'vitest';
import { matchIdentity } from '../src/crm/services/identity-match';

type Row = Record<string, unknown>;
function fakeTx(contacts: Row[], identities: Row[]) {
  const writes: string[] = [];
  const t = {
    writes,
    contact: {
      findUnique: async ({ where }: { where: { id: string } }) => contacts.find((c) => c.id === where.id) ?? null,
      findMany: async ({ where, take }: { where: { phoneNorm: string }; take: number }) => contacts.filter((c) => c.phoneNorm === where.phoneNorm && !c.deletedAt).slice(0, take),
      create: async () => void writes.push('contact.create'),
    },
    contactIdentity: {
      findUnique: async ({ where }: { where: { channelAccountId_externalId: { channelAccountId: string; externalId: string } } }) =>
        identities.find((i) => i.channelAccountId === where.channelAccountId_externalId.channelAccountId && i.externalId === where.channelAccountId_externalId.externalId) ?? null,
      upsert: async () => void writes.push('identity.upsert'),
    },
  };
  return t;
}
const ACC = 'a1';

describe('matchIdentity', () => {
  it('identity đã có → khách còn hiệu lực; khách đã gộp → đi theo merged_into_id', async () => {
    const t = fakeTx([{ id: 'k1', deletedAt: new Date(), mergedIntoId: 'k2' }, { id: 'k2', deletedAt: null, mergedIntoId: null }], [{ channelAccountId: ACC, externalId: 'zl_a', contactId: 'k1' }]);
    expect(await matchIdentity(t as never, { channelAccountId: ACC, externalId: 'zl_a' })).toEqual({ kind: 'known', contactId: 'k2' });
  });

  it('SĐT khớp đúng một khách → phone; trùng nhiều khách → ambiguous; không khớp → none', async () => {
    const t = fakeTx([{ id: 'k1', phoneNorm: '0909000111', deletedAt: null }, { id: 'k2', phoneNorm: '0909000222', deletedAt: null }, { id: 'k3', phoneNorm: '0909000222', deletedAt: null }], []);
    expect(await matchIdentity(t as never, { channelAccountId: ACC, externalId: 'x', phone: '0909000111' })).toEqual({ kind: 'phone', contactId: 'k1' });
    expect(await matchIdentity(t as never, { channelAccountId: ACC, externalId: 'x', phone: '0909000222' })).toEqual({ kind: 'ambiguous' });
    expect(await matchIdentity(t as never, { channelAccountId: ACC, externalId: 'x', phone: '0909999999' })).toEqual({ kind: 'none' });
    expect(await matchIdentity(t as never, { channelAccountId: ACC, externalId: 'x' })).toEqual({ kind: 'none' });
    expect(t.writes).toEqual([]);
  });
});
