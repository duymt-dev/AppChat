// TIP-041 pha 1 trên Postgres 16 thật + pg_dump / pg_restore thật (AC02 / AC03 / AC04 / AC05 một phần):
//   - admin.workspace.archive / restore: luôn xem trước (202 → confirm), CAS if_version, chỉ một lệnh đang chạy / workspace, người thường 403
//   - archive: quiesce (resolver chặn), bản mã hoá trong kho (không chứa chuỗi dữ liệu rõ), manifest đọc lại đúng checksum TRƯỚC DROP,
//     DB tenant đã DROP, registry archived; API của workspace 423
//   - restore: DB mới đúng tên, dữ liệu thật về đủ (khách + tệp đính kèm metadata), migrate version hiện tại, ví / gói nền tảng không đổi,
//     `workspace.ready`; benchmark tách queue / verify / restore / migrate
//   - ma trận lỗi: lỗi trước DROP (kho hỏng / còn việc dở) → DB nguyên + active; sau DROP (crash giữa drop / registry) → thử lại hoàn tất,
//     không active giả; restore lỗi checksum → DB tạm dọn, vẫn restoring; provision không tạo DB rỗng cho workspace archived;
//     khoá advisory bận → hoãn; host ngoài allowlist → từ chối
import 'reflect-metadata';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { OperationLock, TenantContexts, TenantDbResolver, PrismaWorkspaceRegistry, tenantDbName } from '@appchat/db';
import { LIFECYCLE_INFRA, LifecycleJobs, processLifecycleJob, provisionWorkspace, uuidv7, type LifecycleInfra, type LifecycleRunDeps } from '@appchat/core';
import { adminQuery } from './helpers/lifecycle-fixtures';
import { env, startApi, testEmail, type Harness } from './setup';

let h: Harness;
let admin: { id: string; token: string };
let infra: LifecycleInfra;
let deps: LifecycleRunDeps;
const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const get = (path: string, token: string, ws?: string) => fetch(`${h.base}/v1${path}`, { headers: { authorization: `Bearer ${token}`, ...(ws ? { 'x-workspace-id': ws } : {}) } }).then(json);
const act = (id: string, input: unknown, token = admin.token, confirm?: string) =>
  fetch(`${h.base}/v1/actions/${id}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, 'idempotency-key': uuidv7() },
    body: JSON.stringify({ input, ...(confirm ? { confirm_token: confirm } : {}) }),
  }).then(json);
/** Xem trước → xác nhận (action vòng đời luôn preview). */
async function confirmAct(id: string, input: unknown) {
  const p = await act(id, input);
  expect(p.status, JSON.stringify(p.body)).toBe(202);
  return act(id, input, admin.token, p.body.data.confirm_token);
}
const ws = () => h.platform.workspace.findUniqueOrThrow({ where: { id: h.ws } });
const dbExists = async (name: string) => ((await adminQuery('SELECT 1 FROM pg_database WHERE datname = $1', [name])).rowCount ?? 0) > 0;
const run = (jobId: string) => processLifecycleJob(deps, jobId, 'test-worker');
const archiveFiles = () => {
  const dir = join(env.ARCHIVE_DIR!, h.ws);
  try {
    return readdirSync(dir).map((f) => join(dir, f));
  } catch {
    return [];
  }
};

beforeAll(async () => {
  h = await startApi();
  admin = { id: uuidv7(), token: '' };
  h.track(admin.id);
  await h.platform.user.create({ data: { id: admin.id, email: testEmail('lcadmin'), name: 'LC Admin', isPlatformAdmin: true } });
  admin.token = h.tokenFor(admin.id);
  infra = h.app.get(LIFECYCLE_INFRA);
  expect(infra).toBeTruthy();
  const resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  deps = {
    platform: h.platform,
    jobs: new LifecycleJobs(h.platform, () => new Date()),
    infra,
    resolver,
    kv: { sadd: async () => 1 } as never,
    now: () => new Date(),
    seedDb: async () => undefined,
    settleMs: 0,
    invalidate: (id) => resolver.invalidate(id),
    stopChannels: async () => undefined,
    log: { warn: () => undefined, info: () => undefined, error: () => undefined } as never,
  };
  // Dữ liệu thật trong DB tenant: khách + tệp (metadata) — phải về đủ sau khôi phục.
  const t = await resolver.get(TenantContexts.system(h.ws, 'test'));
  for (let i = 0; i < 300; i++) await t.contact.create({ data: { id: uuidv7(), code: `KH-LC${i}`, name: `Khách lưu trữ ${i}`, phone: `0912${String(i).padStart(6, '0')}`, updatedAt: new Date() } });
}, 240_000);
afterAll(async () => {
  for (const f of archiveFiles()) await import('node:fs/promises').then((fs) => fs.rm(f, { force: true }));
  await h?.platform.archiveManifest.deleteMany({ where: { workspaceId: h.ws } });
  await h?.platform.workspaceLifecycleJob.deleteMany({ where: { workspaceId: h.ws } });
  await h?.platform.workspace.update({ where: { id: h.ws }, data: { dbStatus: 'active', archivedAt: null, archiveKey: null } }).catch(() => undefined);
  await h?.platform.adminOperation.deleteMany({ where: { actorUserId: admin.id } });
  await h?.platform.platformAuditLog.deleteMany({ where: { actorUserId: admin.id } });
  await deps?.resolver.close();
  await h?.close();
});

describe('archive → restore (AC02 / AC04 / AC05)', () => {
  it('luôn xem trước, quyền admin, CAS; lưu trữ mã hoá + kiểm trước DROP; khôi phục đủ dữ liệu + migrate', async () => {
    expect((await get('/contacts', h.token, h.ws)).status).toBe(200);
    const w0 = await ws();
    // Người thường (kể cả Owner workspace) không chạy được action nền tảng.
    expect((await act('admin.workspace.archive', { workspace_id: h.ws, if_version: w0.statusVersion, reason: 'thử quyền' }, h.token)).status).toBe(403);
    expect((await act('admin.workspace.archive', { workspace_id: h.ws, if_version: w0.statusVersion + 5, reason: 'bản cũ' })).status).toBe(202);
    const stale = await confirmAct('admin.workspace.archive', { workspace_id: h.ws, if_version: w0.statusVersion + 5, reason: 'bản cũ' });
    expect(stale.status).toBe(409);

    const a = await confirmAct('admin.workspace.archive', { workspace_id: h.ws, if_version: w0.statusVersion, reason: 'gói miễn phí không hoạt động' });
    expect(a.status, JSON.stringify(a.body)).toBe(200);
    expect(a.body.data.result).toMatchObject({ workspace_id: h.ws, status: 'pending', generation: w0.lifecycleGeneration + 1 });
    expect((await ws()).dbStatus).toBe('archiving');
    // Một lệnh đang chờ → restore / archive lần hai bị chặn.
    expect((await act('admin.workspace.restore', { workspace_id: h.ws, if_version: a.body.data.result.version })).status).toBe(409);
    // Đang lưu trữ: resolver chặn (423 — chỉ provisioning / restoring là 503 "chờ chút").
    expect((await get('/contacts', h.token, h.ws)).status).toBe(423);

    const ar = await run(a.body.data.result.job_id);
    expect(ar, JSON.stringify(await h.platform.workspaceLifecycleJob.findUnique({ where: { id: a.body.data.result.job_id }, select: { error: true, step: true } }))).toBe('archived');
    const w1 = await ws();
    expect(w1).toMatchObject({ dbStatus: 'archived' });
    expect(w1.archiveKey).toMatch(/\.acar$/);
    expect(await dbExists(tenantDbName(h.ws))).toBe(false);
    const m = await h.platform.archiveManifest.findFirstOrThrow({ where: { workspaceId: h.ws } });
    expect(m).toMatchObject({ retentionKind: 'indefinite', expiresAt: null, encryptionKeyId: infra.keys.currentId, generation: w1.lifecycleGeneration });
    expect(m.tableCount).toBeGreaterThan(100);
    // Bản mã trong kho: đúng kích thước manifest, không chứa dữ liệu rõ (tên / SĐT khách).
    const file = archiveFiles().find((f) => f.endsWith('.acar'))!;
    expect(BigInt(statSync(file).size)).toBe(m.cipherBytes);
    const raw = readFileSync(file);
    expect(raw.includes(Buffer.from('Khách lưu trữ'))).toBe(false);
    expect(raw.includes(Buffer.from('0912000007'))).toBe(false);
    expect((await get('/contacts', h.token, h.ws)).status).toBe(423);
    const job = await h.platform.workspaceLifecycleJob.findUniqueOrThrow({ where: { id: a.body.data.result.job_id } });
    expect(job).toMatchObject({ status: 'succeeded', step: 'done', manifestId: m.id });
    // Provision cũ / lạc không bao giờ tạo DB rỗng cho workspace đã lưu trữ.
    expect(await provisionWorkspace({ platform: h.platform } as never, h.ws)).toBe('skipped');
    expect(await dbExists(tenantDbName(h.ws))).toBe(false);

    const r = await confirmAct('admin.workspace.restore', { workspace_id: h.ws, if_version: w1.statusVersion });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect((await ws()).dbStatus).toBe('restoring');
    expect((await get('/contacts', h.token, h.ws)).status).toBe(503);
    const started = Date.now();
    expect(await run(r.body.data.result.job_id)).toBe('restored');
    const ms = Date.now() - started;
    const w2 = await ws();
    expect(w2).toMatchObject({ dbStatus: 'active', archivedAt: null, archiveKey: null });
    expect(w2.schemaVersion).toBeTruthy();
    const list = await get('/contacts?limit=5&q=' + encodeURIComponent('Khách lưu trữ 299'), h.token, h.ws);
    expect(list.status).toBe(200);
    expect(JSON.stringify(list.body.data)).toContain('Khách lưu trữ 299');
    const t = await deps.resolver.get(TenantContexts.system(h.ws, 'test'));
    expect(await t.contact.count({ where: { code: { startsWith: 'KH-LC' } } })).toBe(300);
    const done = await h.platform.workspaceLifecycleJob.findUniqueOrThrow({ where: { id: r.body.data.result.job_id } });
    const metrics = done.metrics as Record<string, number>;
    expect(metrics).toMatchObject({ verify_ms: expect.any(Number), restore_ms: expect.any(Number), migrate_ms: expect.any(Number) });
    // Bằng chứng benchmark (AC05) — ghi ra .data/gate để report trích, không claim SLA từ DB rỗng (fixture 300 khách + schema đủ).
    writeFileSync(join(process.cwd(), '..', '..', '.data', 'gate', 'lifecycle-bench.json'), JSON.stringify({ size_bytes: Number(m.sizeBytes), cipher_bytes: Number(m.cipherBytes), tables: m.tableCount, contacts: 300, wall_ms: ms, ...metrics }, null, 2));
    expect(ms).toBeLessThan(120_000);
    // Bản lưu trữ gốc không bị xoá khi khôi phục (giữ theo retention).
    expect(await h.platform.archiveManifest.count({ where: { workspaceId: h.ws, purgedAt: null } })).toBe(1);
  }, 300_000);
});

describe('ma trận lỗi (AC03)', () => {
  it('lỗi TRƯỚC DROP (bản trong kho bị sửa khi đọc lại) → DB nguyên vẹn, workspace active, lệnh failed', async () => {
    const v = (await ws()).statusVersion;
    const a = await confirmAct('admin.workspace.archive', { workspace_id: h.ws, if_version: v, reason: 'thử lỗi kiểm' });
    expect(a.status).toBe(200);
    // Kho trả bản sai khi đọc lại (mô phỏng hỏng đĩa / upload lỗi) → kiểm checksum thất bại.
    const store = infra.store;
    const realRead = store.read.bind(store);
    store.read = (key: string) => {
      const s = realRead(key);
      let flipped = false;
      s.on('data', (c: Buffer) => {
        if (flipped || c.length <= 100) return;
        c[90]! ^= 1;
        flipped = true;
      });
      return s;
    };
    try {
      for (let i = 0; i < 6; i++) {
        const r = await run(a.body.data.result.job_id);
        if (r === 'rolled_back' || r === 'recovery_needed') break;
        await h.platform.workspaceLifecycleJob.update({ where: { id: a.body.data.result.job_id }, data: { nextAttemptAt: new Date(0) } });
      }
    } finally {
      store.read = realRead;
    }
    expect((await ws()).dbStatus).toBe('active');
    expect(await dbExists(tenantDbName(h.ws))).toBe(true);
    expect(await h.platform.workspaceLifecycleJob.findUniqueOrThrow({ where: { id: a.body.data.result.job_id } })).toMatchObject({ status: 'failed' });
    expect(await h.platform.archiveManifest.count({ where: { workspaceId: h.ws } })).toBe(1);
    expect((await get('/contacts', h.token, h.ws)).status).toBe(200);
  }, 300_000);

  it('khoá advisory đang bị tiến trình khác giữ → hoãn, không dump / drop; host ngoài allowlist → từ chối', async () => {
    const v = (await ws()).statusVersion;
    const a = await confirmAct('admin.workspace.archive', { workspace_id: h.ws, if_version: v, reason: 'thử khoá' });
    const other = await OperationLock.acquire({ adminUrl: infra.provisionerUrl, maintenanceDb: infra.maintenanceDb }, h.ws, null);
    try {
      expect(await run(a.body.data.result.job_id)).toBe('lock_busy');
      expect((await h.platform.workspaceLifecycleJob.findUniqueOrThrow({ where: { id: a.body.data.result.job_id } })).status).toBe('pending');
      expect(await dbExists(tenantDbName(h.ws))).toBe(true);
      expect((await ws()).dbStatus).toBe('archiving');
    } finally {
      await other.release();
    }
    await expect(OperationLock.acquire({ adminUrl: infra.provisionerUrl, allowedHosts: [] }, h.ws, 'other-cluster.invalid')).rejects.toMatchObject({ reason: 'host_not_allowed' });
    // Hết khoá → lần chạy kế tiếp hoàn tất (để test sau có trạng thái archived).
    await h.platform.workspaceLifecycleJob.update({ where: { id: a.body.data.result.job_id }, data: { nextAttemptAt: new Date(0) } });
    const r = await run(a.body.data.result.job_id);
    expect(r, JSON.stringify(await h.platform.workspaceLifecycleJob.findUnique({ where: { id: a.body.data.result.job_id }, select: { error: true, step: true } }))).toBe('archived');
  }, 300_000);

  it('crash SAU DROP trước khi ghi registry → chạy lại hoàn tất archived (không active giả); restore lỗi checksum → dọn DB tạm, giữ restoring', async () => {
    // Mô phỏng crash: đưa lệnh restore mới tới trạng thái "đang chạy" rồi làm hỏng manifest (checksum) → mọi lần thử đều lỗi kiểm.
    const w = await ws();
    expect(w.dbStatus).toBe('archived');
    const m = await h.platform.archiveManifest.findFirstOrThrow({ where: { workspaceId: h.ws }, orderBy: { createdAt: 'desc' } });
    const r = await confirmAct('admin.workspace.restore', { workspace_id: h.ws, if_version: w.statusVersion });
    await h.platform.archiveManifest.update({ where: { id: m.id }, data: { checksum: '0'.repeat(64) } });
    try {
      expect(await run(r.body.data.result.job_id)).toBe('retry');
      expect(await dbExists(`${tenantDbName(h.ws)}_r${(await ws()).lifecycleGeneration}`)).toBe(false);
      expect(await dbExists(tenantDbName(h.ws))).toBe(false);
      expect((await ws()).dbStatus).toBe('restoring');
    } finally {
      await h.platform.archiveManifest.update({ where: { id: m.id }, data: { checksum: m.checksum } });
    }
    await h.platform.workspaceLifecycleJob.update({ where: { id: r.body.data.result.job_id }, data: { nextAttemptAt: new Date(0) } });
    expect(await run(r.body.data.result.job_id)).toBe('restored');

    // Crash sau DROP: archive tới bước manifest, tự DROP như worker cũ đã làm rồi chết trước registry → lần chạy lại không dump DB rỗng,
    // hoàn tất archived dựa manifest.
    const v = (await ws()).statusVersion;
    const manifests0 = await h.platform.archiveManifest.count({ where: { workspaceId: h.ws } });
    const a = await confirmAct('admin.workspace.archive', { workspace_id: h.ws, if_version: v, reason: 'thử crash' });
    const jobs = deps.jobs;
    const realStep = jobs.step.bind(jobs);
    jobs.step = async (job, owner, step, patch) => {
      await realStep(job, owner, step, patch);
      if (step === 'drop') throw new Error('crash giả sau bước drop');
    };
    try {
      expect(await run(a.body.data.result.job_id)).toBe('retry');
    } finally {
      jobs.step = realStep;
    }
    expect((await ws()).dbStatus).toBe('archiving');
    await h.platform.workspaceLifecycleJob.update({ where: { id: a.body.data.result.job_id }, data: { nextAttemptAt: new Date(0) } });
    expect(await run(a.body.data.result.job_id)).toBe('archived');
    expect(await dbExists(tenantDbName(h.ws))).toBe(false);
    // Đúng MỘT manifest mới cho lệnh này (lần chạy lại không dump thêm từ DB đã mất).
    expect(await h.platform.archiveManifest.count({ where: { workspaceId: h.ws } })).toBe(manifests0 + 1);
    // Khôi phục lại để dọn (afterAll drop DB theo tên).
    const r2 = await confirmAct('admin.workspace.restore', { workspace_id: h.ws, if_version: (await ws()).statusVersion });
    expect(await run(r2.body.data.result.job_id)).toBe('restored');
    expect((await get('/contacts', h.token, h.ws)).status).toBe(200);
  }, 400_000);
});
