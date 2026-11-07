// TIP-041 pha 3 trên Postgres 16 thật + pg_dump thật (AC06 / AC07 / AC08):
//   - workspace.delete: chỉ đúng Owner (manager / Owner đã mất membership / admin nền tảng đều 403); nguồn assistant cấm; preview chỉ Owner;
//     tên sai → 422; mã email (chỉ lưu băm) sai → OTP_INVALID + đếm lần sai (transaction riêng); preview đổi → stale; mã đúng → lệnh xoá
//   - worker: sao lưu mã hoá → manifest `deletion` hạn = lúc xác nhận + 30 ngày → DROP → tombstone (membership removed, lời mời thu hồi,
//     route kênh xoá, subscription cancelled, hoá đơn / ví giữ) → resolver từ chối; audit / action log không chứa mã
//   - purge: chỉ manifest `deletion` hết hạn của workspace đã tombstone; bản `indefinite` / hold / workspace sống không bị chạm
//   - đóng băng: Owner gửi (một yêu cầu chờ), admin duyệt CAS → workspace tạm dừng; từ chối → không đổi; requester bị gỡ → cancelled
import 'reflect-metadata';
import { readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver, tenantDbName } from '@appchat/db';
import { LIFECYCLE_INFRA, LifecycleJobs, processLifecycleJob, purgeExpired, uuidv7, type LifecycleRunDeps } from '@appchat/core';
import { adminQuery } from './helpers/lifecycle-fixtures';
import { env, startApi, testEmail, type Harness } from './setup';

const DAY = 86_400_000;
let h: Harness;
let resolver: TenantDbResolver;
let deps: LifecycleRunDeps;
let admin: { id: string; token: string };
const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const get = (path: string, token = h.token) => fetch(`${h.base}/v1${path}`, { headers: { authorization: `Bearer ${token}`, 'x-workspace-id': h.ws } }).then(json);
const act = (id: string, input: unknown, token = h.token, extra: Record<string, string> = {}) =>
  fetch(`${h.base}/v1/actions/${id}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, 'x-workspace-id': h.ws, 'idempotency-key': uuidv7(), ...extra },
    body: JSON.stringify({ input }),
  }).then(json);
const adminAct = async (id: string, input: unknown) => {
  const send = (confirm?: string) =>
    fetch(`${h.base}/v1/actions/${id}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${admin.token}`, 'idempotency-key': uuidv7() },
      body: JSON.stringify({ input, ...(confirm ? { confirm_token: confirm } : {}) }),
    }).then(json);
  const p = await send();
  return p.status === 202 ? send(p.body.data.confirm_token) : p;
};
const ws = () => h.platform.workspace.findUniqueOrThrow({ where: { id: h.ws } });
const dbExists = async (name: string) => ((await adminQuery('SELECT 1 FROM pg_database WHERE datname = $1', [name])).rowCount ?? 0) > 0;
const ownerEmail = async () => (await h.platform.user.findUniqueOrThrow({ where: { id: h.user } })).email;
const lastCode = async () => /<b>(\d{6})<\/b>/.exec(h.mail.last(await ownerEmail())?.html ?? '')?.[1] ?? null;
const archiveDir = () => join(env.ARCHIVE_DIR!, h.ws);
/** Manifest giả (thế hệ cũ / workspace khác) — khoá đúng hình dạng kho, tệp không tồn tại (remove force). */
const fakeManifest = (workspaceId: string, extra: Record<string, unknown>) => {
  const id = uuidv7();
  return h.platform.archiveManifest.create({
    data: {
      id, workspaceId, jobId: uuidv7(), generation: 0, storageKey: `${workspaceId}/g0-${id}.acar`, dbName: tenantDbName(workspaceId), envelopeVersion: 1,
      encryptionKeyId: deps.infra.keys.currentId, checksum: 'x', sizeBytes: 1n, cipherChecksum: 'x', cipherBytes: 1n, tocEntries: 1, tableCount: 1,
      verifiedAt: new Date(), createdAt: new Date(Date.now() - 90 * DAY), ...extra,
    },
  });
};

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  admin = { id: uuidv7(), token: '' };
  h.track(admin.id);
  await h.platform.user.create({ data: { id: admin.id, email: testEmail('lcdel'), name: 'LC Admin', isPlatformAdmin: true } });
  admin.token = h.tokenFor(admin.id);
  deps = {
    platform: h.platform,
    jobs: new LifecycleJobs(h.platform, () => new Date()),
    infra: h.app.get(LIFECYCLE_INFRA),
    resolver,
    kv: { sadd: async () => 1 } as never,
    now: () => new Date(),
    seedDb: async () => undefined,
    settleMs: 0,
    invalidate: (id) => resolver.invalidate(id),
    stopChannels: async () => undefined,
    log: { warn: () => undefined, info: () => undefined, error: () => undefined } as never,
  };
  const t = await resolver.get(TenantContexts.system(h.ws, 'test'));
  for (let i = 0; i < 20; i++) await t.contact.create({ data: { id: uuidv7(), code: `KH-DEL${i}`, name: `Khách xoá ${i}`, phone: `0913${String(i).padStart(6, '0')}`, updatedAt: new Date() } });
}, 240_000);

afterAll(async () => {
  try {
    for (const f of readdirSync(archiveDir())) rmSync(join(archiveDir(), f), { force: true });
  } catch {
    /* chưa có bản sao lưu */
  }
  await h?.platform.archiveManifest.deleteMany({ where: { workspaceId: h.ws } });
  await h?.platform.workspaceLifecycleJob.deleteMany({ where: { workspaceId: h.ws } });
  await h?.platform.workspaceStepUp.deleteMany({ where: { workspaceId: h.ws } });
  await h?.platform.workspaceFreezeRequest.deleteMany({ where: { workspaceId: h.ws } });
  await h?.platform.adminOperation.deleteMany({ where: { actorUserId: { in: [admin.id, h.user] } } });
  await h?.platform.platformAuditLog.deleteMany({ where: { workspaceId: h.ws } });
  await h?.platform.workspace.update({ where: { id: h.ws }, data: { status: 'active', dbStatus: 'active', deletedAt: null, suspendedAt: null, suspendReason: null } }).catch(() => undefined);
  await resolver?.close();
  await h?.close();
});

describe('yêu cầu đóng băng (DC-245)', () => {
  it('chỉ Owner gửi, một yêu cầu chờ; từ chối không đổi workspace; duyệt CAS → tạm dừng; requester bị gỡ → cancelled', async () => {
    const mgr = await h.member('manager');
    expect((await act('workspace.freeze_request', { reason: 'không phải chủ' }, mgr.token)).status).toBe(403);
    expect((await act('workspace.freeze_request', { reason: 'qua trợ lý' }, h.token, { 'x-action-source': 'assistant' })).status).toBe(403);
    const r1 = await act('workspace.freeze_request', { reason: 'Tạm nghỉ 2 tháng' });
    expect(r1.status, JSON.stringify(r1.body)).toBe(200);
    expect((await act('workspace.freeze_request', { reason: 'lần nữa' })).status).toBe(409);
    expect((await get('/workspace/lifecycle')).body.data.freeze_request).toMatchObject({ id: r1.body.data.result.request_id, status: 'pending' });
    expect((await get('/workspace/lifecycle', mgr.token)).body.data.freeze_request).toBeNull();
    // Danh sách admin: người thường 403.
    expect((await get('/admin/freeze-requests', h.token)).status).toBe(403);
    const list = await fetch(`${h.base}/v1/admin/freeze-requests?status=pending`, { headers: { authorization: `Bearer ${admin.token}` } }).then(json);
    const row = list.body.data.find((x: { id: string }) => x.id === r1.body.data.result.request_id);
    expect(row).toMatchObject({ workspace_id: h.ws, status: 'pending', version: 1 });

    // Owner không gọi được action admin.
    expect((await act('admin.workspace.freeze_decide', { request_id: row.id, if_version: 1, decision: 'approve', reason: 'tự duyệt' })).status).toBe(403);
    const rej = await adminAct('admin.workspace.freeze_decide', { request_id: row.id, if_version: 1, decision: 'reject', reason: 'Gọi lại xác nhận' });
    expect(rej.status, JSON.stringify(rej.body)).toBe(200);
    expect(rej.body.data.result).toMatchObject({ status: 'rejected', version: 2 });
    expect((await ws()).status).toBe('active');

    const r2 = await act('workspace.freeze_request', { reason: 'Đóng cửa sửa chữa' });
    const id2 = r2.body.data.result.request_id;
    expect((await adminAct('admin.workspace.freeze_decide', { request_id: id2, if_version: 7, decision: 'approve', reason: 'bản cũ' })).status).toBe(409);
    const ap = await adminAct('admin.workspace.freeze_decide', { request_id: id2, if_version: 1, decision: 'approve', reason: 'Owner xác nhận' });
    expect(ap.body.data.result.status).toBe('approved');
    expect(await ws()).toMatchObject({ status: 'suspended', dbStatus: 'suspended' });
    expect((await get('/workspace/lifecycle')).body.data.freeze_request.status).toBe('approved');
    await h.platform.workspace.update({ where: { id: h.ws }, data: { status: 'active', dbStatus: 'active', suspendedAt: null, suspendReason: null } });

    // Requester không còn là Owner → yêu cầu cancelled, workspace không đổi.
    const r3 = await act('workspace.freeze_request', { reason: 'Yêu cầu thứ ba' });
    await h.platform.workspace.update({ where: { id: h.ws }, data: { ownerUserId: mgr.id } });
    const c = await adminAct('admin.workspace.freeze_decide', { request_id: r3.body.data.result.request_id, if_version: 1, decision: 'approve', reason: 'duyệt' });
    expect(c.body.data.result.status).toBe('cancelled');
    expect((await ws()).status).toBe('active');
    await h.platform.workspace.update({ where: { id: h.ws }, data: { ownerUserId: h.user } });
  }, 120_000);
});

describe('xoá workspace (AC06 / AC07)', () => {
  it('chỉ đúng Owner + mã email; sao lưu 30 ngày → DROP → tombstone; purge chỉ bản hết hạn', async () => {
    const w0 = await ws();
    const mgr = await h.member('manager');
    // Preview / thử thách: chỉ Owner; admin nền tảng không xoá thay.
    expect((await get('/workspace/delete-preview', mgr.token)).status).toBe(403);
    expect((await act('workspace.delete_challenge', { confirm_name: w0.name }, mgr.token)).status).toBe(403);
    expect((await act('workspace.delete_challenge', { confirm_name: w0.name }, admin.token)).status).toBe(403);
    expect((await act('workspace.delete_challenge', { confirm_name: w0.name }, h.token, { 'x-action-source': 'assistant' })).status).toBe(403);
    const pv = await get('/workspace/delete-preview');
    expect(pv.status, JSON.stringify(pv.body)).toBe(200);
    expect(pv.body.data).toMatchObject({ workspace_id: h.ws, name: w0.name, backup_retention_days: 30, retained: ['billing_invoices', 'wallet_ledger', 'audit_log'] });
    expect((await act('workspace.delete_challenge', { confirm_name: 'tên khác' })).body.error.fields).toMatchObject({ confirm_name: 'mismatch' });

    // Mã sai → OTP_INVALID, lần sai được ghi dù thao tác rollback.
    const c1 = await act('workspace.delete_challenge', { confirm_name: ` ${w0.name.toUpperCase()} ` });
    expect(c1.status, JSON.stringify(c1.body)).toBe(200);
    const code1 = await lastCode();
    expect(code1).toMatch(/^\d{6}$/);
    const step = await h.platform.workspaceStepUp.findUniqueOrThrow({ where: { id: c1.body.data.result.challenge_id } });
    expect(step.codeHash).not.toContain(code1!);
    const bad = await act('workspace.delete', { challenge_id: step.id, otp: code1 === '000000' ? '111111' : '000000', acknowledge_loss: true });
    expect(bad.body.error).toMatchObject({ code: 'OTP_INVALID', fields: { otp: 'invalid' } });
    expect((await h.platform.workspaceStepUp.findUniqueOrThrow({ where: { id: step.id } })).attempts).toBe(1);
    // Manager không dùng được mã của Owner.
    expect((await act('workspace.delete', { challenge_id: step.id, otp: code1, acknowledge_loss: true }, mgr.token)).status).toBe(403);
    // Bản xem trước đổi (đổi tên) → mã chết.
    await h.platform.workspace.update({ where: { id: h.ws }, data: { name: `${w0.name} 2` } });
    expect((await act('workspace.delete', { challenge_id: step.id, otp: code1, acknowledge_loss: true })).body.error.fields).toMatchObject({ otp: 'stale' });
    await h.platform.workspace.update({ where: { id: h.ws }, data: { name: w0.name } });

    // Bản lưu trữ cũ `indefinite` của thế hệ trước (giả) + bản đang hold → tombstone phải chuyển / giữ đúng.
    const oldM = await fakeManifest(h.ws, { retentionKind: 'indefinite' });
    const held = await fakeManifest(h.ws, { retentionKind: 'indefinite', holdReason: 'tranh chấp' });

    const c2 = await act('workspace.delete_challenge', { confirm_name: w0.name });
    const code2 = (await lastCode())!;
    expect((await h.platform.workspaceStepUp.findUniqueOrThrow({ where: { id: step.id } })).consumedAt).not.toBeNull();
    const d = await act('workspace.delete', { challenge_id: c2.body.data.result.challenge_id, otp: code2, acknowledge_loss: true });
    expect(d.status, JSON.stringify(d.body)).toBe(200);
    expect(d.body.data.result).toMatchObject({ workspace_id: h.ws, db_status: 'deleting' });
    // Dùng lại mã → hết hạn (đã tiêu).
    expect((await act('workspace.delete', { challenge_id: c2.body.data.result.challenge_id, otp: code2, acknowledge_loss: true })).status).toBeGreaterThanOrEqual(400);
    expect((await ws()).dbStatus).toBe('deleting');
    expect((await get('/contacts')).status).toBe(423);
    const audit = await h.platform.platformAuditLog.findMany({ where: { workspaceId: h.ws, actionId: { in: ['workspace.delete', 'workspace.delete_challenge'] } } });
    expect(audit.length).toBeGreaterThanOrEqual(2);
    for (const a of audit) expect(JSON.stringify(a)).not.toContain(code2);

    const job = await h.platform.workspaceLifecycleJob.findUniqueOrThrow({ where: { id: d.body.data.result.job_id } });
    expect(job).toMatchObject({ operation: 'delete', fromDbStatus: 'active', source: 'owner' });
    expect(await processLifecycleJob(deps, job.id, 'test-worker')).toBe('deleted');
    expect(await dbExists(tenantDbName(h.ws))).toBe(false);
    const w1 = await ws();
    expect(w1.dbStatus).toBe('deleted');
    expect(w1.deletedAt).not.toBeNull();
    const backup = await h.platform.archiveManifest.findFirstOrThrow({ where: { id: (await h.platform.workspaceLifecycleJob.findUniqueOrThrow({ where: { id: job.id } })).manifestId! } });
    const expiry = job.createdAt.getTime() + 30 * DAY;
    expect(backup).toMatchObject({ retentionKind: 'deletion' });
    expect(backup.expiresAt!.getTime()).toBe(expiry);
    // Mọi thế hệ chuyển retention xoá; bản hold giữ nguyên lý do + retention.
    expect(await h.platform.archiveManifest.findUniqueOrThrow({ where: { id: oldM.id } })).toMatchObject({ retentionKind: 'deletion', expiresAt: new Date(expiry) });
    expect(await h.platform.archiveManifest.findUniqueOrThrow({ where: { id: held.id } })).toMatchObject({ retentionKind: 'indefinite', holdReason: 'tranh chấp' });
    // Tombstone: không còn membership active / route; subscription cancelled; resolver từ chối.
    expect(await h.platform.membership.count({ where: { workspaceId: h.ws, status: { not: 'removed' } } })).toBe(0);
    expect(await h.platform.tenantChannelRoute.count({ where: { workspaceId: h.ws } })).toBe(0);
    const sub = await h.platform.subscription.findUnique({ where: { workspaceId: h.ws } });
    if (sub) expect(sub.status).toBe('cancelled');
    expect((await get('/workspace/lifecycle')).status).toBe(403);
    await expect(resolver.get(TenantContexts.system(h.ws, 'test'))).rejects.toThrow();

    // Purge: trước hạn không chạm; sau hạn chỉ bản deletion không hold (kể cả thế hệ cũ), không bao giờ bản hold.
    const store = deps.infra.store;
    const early = await purgeExpired({ platform: h.platform, infra: { store }, files: null, now: () => new Date(expiry - DAY) });
    expect(early.manifests).toBe(0);
    const late = await purgeExpired({ platform: h.platform, infra: { store }, files: null, now: () => new Date(expiry + 1000) });
    expect(late.manifests).toBeGreaterThanOrEqual(2);
    expect((await h.platform.archiveManifest.findUniqueOrThrow({ where: { id: backup.id } })).purgedAt).not.toBeNull();
    expect((await h.platform.archiveManifest.findUniqueOrThrow({ where: { id: oldM.id } })).purgedAt).not.toBeNull();
    expect((await h.platform.archiveManifest.findUniqueOrThrow({ where: { id: held.id } })).purgedAt).toBeNull();
    expect(readdirSync(archiveDir()).some((f) => f.includes(backup.id))).toBe(false);
  }, 300_000);
});

describe('purge không chạm workspace sống', () => {
  it('manifest deletion hết hạn của workspace chưa tombstone → skipped', async () => {
    const other = await h.platform.workspace.findFirst({ where: { dbStatus: 'active', id: { not: h.ws } }, select: { id: true } });
    if (!other) return;
    const m = await fakeManifest(other.id, { retentionKind: 'deletion', expiresAt: new Date(Date.now() - DAY) });
    try {
      const r = await purgeExpired({ platform: h.platform, infra: { store: deps.infra.store }, files: null, now: () => new Date() });
      expect(r.skipped).toBeGreaterThanOrEqual(1);
      expect((await h.platform.archiveManifest.findUniqueOrThrow({ where: { id: m.id } })).purgedAt).toBeNull();
    } finally {
      await h.platform.archiveManifest.delete({ where: { id: m.id } });
    }
  });
});
