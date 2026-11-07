// TIP-042 (unit, DB giả) — nhóm phẳng: thành viên phải active + không trùng; trưởng nhóm thuộc nhóm; set_members gỡ trưởng nhóm → 422;
// thay tập nguyên khối, tăng version + authz_revision; trả người bị tác động (cũ ∪ mới); CAS lệch → 409; resolver bỏ đồng đội đã rời.
import { describe, expect, it } from 'vitest';
import type { AppError } from '@appchat/shared';
import { assertActiveMembers, assertLead, replaceMembers } from '../src/authz/services/team-members';
import { TeamSetMembersHandler } from '../src/authz/actions/team.handlers';
import { AuthzResolver } from '../src/authz/services/authz-resolver';

const T = '0190f000-0000-7000-8000-0000000000b1';
const [A, B, C, X] = ['a', 'b', 'c', 'x'].map((s) => `0190f000-0000-7000-8000-0000000000${s}${s}`) as [string, string, string, string];
const NOW = new Date('2026-11-05T08:00:00Z');
const code = async (p: Promise<unknown>) => p.then(() => 'ok', (e: AppError) => `${e.httpStatus} ${JSON.stringify(e.fields)}`);
const platform = (active: string[]) => ({ membership: { findMany: async ({ where }: { where: { userId: { in: string[] } } }) => where.userId.in.filter((u) => active.includes(u)).map((userId) => ({ userId })) } });

function tenant(o: { members: string[]; lead: string | null; version: number }) {
  const st = { members: [...o.members], version: o.version, lead: o.lead, rev: 1n };
  const tx = {
    st,
    $queryRaw: async () => [{ id: T }],
    team: {
      findUniqueOrThrow: async () => ({ id: T, name: 'Nhóm A', version: st.version, leadUserId: st.lead, createdAt: NOW }),
      update: async () => ({ id: T, name: 'Nhóm A', version: ++st.version, leadUserId: st.lead, createdAt: NOW }),
    },
    teamMember: {
      findMany: async () => st.members.map((userId) => ({ userId })),
      deleteMany: async ({ where }: { where: { userId: { in: string[] } } }) => void (st.members = st.members.filter((u) => !where.userId.in.includes(u))),
      createMany: async ({ data }: { data: { userId: string }[] }) => void st.members.push(...data.map((d) => d.userId)),
    },
    authzRevision: { upsert: async () => ({ revision: ++st.rev }) },
  };
  return tx;
}
const ctx = { workspaceId: 'ws', actor: { type: 'user', id: A }, authz: {} } as never;
const handler = (active: string[]) => new TeamSetMembersHandler({ now: () => NOW } as never, platform(active) as never);

describe('nhóm — kiểm thành viên / trưởng nhóm', () => {
  it('trùng → 422; người ngoài workspace / đã rời → 422 nêu id; trưởng nhóm phải thuộc nhóm', async () => {
    expect(await code(assertActiveMembers(platform([A]) as never, 'ws', [A, A]))).toBe('422 {"user_ids":"duplicate"}');
    expect(await code(assertActiveMembers(platform([A]) as never, 'ws', [A, X]))).toBe(`422 {"user_ids":"not_member:${X}"}`);
    expect(() => assertLead(X, [A])).toThrow();
    expect(() => assertLead(null, [])).not.toThrow();
  });

  it('thay tập: chỉ xoá phần ra / thêm phần vào; người bị tác động = cũ ∪ mới khác nhau', async () => {
    const tx = tenant({ members: [A, B], lead: null, version: 1 });
    expect((await replaceMembers(tx as never, T, [B, C], NOW)).sort()).toEqual([A, C].sort());
    expect(tx.st.members.sort()).toEqual([B, C].sort());
  });
});

describe('team.set_members', () => {
  it('CAS lệch → 409; gỡ trưởng nhóm khỏi nhóm → 422 (đổi / bỏ trưởng nhóm trước)', async () => {
    const tx = tenant({ members: [A, B], lead: A, version: 3 });
    expect(await code(handler([A, B, C]).execute(ctx, { team_id: T, if_version: 2, user_ids: [B] }, tx as never))).toBe('409 {"version":"3"}');
    expect(await code(handler([A, B, C]).execute(ctx, { team_id: T, if_version: 3, user_ids: [B, C] }, tx as never))).toBe('422 {"lead_user_id":"lead_removed"}');
    expect(tx.st.members).toEqual([A, B]);
  });

  it('thành công: version + revision tăng; event làm mới quyền cho người bị tác động (không phát cả workspace)', async () => {
    const tx = tenant({ members: [A, B], lead: A, version: 3 });
    const r = await handler([A, B, C]).execute(ctx, { team_id: T, if_version: 3, user_ids: [A, C] }, tx as never);
    expect(r.result).toEqual({ team_id: T, version: 4 });
    expect(tx.st.rev).toBe(2n);
    expect(r.events!.map((e) => e.payload.user_id).sort()).toEqual([B, C].sort());
    expect(r.before).toMatchObject({ user_ids: [A, B].sort() });
  });

  it('resolver: đồng đội đã rời workspace không còn trong teamUserIds; là trưởng nhóm không thêm quyền', async () => {
    const t = { authzRevision: { findUnique: async () => null }, teamMember: { findMany: async ({ where }: { where: { userId?: string } }) => (where.userId ? [{ teamId: T }] : [{ userId: A }, { userId: B }, { userId: X }]) } };
    const p = { workspace: { findUnique: async () => ({ ownerUserId: 'o', authzEpoch: 1 }) }, membership: platform([A, B]).membership };
    const ctxA = await new AuthzResolver(p as never, { get: async () => t } as never, null).resolve('ws', A, { roleKey: 'sales', delegations: [] });
    expect([...ctxA.teamUserIds!].sort()).toEqual([A, B].sort());
    expect(ctxA.permissions.has('members.manage')).toBe(false);
  });
});
