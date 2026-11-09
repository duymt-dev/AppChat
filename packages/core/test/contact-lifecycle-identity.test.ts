// TIP-015f §3.1 (unit, DB giả): identity đã gắn khách gốc đã xoá mềm → `deleted` (giữ id, KHÔNG fallback SĐT sang khách sống, không tạo
// khách / gắn lại identity); chuỗi gộp vòng / thiếu đích → `unavailable`; khách gộp sống → `known`. resolve không ghi gì với khách đã xoá.
import { describe, expect, it } from 'vitest';
import { matchIdentity } from '../src/crm/services/identity-match';
import { ContactIdentityService } from '../src/crm/services/identity.service';
import { contactState } from '../src/crm/lifecycle/identity-state';

type Row = Record<string, unknown>;
function fakeTx(contacts: Row[], identities: Row[]) {
  const writes: string[] = [];
  return {
    writes,
    contact: {
      findUnique: async ({ where }: { where: { id: string } }) => contacts.find((c) => c.id === where.id) ?? null,
      findMany: async ({ where, take }: { where: { phoneNorm: string }; take: number }) => contacts.filter((c) => c.phoneNorm === where.phoneNorm && !c.deletedAt).slice(0, take),
      create: async () => void writes.push('contact.create'),
      update: async () => void writes.push('contact.update'),
    },
    contactIdentity: {
      findUnique: async ({ where }: { where: { channelAccountId_externalId: { channelAccountId: string; externalId: string } } }) =>
        identities.find((i) => i.channelAccountId === where.channelAccountId_externalId.channelAccountId && i.externalId === where.channelAccountId_externalId.externalId) ?? null,
      upsert: async () => void writes.push('identity.upsert'),
    },
    $executeRaw: async () => void writes.push('raw'),
  };
}
const ACC = 'a1';
const gone = new Date('2026-11-01T00:00:00Z');

describe('trạng thái định danh khách đã xoá', () => {
  it('gốc đã xoá → deleted, không lấy khách sống trùng SĐT; resolve không ghi', async () => {
    const t = fakeTx([{ id: 'k1', phoneNorm: '0909000111', deletedAt: gone, mergedIntoId: null }, { id: 'k2', phoneNorm: '0909000111', deletedAt: null }], [{ channelAccountId: ACC, externalId: 'zl_a', contactId: 'k1' }]);
    const who = { channelAccountId: ACC, externalId: 'zl_a', phone: '0909000111' };
    expect(await matchIdentity(t as never, who)).toEqual({ kind: 'deleted', contactId: 'k1' });
    const r = await new ContactIdentityService().resolve(t as never, { ...who, channelType: 'zalo_personal', displayName: 'Lan' }, gone);
    expect(r).toEqual({ contactId: 'k1', created: false, state: 'soft_deleted', events: [] });
    expect(t.writes).toEqual([]);
  });

  it('gộp vào khách đã xoá → deleted theo gốc; vòng / thiếu đích → unavailable', async () => {
    const t = fakeTx(
      [
        { id: 'k1', deletedAt: gone, mergedIntoId: 'k2' },
        { id: 'k2', deletedAt: gone, mergedIntoId: null },
        { id: 'c1', deletedAt: gone, mergedIntoId: 'c2' },
        { id: 'c2', deletedAt: gone, mergedIntoId: 'c1' },
        { id: 'm1', deletedAt: gone, mergedIntoId: 'missing' },
      ],
      [{ channelAccountId: ACC, externalId: 'cyc', contactId: 'c1' }],
    );
    expect(await contactState(t as never, 'k1')).toEqual({ kind: 'soft_deleted', contactId: 'k2' });
    expect(await contactState(t as never, 'c1')).toEqual({ kind: 'unavailable', contactId: 'c1' });
    expect(await contactState(t as never, 'm1')).toEqual({ kind: 'unavailable', contactId: 'm1' });
    expect(await matchIdentity(t as never, { channelAccountId: ACC, externalId: 'cyc', phone: '0909' })).toEqual({ kind: 'unavailable' });
    const r = await new ContactIdentityService().resolve(t as never, { channelAccountId: ACC, externalId: 'cyc', channelType: 'webchat' }, gone);
    expect(r).toMatchObject({ contactId: null, state: 'unavailable' });
    expect(t.writes).toEqual([]);
  });

  it('chưa có identity → luồng thường (none / tạo)', async () => {
    const t = fakeTx([], []);
    expect(await matchIdentity(t as never, { channelAccountId: ACC, externalId: 'new' })).toEqual({ kind: 'none' });
  });
});
