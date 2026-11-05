// TIP-045b annex D trên Postgres 16 + Memurai: việc dữ liệu nặng. Xuất 6.000 khách → 202 job_accepted, worker (runner kernel thật trên DB
// tenant) ghi đủ 6.000 dòng (không cắt ngầm 5.000), tải qua /v1/data-jobs/:id/download chỉ người tạo; chính sách trường đổi → 410. Sửa
// hàng loạt 60 khách → 202 + 60 biên nhận; chạy lại / event lặp không ghi lần hai; huỷ giữ phần đã ghi; thử lại chỉ bản ghi lỗi; người
// tạo mất quyền giữa chừng → failed forbidden. ≤ 50 → kết quả từng bản ghi ngay (một khách lỗi không làm hỏng khách khác).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TenantContexts, TenantDbResolver, PrismaWorkspaceRegistry, type TenantDb } from '@appchat/db';
import { AuthzResolver, CrmMembers, STORAGE, allowedAction, registerContactExportKind, runDataJob, uuidv7, type RunDeps } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let db: TenantDb;
let sales: { id: string; token: string };
let manager: { id: string; token: string };

const json = async (r: Response) => ({ status: r.status, body: (await r.json().catch(() => null)) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const as = (u: { token: string }) => ({ authorization: `Bearer ${u.token}` });
const act = (id: string, body: unknown, headers: Record<string, string> = {}) => call(h, `/actions/${id}`, body, { 'idempotency-key': uuidv7(), ...headers }).then(json);
const get = (path: string, who?: { token: string }) => call(h, path, undefined, who ? as(who) : {}).then(json);
/** Action hàng loạt (bulk → xem trước → xác nhận, nguồn ui). */
async function bulk(id: string, input: unknown, who?: { token: string }) {
  const hdr = who ? as(who) : {};
  const p = await act(id, { input }, hdr);
  expect(p.status, JSON.stringify(p.body)).toBe(202);
  return act(id, { input, confirm_token: p.body.data.confirm_token }, hdr);
}

let deps: RunDeps;
const run = (jobId: string, over: Partial<RunDeps> = {}) => runDataJob(db, h.ws, jobId, { ...deps, ...over });

/** N khách chủ = owner harness, ghi thẳng DB (nhanh; export đọc như thật). */
async function seed(prefix: string, n: number) {
  const now = h.clock.now();
  const ids: string[] = [];
  for (let i = 0; i < n; i += 1000) {
    const data = Array.from({ length: Math.min(1000, n - i) }, (_, k) => {
      const id = uuidv7(now.getTime());
      ids.push(id);
      return { id, code: `${prefix}${String(i + k).padStart(5, '0')}`, name: `=${prefix} ${i + k}`, ownerUserId: h.user, createdAt: now, updatedAt: now, lastInteractionAt: now };
    });
    await db.contact.createMany({ data });
  }
  return ids;
}

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  db = await resolver.get(TenantContexts.system(h.ws, 'jobs-test'));
  sales = await h.member('sales');
  manager = await h.member('manager');
  const authz = h.app.get(AuthzResolver, { strict: false });
  registerContactExportKind(h.app.get(STORAGE, { strict: false }), new CrmMembers(h.platform));
  deps = {
    authzOf: async (ws, userId) => {
      const m = userId ? await h.platform.membership.findFirst({ where: { workspaceId: ws, userId, status: 'active' }, select: { roleKey: true, delegations: true } }) : null;
      return m ? authz.resolve(ws, userId!, m) : null;
    },
    allowed: allowedAction,
    now: () => h.clock.now(),
    owner: 'test-worker',
  };
}, 240_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

describe('xuất > 5.000 khách', () => {
  let jobId = '';

  it('6.000 khách → 202 job_accepted; worker ghi đủ 6.000 dòng (không cắt 5.000), ô công thức bị chặn; tải chỉ người tạo', async () => {
    await seed('EXP', 6000);
    const r = await act('contact.export', { input: { q: 'EXP' } });
    expect(r.status, JSON.stringify(r.body)).toBe(202);
    expect(r.body.data).toMatchObject({ status: 'job_accepted' });
    jobId = r.body.data.job_id;
    expect(r.body.data.status_url).toBe(`/v1/data-jobs/${jobId}`);
    expect((await get(`/data-jobs/${jobId}`)).body.data).toMatchObject({ status: 'queued', total: 6000, download_url: null });
    expect(await run(jobId)).toBe('completed');
    // Event lặp / quét muộn: không chạy lại.
    expect(await run(jobId)).toBe('skipped');
    const st = (await get(`/data-jobs/${jobId}`)).body.data;
    expect(st).toMatchObject({ status: 'completed', total: 6000, done: 6000, failed: 0, download_url: `/v1/data-jobs/${jobId}/download` });
    const res = await fetch(`${h.base}${st.download_url}`, { headers: { 'x-workspace-id': h.ws, authorization: `Bearer ${h.token}` } });
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    const csv = (await res.text()).replace(/^﻿/, '').split('\r\n');
    expect(csv).toHaveLength(6001);
    expect(csv[1]).toContain(`"'=EXP`);
    // Người khác (kể cả manager có crm.export) không thấy việc / tệp của người tạo.
    expect((await get(`/data-jobs/${jobId}`, manager)).status).toBe(404);
    expect((await get(`/data-jobs/${jobId}/download`, manager)).status).toBe(404);
    // Thông báo xong việc chỉ cho người tạo.
    const ev = await db.outboxEvent.findMany({ where: { topic: 'notify.requested' }, select: { payload: true } });
    expect(ev.filter((e) => (e.payload as { kind?: string }).kind === 'data_job_done')).toHaveLength(1);
  }, 120_000);

  it('chính sách trường đổi sau khi xuất → không còn link, tải 410', async () => {
    expect((await act('custom_field.define', { input: { entity: 'contact', label: 'Hạng mới', type: 'text' } })).status).toBe(200);
    expect((await get(`/data-jobs/${jobId}`)).body.data.download_url).toBeNull();
    expect((await get(`/data-jobs/${jobId}/download`)).status).toBe(410);
  });

  it('≤ 5.000 vẫn trả CSV ngay (200)', async () => {
    await seed('SML', 3);
    const r = await act('contact.export', { input: { q: 'SML' } });
    expect(r.status).toBe(200);
    expect(r.body.data.result.rows).toBe(3);
  });
});

describe('sửa hàng loạt', () => {
  it('≤ 50: kết quả từng bản ghi ngay; khách ngoài scope chỉ hỏng khách đó', async () => {
    const mine = await act('contact.create', { input: { full_name: 'Bulk của sales', phone: '0912888001' } }, as(sales));
    const other = await act('contact.create', { input: { full_name: 'Bulk của owner', phone: '0912888002' } });
    const a = mine.body.data.result.contact_id;
    const b = other.body.data.result.contact_id;
    const r = await bulk('contact.bulk_update', { contact_ids: [a, b, a], patch: { group: 'vip', add_tags: ['Khách quen'] } }, sales);
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result).toMatchObject({ updated: 1, failed: 1 });
    expect(r.body.data.result.items).toEqual([
      { id: a, status: 'done', error: null },
      { id: b, status: 'failed', error: 'NOT_FOUND:contact_id' },
    ]);
    expect((await db.contact.findUniqueOrThrow({ where: { id: a } })).group).toBe('vip');
    expect((await db.contact.findUniqueOrThrow({ where: { id: b } })).group).not.toBe('vip');
  });

  it('60 khách → 202; worker 60 biên nhận; chạy lại không ghi thêm; huỷ / thử lại chỉ bản ghi lỗi', async () => {
    const ids = await seed('BLK', 60);
    const r = await bulk('contact.bulk_update', { contact_ids: ids, patch: { city: 'Huế', add_tags: ['Đợt 1'] } });
    expect(r.status, JSON.stringify(r.body)).toBe(202);
    const jobId = r.body.data.job_id as string;
    // Một khách bị xoá trước khi worker chạy → biên nhận lỗi riêng khách đó.
    await db.contact.update({ where: { id: ids[7]! }, data: { deletedAt: h.clock.now() } });
    expect(await run(jobId)).toBe('completed');
    expect((await get(`/data-jobs/${jobId}`)).body.data).toMatchObject({ status: 'completed', total: 60, done: 59, failed: 1 });
    const failed = await get(`/data-jobs/${jobId}/items?only=failed`);
    expect(failed.body.data).toEqual([{ seq: 7, target_id: ids[7], status: 'failed', error: 'NOT_FOUND:contact_id' }]);
    const tags = await db.contactTag.count({ where: { contactId: { in: ids } } });
    expect(tags).toBe(59);
    // Thử lại: khôi phục khách → chỉ bản ghi lỗi chạy, bản ghi đã xong không ghi lần hai.
    await db.contact.update({ where: { id: ids[7]! }, data: { deletedAt: null } });
    const updatedBefore = (await db.contact.findUniqueOrThrow({ where: { id: ids[0]! } })).updatedAt;
    h.clock.advance(60_000);
    const rt = await act('data_job.retry', { input: { job_id: jobId } });
    expect(rt.status, JSON.stringify(rt.body)).toBe(202);
    expect(await run(jobId)).toBe('completed');
    expect((await get(`/data-jobs/${jobId}`)).body.data).toMatchObject({ done: 60, failed: 0 });
    expect((await db.contact.findUniqueOrThrow({ where: { id: ids[0]! } })).updatedAt).toEqual(updatedBefore);
    expect(await db.contactTag.count({ where: { contactId: { in: ids } } })).toBe(60);
    // Không còn gì để thử lại → 409; người khác huỷ / thử lại → 404.
    expect((await act('data_job.retry', { input: { job_id: jobId } })).status).toBe(409);
    expect((await act('data_job.cancel', { input: { job_id: jobId } }, as(manager))).status).toBe(404);
  }, 120_000);

  it('huỷ trước khi chạy → cancelled, không ghi bản ghi nào; người tạo mất quyền giữa chừng → failed forbidden', async () => {
    const ids = await seed('CNL', 55);
    const r = await bulk('contact.bulk_update', { contact_ids: ids, patch: { city: 'Vinh' } });
    const jobId = r.body.data.job_id as string;
    expect((await act('data_job.cancel', { input: { job_id: jobId } })).body.data.result.status).toBe('cancelling');
    expect(await run(jobId)).toBe('cancelled');
    expect(await db.contact.count({ where: { id: { in: ids }, city: 'Vinh' } })).toBe(0);

    const mids = await seed('REV', 52);
    await db.contact.updateMany({ where: { id: { in: mids } }, data: { ownerUserId: manager.id } });
    const m = await bulk('contact.bulk_update', { contact_ids: mids, patch: { city: 'Đà Lạt' } }, manager);
    expect(m.status, JSON.stringify(m.body)).toBe(202);
    await h.platform.membership.updateMany({ where: { workspaceId: h.ws, userId: manager.id }, data: { status: 'removed' } });
    expect(await run(m.body.data.job_id)).toBe('failed');
    expect((await db.dataJob.findUniqueOrThrow({ where: { id: m.body.data.job_id } })).error).toBe('forbidden');
    expect(await db.contact.count({ where: { id: { in: mids }, city: 'Đà Lạt' } })).toBe(0);
  }, 120_000);
});
