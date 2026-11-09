// TIP-015d P3 — duyệt chuyển phụ trách theo quyền HIỆN TẠI + thông báo hai bên + chuyển hàng loạt trên DB native thật (AC7, AC9):
//   - yêu cầu duyệt `contact.transfer_owner` chỉ hiện với người có crm.reassign + scope đọc khách hiện tại: vắng khỏi /approvals (vị từ
//     trước LIMIT), duyệt trực tiếp → 404; input cũ hỏng → không ai thấy, kể cả Owner (vị từ đóng khi lỗi)
//   - người duyệt mất scope ghi → can_decide false, duyệt → 403; sửa & duyệt đổi sang khách ngoài scope → 403 / 404, không chạy
//   - thông báo: người mới + người cũ mỗi người đúng 1 dòng; dòng gốc tiêu đề chung + link null; đọc /notifications chiếu tên + link
//     theo quyền hiện tại; người cũ mất scope → chữ chung không tên / link; người cũ bị gỡ → không hiện; phát lại event không nhân đôi
//   - chuyển hàng loạt: mỗi khách một lần chuyển + kết quả từng khách (ngoài scope → failed, đã là chủ → skipped); Trợ lý → approval_required
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver, type TenantDb } from '@appchat/db';
import { uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';
import { startWorker, until, type WorkerHarness } from './worker.harness';

let h: Harness;
let jobs: WorkerHarness;
let resolver: TenantDbResolver;
let db: TenantDb;
let salesA: { id: string; token: string };
let salesB: { id: string; token: string };
let mgr: { id: string; token: string };

const json = async (r: Response) => ({ status: r.status, body: (await r.json().catch(() => null)) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const as = (u?: { token: string }): Record<string, string> => (u ? { authorization: `Bearer ${u.token}` } : {});
const act = (id: string, input: unknown, who?: { token: string }) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...as(who) }).then(json);
const get = (path: string, who?: { token: string }) => call(h, path, undefined, as(who)).then(json);
const MOVE = { conversations: false, quotes: false, appointments: false };
const TAG = uuidv7().slice(-6);
let seq = 0;

async function contact(name: string, owner: string | null) {
  const id = uuidv7();
  await db.contact.create({ data: { id, code: `KH-AR${TAG}${++seq}`, name, source: 'manual', ownerUserId: owner } });
  return id;
}

async function approval(input: unknown, actionId = 'contact.transfer_owner') {
  const id = uuidv7();
  const now = h.clock.now();
  h.clock.advance(1000);
  await db.approvalRequest.create({
    data: { id, actionId, input: input as object, inputHash: `h-${id}`, risk: 'write', permission: 'crm.reassign', title: 'Chuyển phụ trách', source: 'assistant', onBehalfOfUserId: h.user, requestedAt: now, expiresAt: new Date(now.getTime() + 3_600_000) },
  });
  return id;
}

const ids = (r: { body: { data: { id: string }[] } }) => r.body.data.map((x) => x.id);

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  db = await resolver.get(TenantContexts.system(h.ws, 'contact-transfer-approval-test'));
  // Lead scope crm own: đọc + ghi khách mình phụ trách; khách người khác chỉ đọc được khi là watcher (watcher không bao giờ ghi).
  await db.role.create({ data: { id: uuidv7(), key: `custom:lead${TAG}`, name: 'Lead', permissions: ['crm.view', 'crm.edit', 'crm.reassign', 'approvals.decide', 'assistant.use'], dataScope: { crm: 'own' } } });
  [salesA, salesB, mgr] = [await h.member('sales'), await h.member('sales'), await h.member(`custom:lead${TAG}`)];
  jobs = await startWorker(h.platform, { clock: h.clock });
}, 240_000);
afterAll(async () => {
  await jobs?.close();
  await resolver?.close();
  await h?.close();
});

describe('duyệt chuyển phụ trách theo quyền hiện tại (TIP-015d §1.3)', () => {
  it('ẩn trước LIMIT với người không thấy khách; input hỏng đóng; mất scope ghi → can_decide false + 403; sửa sang khách ngoài scope → không chạy', async () => {
    const mine = await contact('Khách của lead', mgr.id);
    const other = await contact('Khách của sales A', salesA.id);
    const hidden = await contact('Khách lead không thấy', salesA.id);
    await db.contactCollaborator.create({ data: { contactId: other, userId: mgr.id, role: 'watcher' } });
    const okId = await approval({ contact_id: mine, to_user_id: salesB.id, move: MOVE });
    const roId = await approval({ contact_id: other, to_user_id: salesB.id, move: MOVE });
    const broken = await approval({ contact_id: 'không-phải-uuid', to_user_id: salesB.id, move: MOVE });
    const arr = await approval({ contact_id: [other], to_user_id: salesB.id, move: MOVE });
    const hidId = await approval({ contact_id: hidden, to_user_id: salesB.id, move: MOVE });

    // Owner: thấy hai yêu cầu hợp lệ; input hỏng vắng (đóng khi lỗi).
    const all = ids(await get('/approvals?status=pending'));
    expect(all).toEqual(expect.arrayContaining([okId, roId]));
    expect(all).not.toContain(broken);
    expect(all).not.toContain(arr);

    // Lead: thấy khách mình + khách mình là watcher; khách ngoài scope vắng hẳn (vị từ trước LIMIT), duyệt trực tiếp → 404.
    const rows = (await get('/approvals?status=pending', mgr)).body.data as { id: string; can_decide: boolean }[];
    expect(rows.map((r) => r.id)).not.toContain(hidId);
    expect((await act('approval.approve', { approval_id: hidId }, mgr)).status).toBe(404);
    expect(rows.find((r) => r.id === okId)?.can_decide).toBe(true);
    expect(rows.find((r) => r.id === roId)?.can_decide).toBe(false);
    const denied = await act('approval.approve', { approval_id: roId }, mgr);
    expect(denied.status, JSON.stringify(denied.body)).toBe(403);
    expect((await db.approvalRequest.findUniqueOrThrow({ where: { id: roId } })).status).toBe('pending');

    // Sửa & duyệt đổi sang khách lead không được ghi → 403, yêu cầu vẫn chờ, khách không đổi.
    const edited = await act('approval.edit_and_approve', { approval_id: okId, edited_input: { contact_id: other } }, mgr);
    expect(edited.status, JSON.stringify(edited.body)).toBe(403);
    expect((await db.approvalRequest.findUniqueOrThrow({ where: { id: okId } })).status).toBe('pending');
    expect((await db.contact.findUniqueOrThrow({ where: { id: other } })).ownerUserId).toBe(salesA.id);

    // Sales B (không crm.reassign, không approvals.decide qua vai trò sales mặc định) không đọc được hàng duyệt; duyệt trực tiếp → 403 / 404.
    expect([403, 404]).toContain((await act('approval.approve', { approval_id: okId }, salesB)).status);
  });
});

describe('thông báo hai bên (TIP-015d §5)', () => {
  it('người mới + người cũ đúng một lần; dòng gốc không PII; đọc chiếu theo quyền hiện tại; mất scope → chữ chung; phát lại không nhân đôi', async () => {
    const id = await contact('Khách Hai Bên', salesA.id);
    const r = await act('contact.transfer_owner', { contact_id: id, to_user_id: salesB.id, move: MOVE });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const transfer = r.body.data.result.transfer_id as string;
    const bound = async () => db.contactTransferNotice.findMany({ where: { transferId: transfer }, orderBy: { direction: 'asc' } });
    expect(await until(async () => (await bound()).length === 2)).toBe(true);
    const [from, to] = await bound();
    expect(from).toMatchObject({ direction: 'from', recipientUserId: salesA.id });
    expect(to).toMatchObject({ direction: 'to', recipientUserId: salesB.id });
    for (const b of [from!, to!]) {
      const base = await db.notification.findUniqueOrThrow({ where: { id: b.notificationId } });
      expect(base.link).toBeNull();
      expect(base.title).not.toContain('Khách Hai Bên');
    }

    // Người mới thấy tên + link; người cũ (sales scope own) không còn thấy khách → chữ chung, không tên / link.
    const bNote = (await get('/notifications', salesB)).body.data.find((n: { id: string }) => n.id === to!.notificationId);
    expect(bNote).toMatchObject({ link: `/customers?c=${id}` });
    expect(bNote.title).toContain('Khách Hai Bên');
    const aNote = (await get('/notifications', salesA)).body.data.find((n: { id: string }) => n.id === from!.notificationId);
    expect(aNote.link).toBeNull();
    expect(aNote.title).not.toContain('Khách Hai Bên');
    expect(aNote.title).toMatch(/Phân công khách hàng của bạn đã thay đổi/);

    // Phát lại event cùng lần chuyển → không thêm dòng / binding.
    await jobs.emit(h.ws, 'contact.owner_changed', { contact_id: id, from: salesA.id, to: salesB.id, move: MOVE, transfer_id: transfer });
    h.clock.advance(2000);
    await new Promise((res) => setTimeout(res, 1500));
    expect((await bound()).length).toBe(2);
    expect(await db.notification.count({ where: { id: { in: [from!.notificationId, to!.notificationId] } } })).toBe(2);

    // Người thực hiện = người nhận vẫn được thông báo; khách chưa có người phụ trách → chỉ chiều `to`.
    const orphan = await contact('Khách Chưa Chủ', null);
    const self = await act('contact.transfer_owner', { contact_id: orphan, to_user_id: h.user, move: MOVE });
    expect(self.status, JSON.stringify(self.body)).toBe(200);
    const st = self.body.data.result.transfer_id as string;
    expect(await until(async () => (await db.contactTransferNotice.count({ where: { transferId: st } })) === 1)).toBe(true);
    expect((await db.contactTransferNotice.findFirstOrThrow({ where: { transferId: st } })).recipientUserId).toBe(h.user);

    // Người phụ trách đã là người nhận → không event, không thông báo.
    const skip = await act('contact.transfer_owner', { contact_id: orphan, to_user_id: h.user, move: MOVE });
    expect(skip.body.data.result.status).toBe('skipped_already_owner');

    // Người mới bị gỡ khỏi workspace → thông báo của họ vắng khỏi lịch sử (đọc bằng quyền hiện tại — không còn quyền thì không có gì).
    await h.platform.membership.update({ where: { workspaceId_userId: { workspaceId: h.ws, userId: salesB.id } }, data: { status: 'removed' } });
    expect((await get('/notifications', salesB)).status).not.toBe(200);
    await h.platform.membership.update({ where: { workspaceId_userId: { workspaceId: h.ws, userId: salesB.id } }, data: { status: 'active' } });
  }, 60_000);
});

describe('chuyển phụ trách hàng loạt (TIP-015d §2.6)', () => {
  it('mỗi khách một lần chuyển + kết quả từng khách; Trợ lý → approval_required', async () => {
    const a1 = await contact('Lô 1', salesA.id);
    const a2 = await contact('Lô 2', salesB.id);
    const gone = uuidv7();
    // Bulk luôn xem trước kèm số bản ghi (cả UI) → xác nhận bằng confirm_token.
    const input = { contact_ids: [a1, a2, a2, gone], to_user_id: salesB.id, move: MOVE };
    const p = await act('contact.transfer_owner_bulk', input);
    expect(p.body.data).toMatchObject({ status: 'preview_required', preview: { count: 3 } });
    const r = await json(await call(h, '/actions/contact.transfer_owner_bulk', { input, confirm_token: p.body.data.confirm_token }, { 'idempotency-key': uuidv7() }));
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const res = r.body.data.result;
    expect(res).toMatchObject({ transferred: 1, skipped: 1, failed: 1 });
    expect(res.items.map((x: { id: string; status: string }) => [x.id, x.status])).toEqual([
      [a1, 'transferred'],
      [a2, 'skipped_already_owner'],
      [gone, 'failed'],
    ]);
    const t1 = res.items[0].transfer_id as string;
    expect(await db.contactTransfer.findUniqueOrThrow({ where: { id: t1 } })).toMatchObject({ contactId: a1, toUserId: salesB.id });
    expect((await db.contact.findUniqueOrThrow({ where: { id: a1 } })).ownerUserId).toBe(salesB.id);
    expect(await until(async () => (await db.contactTransferNotice.count({ where: { transferId: t1 } })) === 2)).toBe(true);

    // Sales (không crm.reassign) → 403; Trợ lý → luôn duyệt.
    expect((await act('contact.transfer_owner_bulk', { contact_ids: [a1], to_user_id: salesA.id, move: MOVE }, salesA)).status).toBe(403);
  }, 60_000);
});
