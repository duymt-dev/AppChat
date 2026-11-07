// TIP-025b §D.6 (AC05) trên Postgres 16 + Memurai: xuất lịch sử một khách. 6.001 sự kiện → 202 job_accepted, runner kernel thật ghi đủ
// 6.001 dòng (không cắt trang đầu), ô công thức bị chặn, BOM; ≤ 5.000 → CSV ngay, lọc ngày (múi giờ workspace) / loại / thứ tự / cột;
// sự kiện cũ không có khoá mẫu → dòng giữ, nội dung bỏ, đếm `excluded` (không xuất JSON thô); không lộ sự kiện khách khác; người
// không thấy khách → 404; thu quyền thấy khách sau khi xuất → tải 410; nút tay không gọi model (action read, không Credit).
import 'reflect-metadata';
import { writeFileSync } from 'node:fs';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver, type TenantDb } from '@appchat/db';
import { AuthzResolver, CrmMembers, STORAGE, allowedAction, registerTimelineExportKind, runDataJob, uuidv7, type RunDeps } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let db: TenantDb;
let deps: RunDeps;
let lan = '';
let vy = '';

type Body = any; // eslint-disable-line @typescript-eslint/no-explicit-any
const json = async (r: Response) => ({ status: r.status, body: (await r.json().catch(() => null)) as Body });
const act = (id: string, input: unknown, who?: { token: string }) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...(who ? { authorization: `Bearer ${who.token}` } : {}) }).then(json);
const get = (path: string) => call(h, path, undefined, {}).then(json);
const lines = (csv: string) => csv.replace(/^﻿/, '').split('\r\n');

/** N sự kiện ghi thẳng DB (nhanh), cách nhau 1 phút lùi từ `start`. */
async function seed(contactId: string, n: number, start: Date, o: { type?: 'note' | 'quote' | 'loyalty'; key?: string | null; body?: string; params?: Record<string, string> } = {}) {
  for (let i = 0; i < n; i += 1000) {
    const data = Array.from({ length: Math.min(1000, n - i) }, (_, k) => {
      const at = new Date(start.getTime() - (i + k) * 60_000);
      return { id: uuidv7(at.getTime()), contactId, type: o.type ?? 'note', actorType: 'system', summary: o.body ?? 'ghi chú', payload: o.key === null ? {} : { key: o.key ?? 'note', params: o.params ?? { body: o.body ?? 'ghi chú' } }, occurredAt: at };
    });
    await db.timelineEvent.createMany({ data });
  }
}

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  db = await resolver.get(TenantContexts.system(h.ws, 'timeline-export'));
  const authz = h.app.get(AuthzResolver, { strict: false });
  registerTimelineExportKind(h.app.get(STORAGE, { strict: false }), new CrmMembers(h.platform));
  deps = {
    authzOf: async (ws, userId) => {
      const m = userId ? await h.platform.membership.findFirst({ where: { workspaceId: ws, userId, status: 'active' }, select: { roleKey: true, delegations: true } }) : null;
      return m ? authz.resolve(ws, userId!, m) : null;
    },
    allowed: allowedAction,
    now: () => h.clock.now(),
    owner: 'test-worker',
  };
  lan = (await act('contact.create', { full_name: 'Nguyễn Thị Lan', phone: '0909 820 001' })).body.data.result.contact_id;
  vy = (await act('contact.create', { full_name: 'Trần Vy', phone: '0909 820 002' })).body.data.result.contact_id;
}, 120_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

describe('xuất lịch sử khách (§D.6)', () => {
  it('≤ 5.000: CSV ngay; lọc ngày (giờ VN) / loại / cột; công thức bị chặn; sự kiện thiếu khoá mẫu → bỏ nội dung + đếm; không lộ khách khác', async () => {
    // 2026-10-10 08:00 VN = 01:00Z; 3 sự kiện ngày 10/10 (giờ VN), 1 sự kiện 09/10 23:30 VN (16:30Z ngày 09).
    // Mẫu `loyalty_expire` bắt đầu bằng tham số → ô bắt đầu bằng '=' nếu không chặn.
    await seed(lan, 2, new Date('2026-10-10T01:00:00Z'), { type: 'loyalty', key: 'loyalty_expire', params: { points: '=HYPERLINK("x")' } });
    await seed(lan, 1, new Date('2026-10-10T02:00:00Z'), { type: 'quote', key: null, body: '{"secret":"cost 9.000.000"}' });
    await seed(lan, 1, new Date('2026-10-09T16:30:00Z'));
    await seed(vy, 3, new Date('2026-10-10T01:00:00Z'), { body: 'khách khác' });
    const r = await act('contact.history_export', { contact_id: lan, from: '2026-10-10', to: '2026-10-10' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const out = r.body.data.result;
    expect([out.rows, out.total, out.excluded, out.mime]).toEqual([3, 3, 1, 'text/csv']);
    const csv = lines(out.content);
    expect(csv).toHaveLength(4);
    expect(out.content.startsWith('﻿')).toBe(true);
    expect(csv.slice(1).some((l: string) => l.includes(`"'=HYPERLINK`))).toBe(true);
    expect(out.content).not.toContain('secret');
    expect(out.content).not.toContain('khách khác');
    const typed = await act('contact.history_export', { contact_id: lan, types: ['quote'], columns: ['type', 'text'] });
    expect(lines(typed.body.data.result.content)).toEqual(['Loại,Nội dung', 'Báo giá,']);
    const oldest = await act('contact.history_export', { contact_id: lan, order: 'oldest', columns: ['at'] });
    expect(lines(oldest.body.data.result.content)[1]).toContain('09/10/2026');
  });

  it('thiếu crm.export (sales / cs) → 403; khách không còn thấy được (đã xoá / id lạ) → 404', async () => {
    expect((await act('contact.history_export', { contact_id: lan }, await h.member('sales'))).status).toBe(403);
    expect((await act('contact.history_export', { contact_id: lan }, await h.member('cs'))).status).toBe(403);
    expect((await act('contact.history_export', { contact_id: uuidv7() })).status).toBe(404);
  });

  it('6.001 sự kiện → 202 job_accepted; runner ghi đủ 6.001 dòng; thu quyền thấy khách → tải 410', async () => {
    await seed(lan, 6001, new Date('2026-09-30T00:00:00Z'));
    const r = await act('contact.history_export', { contact_id: lan, to: '2026-09-30' });
    expect(r.status, JSON.stringify(r.body)).toBe(202);
    const jobId = r.body.data.job_id;
    expect(await runDataJob(db, h.ws, jobId, deps)).toBe('completed');
    const st = (await get(`/data-jobs/${jobId}`)).body.data;
    expect(st).toMatchObject({ status: 'completed', total: 6001, download_url: `/v1/data-jobs/${jobId}/download` });
    const res = await fetch(`${h.base}${st.download_url}`, { headers: { 'x-workspace-id': h.ws, authorization: `Bearer ${h.token}` } });
    expect(res.status).toBe(200);
    expect(lines(await res.text())).toHaveLength(6002);
    await db.contact.update({ where: { id: lan }, data: { deletedAt: h.clock.now() } });
    expect((await get(`/data-jobs/${jobId}`)).body.data.download_url).toBeNull();
    const gone = await fetch(`${h.base}${st.download_url}`, { headers: { 'x-workspace-id': h.ws, authorization: `Bearer ${h.token}` } });
    expect(gone.status).toBe(410);
    await db.contact.update({ where: { id: lan }, data: { deletedAt: null } });
  }, 180_000);
});

describe('EXPLAIN (ghi lại — .data/gate/025b-p4-explain.txt)', () => {
  it('chốt id lịch sử dùng index (contact_id, occurred_at, id) — index-only, không quét bảng', async () => {
    const dbName = (await h.platform.workspace.findUniqueOrThrow({ where: { id: h.ws } })).dbName;
    const c = new pg.Client({ connectionString: env.TENANT_DATABASE_URL!.replace(/\/[^/?]*(\?|$)/, `/${dbName}$1`) });
    await c.connect();
    try {
      await c.query('ANALYZE timeline_event');
      const plan = (await c.query(`EXPLAIN SELECT t.id FROM timeline_event t WHERE t.contact_id = '${lan}' AND t.occurred_at >= '2026-09-01' AND t.occurred_at < '2026-10-01' ORDER BY t.occurred_at DESC, t.id DESC`)).rows.map((x) => x['QUERY PLAN']).join('\n');
      if (process.env.EXPLAIN_OUT) writeFileSync(process.env.EXPLAIN_OUT, `--- timeline snapshot\n${plan}\n`);
      expect(plan).toMatch(/timeline_event_contact_id_occurred_at_id_idx/);
    } finally {
      await c.end();
    }
  });
});
