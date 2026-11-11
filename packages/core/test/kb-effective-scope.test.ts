// TIP-020c (unit): phạm vi tri thức hiệu lực — binding tin cậy (Trợ lý / agent / Builder), nhận truy hồi (phạm vi rỗng ≠ tất cả, agent
// tạm dừng, người ra lệnh mất), vị từ thành viên (nhận ∧ hiện hành, mỗi bên thư mục HOẶC thẻ — không giao mảng), quyền nguồn theo module
// gốc (kb.manage không mở nguồn sản phẩm / hội thoại), bộ giải duy nhất cho `kb.search` + chặn embed khi bị từ chối.
import { describe, expect, it, vi } from 'vitest';
import { authzForRole, type AuthzContext } from '@appchat/shared';
import { admit, internalRights, type Restriction } from '../src/ai/kb/scope/authority';
import { agentKnowledge, assistantKnowledge, builderKnowledge, normalizeScope, parseKnowledge } from '../src/ai/kb/scope/context';
import { memberSql, sourceSql } from '../src/ai/kb/scope/query';
import { resolveFor } from '../src/ai/kb/scope/resolve';
import { KbSearchHandler } from '../src/ai/kb/kb-search.handler';
import type { ActionContext } from '../src/kernel/actions/action-context';

const F1 = '0190f000-0000-7000-8000-0000000000f1';
const F2 = '0190f000-0000-7000-8000-0000000000f2';
const AG = '0190f000-0000-7000-8000-0000000000a1';
const U = '0190f000-0000-7000-8000-0000000000b1';
const RUN = '0190f000-0000-7000-8000-0000000000c1';

/** SQL thành chữ (tham số inline) để kiểm vị từ. */
const sqlText = (s: { sql: string; values: unknown[] }) => {
  let i = 0;
  return s.sql.replace(/\?|\$\d+/g, () => JSON.stringify(s.values[i++]));
};

const agentDb = (o: { status?: string; deleted?: boolean; version?: number; scope?: { folder_ids?: string[]; tags?: string[] } } = {}) => ({
  aiAgent: { findUnique: vi.fn(async () => ({ id: AG, status: o.status ?? 'active', deletedAt: o.deleted ? new Date() : null, publishedVersion: o.version ?? 2 })) },
  aiAgentVersion: { findUnique: vi.fn(async () => ({ config: { kb_scope: o.scope ?? { folder_ids: [F1], tags: [] } } })) },
});

describe('binding tin cậy (§1.1)', () => {
  it('chuẩn hoá phạm vi: UUID thư mục duy nhất / chữ thường, thẻ cắt + duy nhất, bỏ rác', () => {
    expect(normalizeScope({ folder_ids: [F2, F1.toUpperCase(), 'not-a-uuid', F2], tags: [' VIP ', 'VIP', '', 'x'.repeat(31)] })).toEqual({ folder_ids: [F1, F2], tags: ['VIP'] });
    expect(normalizeScope(null)).toEqual({ folder_ids: [], tags: [] });
  });

  it('agent không người ra lệnh → chế độ kênh; có người ra lệnh → commander; Builder mô phỏng kênh → kênh', () => {
    const cfg = { kb_scope: { folder_ids: [F1], tags: ['A'] } };
    expect(agentKnowledge({ agentId: AG, version: 3, cfg }, { channel: true })).toMatchObject({ kind: 'agent_scoped', mode: 'channel', admitted_version: 3 });
    expect(agentKnowledge({ agentId: AG, version: 3, cfg }, { commanderId: U, parentRunId: RUN })).toMatchObject({ mode: 'commander', commander_id: U, parent_run_id: RUN });
    expect(builderKnowledge(cfg, U, { channel: true })).toMatchObject({ kind: 'builder_preview', mode: 'channel', commander_id: U });
    expect((builderKnowledge(cfg, U, { channel: false }) as { draft_digest: string }).draft_digest).toHaveLength(32);
  });

  it('đọc binding lưu: phiên bản / khuôn lạ → null (người gọi coi scope_unavailable)', () => {
    expect(parseKnowledge(assistantKnowledge(U))).toEqual(assistantKnowledge(U));
    expect(parseKnowledge({ v: 2, kind: 'assistant_unscoped', user_id: U })).toBeNull();
    expect(parseKnowledge({ v: 1, kind: 'agent_scoped', agent_id: AG, scope: { folder_ids: [F1], tags: [] }, mode: 'all' })).toBeNull();
    expect(parseKnowledge(null)).toBeNull();
  });
});

describe('nhận truy hồi (§1.2, AC1 / AC4)', () => {
  const owner = authzForRole('owner', U);

  it('agent phạm vi rỗng → scope_empty (không phải tất cả); Trợ lý không phạm vi → được, theo người hỏi', async () => {
    const empty = agentKnowledge({ agentId: AG, version: 2, cfg: { kb_scope: { folder_ids: [], tags: [] } } }, { channel: true });
    expect(await admit(agentDb({ scope: { folder_ids: [], tags: [] } }) as never, empty, null)).toEqual({ ok: false, reason: 'scope_empty' });
    const a = await admit(agentDb() as never, assistantKnowledge(U), owner);
    expect(a.ok && a.r).toMatchObject({ principal: { kind: 'user' }, admitted: null, current: null });
  });

  it('phạm vi hiện hành rỗng (đã thu hẹp sau khi nhận) → scope_empty; agent tạm dừng / xoá → agent_inactive', async () => {
    const k = agentKnowledge({ agentId: AG, version: 2, cfg: { kb_scope: { folder_ids: [F1], tags: [] } } }, { channel: true });
    expect(await admit(agentDb({ scope: { folder_ids: [], tags: [] } }) as never, k, null)).toEqual({ ok: false, reason: 'scope_empty' });
    expect(await admit(agentDb({ status: 'paused' }) as never, k, null)).toEqual({ ok: false, reason: 'agent_inactive' });
    expect(await admit(agentDb({ deleted: true }) as never, k, null)).toEqual({ ok: false, reason: 'agent_inactive' });
  });

  it('kênh → chỉ public; làm cho người không còn người → commander_lost (không rơi về quyền agent)', async () => {
    const ch = await admit(agentDb() as never, agentKnowledge({ agentId: AG, version: 2, cfg: { kb_scope: { folder_ids: [F1], tags: [] } } }, { channel: true }), owner);
    expect(ch.ok && ch.r.principal).toEqual({ kind: 'public' });
    const cmd = agentKnowledge({ agentId: AG, version: 2, cfg: { kb_scope: { folder_ids: [F1], tags: [] } } }, { commanderId: U });
    expect(await admit(agentDb() as never, cmd, null)).toEqual({ ok: false, reason: 'commander_lost' });
  });

  it('Builder: phạm vi nháp không đọc bản xuất bản (không đụng aiAgent)', async () => {
    const db = agentDb();
    const r = await admit(db as never, builderKnowledge({ kb_scope: { folder_ids: [], tags: ['Nháp'] } }, U, { channel: false }), owner);
    expect(r.ok && r.r.current).toEqual({ folder_ids: [], tags: ['Nháp'] });
    expect(db.aiAgent.findUnique).not.toHaveBeenCalled();
  });
});

describe('vị từ thành viên (§1.4, AC2) — (nhận: thư mục HOẶC thẻ) VÀ (hiện hành: thư mục HOẶC thẻ)', () => {
  const r = (admitted: Restriction['admitted'], current: Restriction['current']): Restriction => ({ principal: { kind: 'public' }, admitted, current });

  it('mỗi phạm vi là một nhóm OR riêng — hai nhóm AND, không giao mảng thư mục / thẻ', () => {
    const s = sqlText(sourceSql(r({ folder_ids: [F1], tags: [] }, { folder_ids: [], tags: ['VIP'] })));
    expect(s).toContain(`s.folder_id = ANY(${JSON.stringify([F1])}::uuid[])`);
    expect(s).toContain(`s.tags && ${JSON.stringify(['VIP'])}::text[]`);
    // Nguồn ở F1 có thẻ VIP thoả cả hai dù hai phạm vi không có mục chung — một vị từ cho mỗi phạm vi, nối bằng AND.
    expect(s.match(/s\.folder_id = ANY/g)).toHaveLength(1);
    expect(sqlText(memberSql({ folder_ids: [F1, F2], tags: ['A'] }))).toMatch(/^\(s\.folder_id = ANY\(.+\) OR s\.tags && .+\)$/);
  });

  it('phạm vi rỗng → FALSE (lưới an toàn — người gọi đã chặn trước)', () => {
    expect(sqlText(memberSql({ folder_ids: [], tags: [] }))).toBe('FALSE');
  });

  it('Trợ lý không phạm vi: không vị từ thư mục / thẻ; nguồn sống + đã nạp luôn có', () => {
    const s = sqlText(sourceSql({ principal: { kind: 'user', authz: authzForRole('owner', U) }, admitted: null, current: null }));
    expect(s).not.toContain('s.folder_id = ANY');
    expect(s).toContain(`s.deleted_at IS NULL AND s.status = 'ready'`);
  });
});

describe('quyền nguồn theo module gốc (§2.2–2.3, AC5)', () => {
  const only = (perms: string[]): AuthzContext => ({ ...authzForRole('sales', U), isOwner: false, permissions: new Set(perms) as AuthzContext['permissions'] });
  const sqlFor = (a: AuthzContext) => sqlText(sourceSql({ principal: { kind: 'user', authz: a }, admitted: null, current: null }));

  it('kb.manage chỉ mở tài liệu thường (không gắn bản ghi) — KHÔNG mở nguồn sản phẩm / hội thoại', () => {
    expect(internalRights(only(['kb.manage']))).toEqual({ documents: true, catalog: false, inbox: false });
    const s = sqlFor(only(['kb.manage']));
    expect(s).toContain(`s.product_id IS NULL AND s.origin IN ('upload', 'url', 'text', 'drive')`);
    expect(s).not.toContain('s.product_id IS NOT NULL');
    expect(s).not.toContain(`s.origin = 'conversation' AND EXISTS`);
  });

  it('catalog.view → internal gắn sản phẩm; inbox.view → internal từ hội thoại đọc được theo scope inbox', () => {
    expect(sqlFor(only(['catalog.view']))).toContain('s.product_id IS NOT NULL');
    expect(sqlFor(only(['inbox.view']))).toContain(`s.origin = 'conversation' AND EXISTS`);
  });

  it('không nhóm internal nào → chỉ public; kênh luôn chỉ public', () => {
    expect(sqlFor(only([]))).toContain(`s.visibility = 'public'`);
    expect(sqlFor(only([]))).not.toContain(`'internal'`);
    expect(sqlText(sourceSql({ principal: { kind: 'public' }, admitted: { folder_ids: [F1], tags: [] }, current: { folder_ids: [F1], tags: [] } }))).not.toContain(`'internal'`);
  });

  it('mọi chế độ: nguồn hội thoại của khách đã "Quên" + sản phẩm đã xoá không bao giờ ra', () => {
    const s = sqlText(sourceSql({ principal: { kind: 'public' }, admitted: null, current: null }));
    expect(s).toContain('privacy_family_member');
    expect(s).toContain('p.deleted_at IS NULL');
  });
});

describe('một bộ giải cho kb.search (§2.1, AC3 / AC4)', () => {
  const ctx = (o: Partial<ActionContext>): ActionContext => ({ workspaceId: 'w', source: 'assistant', actor: { type: 'assistant', id: U }, onBehalfOfUserId: U, authz: authzForRole('owner', U), ...o });
  const runDb = (rows: Record<string, { kind: string; knowledge: unknown; parentRunId?: string | null; agentId?: string | null; initiatedByUserId?: string | null }>) => ({
    ...agentDb(),
    aiRun: { findUnique: vi.fn(async ({ where }: { where: { id: string } }) => (rows[where.id] ? { id: where.id, parentRunId: null, agentId: null, initiatedByUserId: null, ...rows[where.id] } : null)) },
  });

  it('không run: Trợ lý theo người hiệu lực; nguồn agent / task không run → scope_unavailable', async () => {
    expect((await resolveFor(runDb({}) as never, ctx({}))).admission.ok).toBe(true);
    expect((await resolveFor(runDb({}) as never, ctx({ source: 'agent', actor: { type: 'agent', id: AG }, onBehalfOfUserId: undefined }))).admission).toEqual({ ok: false, reason: 'scope_unavailable' });
  });

  it('run agent thiếu binding (run cũ) → scope_unavailable, không leo lên cha lấy quyền rộng hơn', async () => {
    const db = runDb({ [RUN]: { kind: 'delegate', knowledge: null, agentId: AG, parentRunId: 'root' }, root: { kind: 'assistant', knowledge: assistantKnowledge(U) } });
    expect((await resolveFor(db as never, ctx({ runId: RUN }))).admission).toEqual({ ok: false, reason: 'scope_unavailable' });
  });

  it('run tiện ích con (không binding) dùng binding của cha gần nhất; binding Trợ lý của người khác → commander_lost', async () => {
    const db = runDb({ [RUN]: { kind: 'consult', knowledge: null, parentRunId: 'root' }, root: { kind: 'assistant', knowledge: assistantKnowledge(U) } });
    const ok = await resolveFor(db as never, ctx({ runId: RUN }));
    expect(ok.admission.ok && ok.bindingRunId).toBe('root');
    const other = await resolveFor(db as never, ctx({ runId: RUN, onBehalfOfUserId: 'someone-else', authz: authzForRole('owner', 'someone-else') }));
    expect(other.admission).toEqual({ ok: false, reason: 'commander_lost' });
  });

  it('bị từ chối → kb.search không gọi embed (không trừ credit), trả không căn cứ', async () => {
    const embed = vi.fn();
    const db = runDb({ [RUN]: { kind: 'agent_reply', agentId: AG, knowledge: agentKnowledge({ agentId: AG, version: 2, cfg: { kb_scope: { folder_ids: [], tags: [] } } }, { channel: true }) } });
    const h = new KbSearchHandler({ embed } as never, { get: async () => db } as never, null, null);
    const pre = await h.prepare(ctx({ runId: RUN, source: 'agent', actor: { type: 'agent', id: AG }, onBehalfOfUserId: undefined }), { query: 'chính sách' });
    expect(pre).toEqual({ denied: 'scope_empty' });
    expect(embed).not.toHaveBeenCalled();
    const out = await h.execute(ctx({ runId: RUN }), { query: 'chính sách' }, { kbSetting: { findUnique: async () => null } } as never, undefined, pre);
    expect(out.result).toEqual({ grounded: false, chunks: [], citations: [] });
  });
});
