// TIP-042c (unit): bảng chân trị DC-299 / D32 của policy bản ghi — `decide` (một bản ghi) và `recordScopeSql` (list) cùng kết quả;
// read / write tách; none chặn trước mọi nhánh; team theo `team_id` bản ghi (không theo thành viên nhóm); scope ghi CSKH; realtime.
import { describe, expect, it } from 'vitest';
import { TenantSql as Prisma } from '@appchat/db';
import { ROLE_DEFS, authzForRole, type AuthzContext, type DataScope } from '@appchat/shared';
import { POLICIES, decide, docColumns, levelOf, recordScopeSql, type RecordRef } from '../src/authz/data-access';
import { allowedFor, filterRecipients, registerGrantLookup } from '../src/notify/realtime/filter';
import { convRecord, ticketRecord } from '../src/notify/realtime/records';
import { agentAuthz } from '../src/ai/agents/agent-authz';

const ME = '0190f000-0000-7000-8000-00000000aa01';
const OTHER = '0190f000-0000-7000-8000-00000000aa02';
const T1 = '0190f000-0000-7000-8000-00000000bb01';
const T2 = '0190f000-0000-7000-8000-00000000bb02';
const K = '0190f000-0000-7000-8000-00000000cc01';

const ctx = (s: DataScope, extra: Partial<AuthzContext> = {}): AuthzContext => ({
  ...authzForRole('sales', ME),
  scope: { inbox: s, crm: s, sales: s, booking: s, support: s, insights: s },
  writeScope: undefined,
  teamIds: [T1],
  teamUserIds: [ME, OTHER],
  ...extra,
});

describe('DC-299 bảng chân trị — decide (read)', () => {
  const S = POLICIES.sales;
  const rows: [string, DataScope, RecordRef, boolean | 'grant'][] = [
    ['all thấy mọi bản ghi', 'all', { owner: OTHER, team: T2 }, true],
    ['none KHÔNG thấy cả bản ghi của chính mình', 'none', { owner: ME, team: T1, contact: K }, false],
    ['own: mình phụ trách', 'own', { owner: ME }, true],
    ['own: người khác, cùng nhóm → không (own không xét nhóm)', 'own', { owner: OTHER, team: T1 }, false],
    ['team: team_id thuộc nhóm mình', 'team', { owner: OTHER, team: T1 }, true],
    ['team: team_id nhóm khác dù owner là đồng đội → không (không suy từ thành viên)', 'team', { owner: OTHER, team: T2 }, false],
    ['team: team_id null (mơ hồ) → chỉ nhánh own / quan hệ', 'team', { owner: OTHER, team: null, contact: K }, 'grant'],
    ['team: team_id null nhưng mình phụ trách', 'team', { owner: ME, team: null }, true],
    ['own: bản ghi có khách → còn quan hệ khách quyết định', 'own', { owner: OTHER, contact: K }, 'grant'],
    ['own: không khách, không owner → không', 'own', { owner: OTHER }, false],
  ];
  for (const [name, s, ref, want] of rows) it(name, () => expect(decide(ctx(s), S, 'read', ref)).toBe(want));

  it('Owner workspace luôn all dù scope none (theo resolver, không theo tên vai trò)', () => {
    expect(decide(ctx('none', { isOwner: true }), S, 'write', { owner: OTHER })).toBe(true);
  });

  it('owner ở nhiều nhóm: bản ghi team_id T2, người xem chỉ thuộc T1 → không; thuộc cả hai → có', () => {
    expect(decide(ctx('team'), S, 'read', { owner: OTHER, team: T2 })).toBe(false);
    expect(decide(ctx('team', { teamIds: [T1, T2] }), S, 'read', { owner: OTHER, team: T2 })).toBe(true);
  });
});

describe('watcher đọc, không ghi (D32)', () => {
  const S = POLICIES.sales;
  const ref = { owner: OTHER, contact: K };
  it('collaborator: đọc + ghi; watcher: chỉ đọc; không quan hệ: không gì', () => {
    expect(decide(ctx('own'), S, 'read', ref, 'collaborator')).toBe(true);
    expect(decide(ctx('own'), S, 'write', ref, 'collaborator')).toBe(true);
    expect(decide(ctx('own'), S, 'read', ref, 'watcher')).toBe(true);
    expect(decide(ctx('own'), S, 'write', ref, 'watcher')).toBe(false);
    expect(decide(ctx('own'), S, 'read', ref, null)).toBe(false);
  });

  it('watcher + grant độc lập (scope all / owner) vẫn ghi được — watcher không xoá quyền khác', () => {
    expect(decide(ctx('all'), S, 'write', ref, 'watcher')).toBe(true);
    expect(decide(ctx('own'), S, 'write', { owner: ME, contact: K }, 'watcher')).toBe(true);
  });

  it('scope none chặn trước cả collaborator', () => {
    expect(decide(ctx('none'), S, 'read', ref, 'collaborator')).toBe(false);
  });

  it('ticket (support) không mở theo quan hệ khách CRM', () => {
    expect(decide(ctx('own'), POLICIES.support, 'read', { assignee: OTHER, contact: K }, 'collaborator')).toBe(false);
    expect(decide(ctx('own'), POLICIES.support, 'read', { assignee: OTHER, mine: true })).toBe(true);
  });
});

describe('scope ghi', () => {
  it('CSKH: crm đọc all, ghi own (Blueprint §3.5) — metadata preset, không đổi tập permission', () => {
    const cs = authzForRole('cs', ME);
    expect(levelOf(cs, 'crm', 'read')).toBe('all');
    expect(levelOf(cs, 'crm', 'write')).toBe('own');
    expect(decide(cs, POLICIES.crm, 'read', { owner: OTHER, contact: K })).toBe(true);
    expect(decide(cs, POLICIES.crm, 'write', { owner: OTHER, contact: K }, null)).toBe(false);
    expect(decide(cs, POLICIES.crm, 'write', { owner: ME })).toBe(true);
    expect(ROLE_DEFS.cs.permissions).toContain('crm.edit');
  });

  it('scope ghi không bao giờ rộng hơn scope đọc; thiếu writeScope = scope đọc', () => {
    expect(levelOf(ctx('own', { writeScope: { ...ctx('all').scope } }), 'sales', 'write')).toBe('own');
    expect(levelOf(ctx('team'), 'sales', 'write')).toBe('team');
    expect(levelOf({ ...ctx('own'), scope: {} as AuthzContext['scope'] }, 'sales', 'read')).toBe('none');
  });

  it('agent có người ra lệnh mang scope ghi của người đó (CSKH không ghi khách người khác qua Trợ lý)', () => {
    const a = agentAuthz({ id: 'agent-1', toolIds: ['contact.update'] }, authzForRole('cs', ME));
    expect(levelOf(a, 'crm', 'write')).toBe('own');
    expect(levelOf(a, 'crm', 'read')).toBe('all');
  });
});

describe('recordScopeSql cùng bảng chân trị', () => {
  const S = POLICIES.sales;
  const cols = docColumns('o');
  it('all → TRUE; none → FALSE (trước mọi nhánh)', () => {
    expect(recordScopeSql(ctx('all'), S, 'read', cols).sql).toBe('TRUE');
    expect(recordScopeSql(ctx('none'), S, 'read', cols).sql).toBe('FALSE');
  });

  it('own: owner + quan hệ (đọc: mọi role; ghi: chỉ collaborator); không có nhánh team', () => {
    const r = recordScopeSql(ctx('own'), S, 'read', cols).sql;
    expect(r).toContain('o.owner_user_id');
    expect(r).toContain('contact_collaborator');
    expect(r).not.toContain("cc.role = 'collaborator'");
    expect(r).not.toContain('o.team_id');
    expect(recordScopeSql(ctx('own'), S, 'write', cols).sql).toContain("cc.role = 'collaborator'");
  });

  it('team: `team_id = ANY(nhóm của mình)` — không có owner IN (thành viên nhóm)', () => {
    const s = recordScopeSql(ctx('team'), S, 'read', cols);
    expect(s.sql).toContain('o.team_id = ANY(');
    expect(s.values).toContainEqual([T1]);
    expect(s.values).not.toContainEqual(OTHER);
    expect(s.sql).not.toMatch(/owner_user_id IN/);
  });

  it('team mà không thuộc nhóm nào → chỉ nhánh own', () => {
    expect(recordScopeSql(ctx('team', { teamIds: [] }), S, 'read', cols).sql).not.toContain('team_id');
  });

  it('ticket: cột team text, nhánh người tạo, không quan hệ khách', () => {
    const t = recordScopeSql(ctx('team'), POLICIES.support, 'read', { assignee: Prisma.raw('t.assignee_user_id'), team: Prisma.raw('t.team_id'), teamText: true, mine: (me) => Prisma.sql`t.created_by_id = ${me}` }).sql;
    expect(t).toContain('::text[]');
    expect(t).not.toContain('contact_collaborator');
  });
});

describe('realtime theo policy đọc', () => {
  const WS = '0190f000-0000-7000-8000-000000000001';
  const sock = (authz: AuthzContext) => ({ workspaceId: WS, userId: authz.userId, authz });
  const env = (record: ReturnType<typeof convRecord>) => ({ ws: WS, rooms: [], event: 'conversation.updated', data: {}, require: { permission: 'inbox.view' as const, record } });

  it('none không nhận dù là người được gán; team theo team_id hội thoại', async () => {
    const e = env(convRecord({ contact_id: null, assignee_user_id: ME, contact_owner_user_id: null, team_id: T1 }));
    expect(allowedFor(sock(ctx('none')), e)).toBe(false);
    expect(allowedFor(sock(ctx('own')), e)).toBe(true);
    const other = env(convRecord({ contact_id: null, assignee_user_id: OTHER, contact_owner_user_id: null, team_id: T1 }));
    expect(allowedFor(sock(ctx('team')), other)).toBe(true);
    expect(allowedFor(sock(ctx('own')), other)).toBe(false);
  });

  it('watcher nhận khi quan hệ còn; gỡ quan hệ → event kế tiếp không nhận (tra lúc phát, không theo payload)', async () => {
    const grants = new Map<string, 'collaborator' | 'watcher'>([[ME, 'watcher']]);
    registerGrantLookup(async (_ws, _c, users) => new Map([...grants].filter(([u]) => users.includes(u))));
    try {
      const e = env(convRecord({ contact_id: K, assignee_user_id: OTHER, contact_owner_user_id: OTHER }));
      const s = sock(ctx('own'));
      expect(await filterRecipients([s], e)).toHaveLength(1);
      grants.delete(ME);
      expect(await filterRecipients([s], e)).toHaveLength(0);
      // Người ngoài workspace không bao giờ nhận.
      expect(await filterRecipients([{ ...s, workspaceId: 'x' }], e)).toHaveLength(0);
    } finally {
      registerGrantLookup(null);
    }
  });

  it('chưa đăng ký lookup → quan hệ coi như không có (thu hẹp, không mở rộng)', async () => {
    const e = env(convRecord({ contact_id: K, assignee_user_id: OTHER, contact_owner_user_id: OTHER }));
    expect(await filterRecipients([sock(ctx('own'))], e)).toHaveLength(0);
  });

  it('ticket: người tạo nhận; nhóm ticket; không mở theo quan hệ khách', async () => {
    const t = { ws: WS, rooms: [], event: 'ticket.updated', data: {}, require: { record: ticketRecord({ assignee_user_id: OTHER, team_id: T1, created_by_user_id: ME }) } };
    expect(allowedFor(sock(ctx('own')), t)).toBe(true);
    const t2 = { ...t, require: { record: ticketRecord({ assignee_user_id: OTHER, team_id: T2, created_by_user_id: OTHER }) } };
    expect(allowedFor(sock(ctx('team')), t2)).toBe(false);
  });
});
