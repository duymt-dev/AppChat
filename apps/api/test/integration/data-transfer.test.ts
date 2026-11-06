// TIP-038b P1 (DC-374) — nhập khách hàng qua kế hoạch dùng chung, Postgres 16 + Memurai thật:
//   - transfer.plan đọc CSV thật (tiêu đề tiếng Việt, SĐT số 0 đầu, email hoa) → ánh xạ đoán đúng, kiểm tất định, phân loại hợp lệ / lỗi /
//     trùng trong tệp / khách của người khác (chỉ đếm, không lộ); không ghi khách nào trước khi commit;
//   - all_valid + còn lỗi → commit 409 `has_invalid`; update_mapping (CAS version) → only_valid → thẻ xác nhận cũ không dùng được (input
//     có version mới) → commit (bulk preview → confirm) ghi đúng số khách qua contact.import, biên nhận dòng applied / skipped;
//   - chạy lại commit cùng plan (đã completed) → 409, không ghi thêm; người khác đọc kế hoạch → 404; huỷ → 409; không crm.import → 403;
//   - > 500 dòng → 202 job_accepted (`data_job` kind transfer.commit) → runner ghi hết, số đếm khớp.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import {
  AuthzResolver,
  TransferDeps,
  allowedAction,
  registerTransferCommitKind,
  runDataJob,
  uuidv7,
  type RunDeps,
} from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const bearer = (token: string) => ({ authorization: `Bearer ${token}` });
const act = (id: string, input: unknown, headers: Record<string, string> = {}) =>
  call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...headers }).then(json);
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));

async function upload(name: string, body: string, token = h.tokenFor(h.user)) {
  const form = new FormData();
  form.set('purpose', 'import');
  form.set('file', new Blob([new Uint8Array(Buffer.from(body))], { type: 'text/csv' }), name);
  const r = await fetch(`${h.base}/v1/files`, {
    method: 'POST',
    headers: { 'x-workspace-id': h.ws, ...bearer(token) },
    body: form,
  });
  expect(r.status).toBe(201);
  return ((await r.json()) as { data: { file_id: string } }).data.file_id;
}

/** Bulk: preview → xác nhận (cùng khoá). */
async function confirmed(id: string, input: unknown) {
  const key = uuidv7();
  const p = await json(await call(h, `/actions/${id}`, { input }, { 'idempotency-key': key }));
  expect(p.status, JSON.stringify(p.body)).toBe(202);
  expect(p.body.data.status).toBe('preview_required');
  return {
    preview: p.body.data.preview,
    res: await json(
      await call(
        h,
        `/actions/${id}`,
        { input, confirm_token: p.body.data.confirm_token },
        { 'idempotency-key': key },
      ),
    ),
  };
}

const TAG = uuidv7().slice(-6);
const phone = (n: number) =>
  `09${TAG.replace(/\D/g, '0').padEnd(6, '0').slice(0, 6)}${String(n).padStart(2, '0')}`;

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({
    registry: new PrismaWorkspaceRegistry(h.platform),
    baseUrl: env.TENANT_DATABASE_URL!,
  });
}, 120_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

describe('nhập khách hàng — kế hoạch, sửa ánh xạ, xác nhận, biên nhận', () => {
  it('plan → lỗi chặn commit → sửa chính sách → commit đúng số, không giành khách', async () => {
    const db = await tenant();
    // Khách của người khác có sẵn (SĐT dòng 4) — chỉ đếm, không lộ.
    const other = await h.member('sales');
    await act('contact.create', { full_name: 'Khách người khác', phone: phone(4) }, bearer(other.token));
    const csv = [
      'Họ tên,Số điện thoại,Email,Tỉnh/Thành phố',
      `Nguyễn An,${phone(1)},AN.${TAG}@VD.VN,Hà Nội`,
      `Trần Bình,${phone(2)},,Huế`,
      `Lê Cúc,${phone(1)},,Đà Nẵng`,
      `Ai Đó,${phone(4)},,`,
      `Thiếu Liên Hệ,,,`,
      `Email Sai,,sai-email,`,
    ].join('\n');
    const fileId = await upload(`khach-${TAG}.csv`, csv);
    const before = await db.contact.count();

    const plan = await act('transfer.plan', { entity: 'contact', file_id: fileId });
    expect(plan.status, JSON.stringify(plan.body)).toBe(200);
    const p = plan.body.data.result;
    expect(p.mapping).toEqual({
      full_name: 'Họ tên',
      phone: 'Số điện thoại',
      email: 'Email',
      city: 'Tỉnh/Thành phố',
    });
    expect(p.counts).toMatchObject({ total: 6, valid: 2, invalid: 2, duplicates: 2 });
    expect(await db.contact.count()).toBe(before);

    const rows = (await json(await call(h, `/data-transfer/plans/${p.id}/rows`))).body;
    const byNo = Object.fromEntries(rows.data.map((r: { row_no: number }) => [r.row_no, r]));
    expect(byNo[1]).toMatchObject({ check: 'valid', data: { phone: phone(1), email: `an.${TAG}@vd.vn` } });
    expect(byNo[3].check).toBe('duplicate');
    expect(byNo[4]).toMatchObject({ check: 'owned', data: { full_name: 'Ai Đó' } });
    expect(JSON.stringify(byNo[4])).not.toContain('Khách người khác');
    expect(byNo[5]).toMatchObject({ check: 'invalid', errors: { contact: 'required' } });
    expect(byNo[6]).toMatchObject({ check: 'invalid', errors: { email: 'invalid' } });

    // all_valid còn lỗi → không commit (không âm thầm bỏ lỗi).
    expect((await act('transfer.commit', { plan_id: p.id, if_version: 1 })).body.error.fields).toEqual({
      rows: 'has_invalid',
    });
    const v2 = await act('transfer.update_mapping', {
      plan_id: p.id,
      if_version: 1,
      row_policy: 'only_valid',
    });
    expect(v2.body.data.result).toMatchObject({ version: 2, row_policy: 'only_valid' });
    expect(
      (await act('transfer.update_mapping', { plan_id: p.id, if_version: 1, row_policy: 'all_valid' }))
        .status,
    ).toBe(409);

    const { preview, res } = await confirmed('transfer.commit', { plan_id: p.id, if_version: 2 });
    expect(preview.count).toBe(2);
    expect(preview.warnings).toContain('skipped:4');
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    const done = (await json(await call(h, `/data-transfer/plans/${p.id}`))).body.data;
    expect(done).toMatchObject({ status: 'completed', counts: { applied: 2, skipped: 4, failed: 0 } });
    expect(await db.contact.count()).toBe(before + 2);
    const an = await db.contact.findFirstOrThrow({ where: { phoneNorm: phone(1) } });
    expect(an).toMatchObject({ name: 'Nguyễn An', ownerUserId: h.user });
    expect((await db.contact.findFirstOrThrow({ where: { phoneNorm: phone(4) } })).ownerUserId).toBe(
      other.id,
    );
    const applied = (await json(await call(h, `/data-transfer/plans/${p.id}/rows?check=valid`))).body.data;
    expect(
      applied.map((r: { status: string; result_id: string | null }) => [r.status, !!r.result_id]),
    ).toEqual([
      ['applied', true],
      ['applied', true],
    ]);

    // Chạy lại sau khi xong → 409, không ghi thêm; người khác → 404.
    expect((await act('transfer.commit', { plan_id: p.id, if_version: 2 })).status).toBe(409);
    expect(await db.contact.count()).toBe(before + 2);
    expect(
      (await json(await call(h, `/data-transfer/plans/${p.id}`, undefined, bearer(other.token)))).status,
    ).toBe(404);
    expect((await act('transfer.cancel', { plan_id: p.id }, bearer(other.token))).status).toBe(404);
  }, 60_000);

  it('thực thể chưa nối / ánh xạ sai cột → 422; không có crm.import → 403; huỷ → không commit', async () => {
    const fileId = await upload(`q-${TAG}.csv`, 'Tên,SĐT\nA,0901234567\n');
    expect((await act('transfer.plan', { entity: 'quote', file_id: fileId })).body.error.fields).toEqual({
      entity: 'unsupported',
    });
    expect(
      (await act('transfer.plan', { entity: 'contact', file_id: fileId, mapping: { full_name: 'Không có' } }))
        .body.error.fields,
    ).toEqual({ 'mapping.full_name': 'column_not_found' });
    expect(
      (await act('transfer.plan', { entity: 'contact', file_id: fileId, mapping: { password: 'Tên' } })).body
        .error.fields,
    ).toEqual({ 'mapping.password': 'unknown_field' });
    const sales = await h.member('sales');
    const denied = await act(
      'transfer.plan',
      { entity: 'contact', file_id: await upload(`s-${TAG}.csv`, 'Tên,SĐT\nA,0901234567\n', sales.token) },
      bearer(sales.token),
    );
    expect(denied.status, JSON.stringify(denied.body)).toBe(403);
    expect(
      (
        await json(await call(h, '/data-transfer/capabilities', undefined, bearer(sales.token)))
      ).body.data.find((c: { entity: string }) => c.entity === 'contact').import,
    ).toMatchObject({ supported: false, reason: 'forbidden' });
    // Huỷ → không commit được nữa.
    const p = (await act('transfer.plan', { entity: 'contact', file_id: fileId })).body.data.result;
    expect((await act('transfer.cancel', { plan_id: p.id })).body.data.result.status).toBe('cancelled');
    expect((await act('transfer.commit', { plan_id: p.id, if_version: 1 })).status).toBe(409);
    const caps = (await json(await call(h, '/data-transfer/capabilities'))).body.data;
    expect(caps.find((c: { entity: string }) => c.entity === 'contact').import.supported).toBe(true);
    expect(caps.find((c: { entity: string }) => c.entity === 'quote').import).toMatchObject({
      supported: false,
      reason: 'not_available',
    });
  });

  it('> 500 dòng → 202 job_accepted; runner ghi hết qua contact.import theo lô', async () => {
    const csv = [
      'Tên,SĐT',
      ...Array.from(
        { length: 520 },
        (_, i) =>
          `Khách ${i},08${TAG.replace(/\D/g, '1').padEnd(4, '1').slice(0, 4)}${String(i).padStart(4, '0')}`,
      ),
    ].join('\n');
    const p = (
      await act('transfer.plan', { entity: 'contact', file_id: await upload(`lon-${TAG}.csv`, csv) })
    ).body.data.result;
    expect(p.counts.valid).toBe(520);
    const { res } = await confirmed('transfer.commit', { plan_id: p.id, if_version: 1 });
    expect(res.status).toBe(202);
    expect(res.body.data.status).toBe('job_accepted');
    const authz = h.app.get(AuthzResolver, { strict: false });
    registerTransferCommitKind(h.app.get(TransferDeps, { strict: false }));
    const deps: RunDeps = {
      authzOf: async (ws, userId) => {
        const m = userId
          ? await h.platform.membership.findFirst({
              where: { workspaceId: ws, userId, status: 'active' },
              select: { roleKey: true, delegations: true },
            })
          : null;
        return m ? authz.resolve(ws, userId!, m) : null;
      },
      allowed: allowedAction,
      now: () => h.clock.now(),
      owner: 'test-worker',
    };
    expect(await runDataJob(await tenant(), h.ws, res.body.data.job_id, deps)).toBe('completed');
    const done = (await json(await call(h, `/data-transfer/plans/${p.id}`))).body.data;
    expect(done).toMatchObject({ status: 'completed', counts: { applied: 520, failed: 0 } });
    // Trang dòng theo kết quả kiểm: Index Scan trên transfer_row_plan_row_idx (EXPLAIN ghi ở completion report).
    const db = await tenant();
    await db.$executeRawUnsafe('ANALYZE transfer_row');
    const plan = (
      await db.$queryRawUnsafe<{ 'QUERY PLAN': string }[]>(
        `EXPLAIN SELECT * FROM transfer_row WHERE plan_id = '${p.id}' AND "check" = 'valid' AND row_no > 0 ORDER BY row_no LIMIT 51`,
      )
    )
      .map((r) => r['QUERY PLAN'])
      .join('\n');
    expect(plan).toContain('transfer_row_plan_row_idx');
  }, 120_000);
});
