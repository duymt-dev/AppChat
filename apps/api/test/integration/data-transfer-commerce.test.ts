// TIP-038b P2 (DC-374) — nhập chứng từ nháp + sản phẩm qua kế hoạch dùng chung, Postgres 16 + Memurai thật:
//   - báo giá nhiều dòng theo khoá nhóm → MỘT quote nháp mỗi nhóm (đủ dòng hàng, SKU → product_id, lệch giá danh mục chỉ cảnh báo); nhóm
//     có một dòng lỗi → cả nhóm lỗi (không nửa báo giá); khách tra theo SĐT trong phạm vi ghi, không thấy → `contact: not_found`;
//   - đơn nháp (status new, không trừ kho), hợp đồng nháp (enum tiếng Việt "Dịch vụ" → service), đề nghị thanh toán theo mã đơn;
//   - nhập lại cùng tệp → dòng đã ghi thành `duplicate` (không tạo nháp lần hai);
//   - sản phẩm qua `product.import` (bộ kiểm 032b): dòng lỗi chặn commit, SKU có sẵn cảnh báo cập nhật; tồn kho không đổi.
import 'reflect-metadata';
import ExcelJS from 'exceljs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver, type TenantDb } from '@appchat/db';
import { uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let db: TenantDb;

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const act = (id: string, input: unknown) =>
  call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7() }).then(json);

async function upload(name: string, body: string) {
  const form = new FormData();
  form.set('purpose', 'import');
  form.set('file', new Blob([new Uint8Array(Buffer.from(body))], { type: 'text/csv' }), name);
  const r = await fetch(`${h.base}/v1/files`, {
    method: 'POST',
    headers: { 'x-workspace-id': h.ws, authorization: `Bearer ${h.tokenFor(h.user)}` },
    body: form,
  });
  expect(r.status).toBe(201);
  return ((await r.json()) as { data: { file_id: string } }).data.file_id;
}

async function commit(planId: string, version = 1) {
  const key = uuidv7();
  const input = { plan_id: planId, if_version: version };
  const p = await json(await call(h, '/actions/transfer.commit', { input }, { 'idempotency-key': key }));
  expect(p.status, JSON.stringify(p.body)).toBe(202);
  const res = await json(
    await call(
      h,
      '/actions/transfer.commit',
      { input, confirm_token: p.body.data.confirm_token },
      { 'idempotency-key': key },
    ),
  );
  expect(res.status, JSON.stringify(res.body)).toBe(200);
  return {
    preview: p.body.data.preview,
    plan: (await json(await call(h, `/data-transfer/plans/${planId}`))).body.data,
  };
}

const rowsOf = async (planId: string) =>
  (await json(await call(h, `/data-transfer/plans/${planId}/rows`))).body.data as {
    row_no: number;
    check: string;
    errors: Record<string, string>;
    status: string;
    result_id: string | null;
  }[];

const TAG = uuidv7().slice(-6).replace(/\D/g, '7').padEnd(6, '7');
const PHONE = `0912${TAG}`;
const SKU = `SP-${TAG}`;

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({
    registry: new PrismaWorkspaceRegistry(h.platform),
    baseUrl: env.TENANT_DATABASE_URL!,
  });
  db = await resolver.get(TenantContexts.system(h.ws, 't'));
  expect((await act('contact.create', { full_name: `Khách ${TAG}`, phone: PHONE })).status).toBe(200);
  expect(
    (
      await act('product.create', {
        name: `Serum ${TAG}`,
        sku: SKU,
        price: '500000',
        type: 'physical',
        tax_rate: 8,
      })
    ).status,
  ).toBe(200);
}, 120_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

describe('nhập chứng từ nháp theo khoá nhóm', () => {
  it('báo giá: nhóm → một quote đủ dòng; nhóm có dòng lỗi bị chặn cả nhóm; nhập lại → trùng', async () => {
    const csv = [
      'Mã báo giá,SĐT khách,Tên hàng,Mã hàng,Số lượng,Đơn giá,Thuế suất,Ghi chú',
      `BG1,${PHONE},Serum,${SKU},2,550.000,8%,Giao trước Tết`,
      `BG1,,Tư vấn da,,1,300000,10,`,
      `BG2,${PHONE},Kem,,1,abc,8,`,
      `BG2,,Mặt nạ,,3,90000,8,`,
      `BG3,0999000111,Gói lẻ,,1,100000,0,`,
    ].join('\n');
    const fileId = await upload(`bg-${TAG}.csv`, csv);
    const plan = await act('transfer.plan', { entity: 'quote', file_id: fileId });
    expect(plan.status, JSON.stringify(plan.body)).toBe(200);
    const p = plan.body.data.result;
    expect(p.mapping).toMatchObject({
      group: 'Mã báo giá',
      contact_phone: 'SĐT khách',
      item_name: 'Tên hàng',
      item_sku: 'Mã hàng',
      qty: 'Số lượng',
      unit_price: 'Đơn giá',
      tax_rate: 'Thuế suất',
      note: 'Ghi chú',
    });
    expect(p.counts).toMatchObject({ total: 5, valid: 2, invalid: 3 });
    const rows = await rowsOf(p.id);
    expect(rows[0]!.errors).toEqual({ unit_price_warning: 'catalog_diff' });
    expect(rows[2]!.errors).toEqual({ unit_price: 'invalid' });
    expect(rows[3]!.errors).toEqual({ group: 'has_invalid_row' });
    expect(rows[4]!.errors).toEqual({ contact: 'not_found' });

    await act('transfer.update_mapping', { plan_id: p.id, if_version: 1, row_policy: 'only_valid' });
    const before = await db.quote.count();
    const { preview, plan: done } = await commit(p.id, 2);
    expect(preview.count).toBe(1);
    expect(preview.warnings).toContain('unit_price_warning:1');
    expect(done).toMatchObject({ status: 'completed', counts: { applied: 2, skipped: 3, failed: 0 } });
    expect(await db.quote.count()).toBe(before + 1);
    const q = await db.quote.findFirstOrThrow({
      where: { id: (await rowsOf(p.id))[0]!.result_id! },
      include: { items: { orderBy: { sort: 'asc' } } },
    });
    expect(q.status).toBe('draft');
    expect(q.note).toBe('Giao trước Tết');
    expect(
      q.items.map((i) => [i.name, Number(i.qty), String(i.unitPrice), i.taxRate, !!i.productId]),
    ).toEqual([
      ['Serum', 2, '550000', 8, true],
      ['Tư vấn da', 1, '300000', 10, false],
    ]);

    // Nhập lại cùng tệp: nhóm đã ghi → trùng, không tạo báo giá lần hai.
    const again = (await act('transfer.plan', { entity: 'quote', file_id: fileId })).body.data.result;
    expect(again.counts).toMatchObject({ valid: 0, duplicates: 2 });
    expect((await act('transfer.commit', { plan_id: again.id, if_version: 1 })).body.error.fields).toEqual({
      rows: 'none_valid',
    });
  }, 60_000);

  it('đơn nháp không trừ kho; hợp đồng enum tiếng Việt; đề nghị thanh toán theo mã đơn', async () => {
    const stock = (await db.product.findFirstOrThrow({ where: { code: SKU } })).stock;
    const o = (
      await act('transfer.plan', {
        entity: 'order',
        file_id: await upload(
          `don-${TAG}.csv`,
          `Mã đơn,SĐT,Tên hàng,Mã hàng,SL,Đơn giá,Thuế\nD1,${PHONE},Serum,${SKU},3,500000,8\n`,
        ),
      })
    ).body.data.result;
    expect(o.counts.valid).toBe(1);
    const od = await commit(o.id);
    expect(od.plan.counts.applied).toBe(1);
    const order = await db.order.findFirstOrThrow({ where: { id: (await rowsOf(o.id))[0]!.result_id! } });
    expect(order.status).toBe('new');
    expect((await db.product.findFirstOrThrow({ where: { code: SKU } })).stock).toBe(stock);

    const c = (
      await act('transfer.plan', {
        entity: 'contract',
        file_id: await upload(
          `hd-${TAG}.csv`,
          `SĐT khách,Loại hợp đồng,Tên hợp đồng,Giá trị,Ngày bắt đầu\n${PHONE},Dịch vụ,Liệu trình ${TAG},12.800.000,16/06/2026\n${PHONE},Khác,Sai loại,1000,\n`,
        ),
      })
    ).body.data.result;
    expect(c.counts).toMatchObject({ valid: 1, invalid: 1 });
    expect((await rowsOf(c.id))[1]!.errors).toEqual({ kind: 'option' });
    await act('transfer.update_mapping', { plan_id: c.id, if_version: 1, row_policy: 'only_valid' });
    await commit(c.id, 2);
    const contract = await db.contract.findFirstOrThrow({
      where: { id: (await rowsOf(c.id))[0]!.result_id! },
    });
    expect(contract).toMatchObject({ kind: 'service', status: 'draft', title: `Liệu trình ${TAG}` });
    expect(String(contract.value)).toBe('12800000');

    const inv = (
      await act('transfer.plan', {
        entity: 'invoice',
        file_id: await upload(
          `tt-${TAG}.csv`,
          `Mã đơn,SĐT khách,Loại,Số tiền\n${order.code},${PHONE},Đặt cọc,500000\nKHONG-CO,${PHONE},full,100000\n`,
        ),
      })
    ).body.data.result;
    expect(inv.counts).toMatchObject({ valid: 1, invalid: 1 });
    expect((await rowsOf(inv.id))[1]!.errors).toEqual({ order_code: 'not_found' });
    await act('transfer.update_mapping', { plan_id: inv.id, if_version: 1, row_policy: 'only_valid' });
    await commit(inv.id, 2);
    const invoice = await db.invoice.findFirstOrThrow({
      where: { id: (await rowsOf(inv.id))[0]!.result_id! },
    });
    expect(invoice).toMatchObject({ orderId: order.id, kind: 'deposit', status: 'draft' });
    expect(await db.customerPayment.count({ where: { invoiceId: invoice.id } })).toBe(0);
  }, 60_000);
});

describe('nhập sản phẩm qua product.import', () => {
  it('dòng lỗi chặn commit; SKU có sẵn cảnh báo cập nhật; tồn kho giữ nguyên', async () => {
    const bad = (
      await act('transfer.plan', {
        entity: 'product',
        file_id: await upload(`sp-bad-${TAG}.csv`, `Tên,Giá,Mã\nA,abc,X1-${TAG}\n`),
      })
    ).body.data.result;
    expect((await rowsOf(bad.id))[0]!.errors).toEqual({ price: 'invalid' });
    await act('transfer.update_mapping', { plan_id: bad.id, if_version: 1, row_policy: 'only_valid' });
    expect((await act('transfer.commit', { plan_id: bad.id, if_version: 2 })).body.error.fields).toEqual({
      rows: 'none_valid',
    });

    const stock = (await db.product.findFirstOrThrow({ where: { code: SKU } })).stock;
    const p = (
      await act('transfer.plan', {
        entity: 'product',
        file_id: await upload(
          `sp-${TAG}.csv`,
          `Tên sản phẩm,Giá bán,Mã SP,Đơn vị tính\nSerum mới ${TAG},520.000,${SKU},Chai\nToner ${TAG},180000,TN-${TAG},Chai\n`,
        ),
      })
    ).body.data.result;
    expect(p.mapping).toMatchObject({
      name: 'Tên sản phẩm',
      price: 'Giá bán',
      sku: 'Mã SP',
      unit: 'Đơn vị tính',
    });
    expect((await rowsOf(p.id))[0]!.errors).toEqual({ sku_warning: 'updates_existing' });
    const { preview, plan } = await commit(p.id);
    expect(preview.warnings).toContain('sku_warning:1');
    expect(plan).toMatchObject({ status: 'completed', counts: { applied: 2, failed: 0 } });
    const updated = await db.product.findFirstOrThrow({ where: { code: SKU } });
    expect(updated).toMatchObject({ name: `Serum mới ${TAG}`, stock });
    expect(String(updated.price)).toBe('520000');
    expect(await db.product.count({ where: { code: `TN-${TAG}` } })).toBe(1);
  }, 60_000);
});

/** Tệp XLSX tải qua data-jobs: dòng tiêu đề + dữ liệu (dòng 1 là chú thích múi giờ); không ô công thức. */
async function sheet(url: string, token = h.tokenFor(h.user)) {
  const res = await fetch(`${h.base}${url}`, {
    headers: { 'x-workspace-id': h.ws, authorization: `Bearer ${token}` },
  });
  expect(res.status).toBe(200);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load((await res.arrayBuffer()) as ArrayBuffer);
  const ws = wb.worksheets[0]!;
  const rows: unknown[][] = [];
  ws.eachRow((r, n) => {
    if (n > 2) rows.push((r.values as unknown[]).slice(1));
    r.eachCell((c) => expect(c.formula).toBeUndefined());
  });
  return { name: ws.name, head: (ws.getRow(2).values as unknown[]).slice(1), rows };
}

async function exportAs(id: string, input: unknown, token = h.tokenFor(h.user)) {
  const r = await json(
    await call(
      h,
      `/actions/${id}`,
      { input },
      { 'idempotency-key': uuidv7(), authorization: `Bearer ${token}` },
    ),
  );
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return { count: r.body.data.result.rows as number, result: r.body.data.result };
}

describe('xuất sản phẩm / đề nghị thanh toán (khung xuất 038)', () => {
  it('product.export: giá vốn chỉ khi có catalog.cost_view; SKU lọc đúng; tiền chuỗi đủ chữ số', async () => {
    const own = await exportAs('product.export', { q: TAG });
    expect(own.count).toBeGreaterThanOrEqual(2);
    const f = await sheet(own.result.download_url);
    expect(f.name).toBe('Sản phẩm');
    const costCol = f.head.indexOf('Giá vốn (VND)');
    const priceCol = f.head.indexOf('Giá bán (VND)');
    const row = f.rows.find((r) => r[0] === SKU)!;
    expect(row[priceCol]).toBe('520000');
    const sales = await h.member('sales');
    await db.product.updateMany({ where: { code: SKU }, data: { cost: 300000n } });
    expect(
      (await sheet((await exportAs('product.export', { q: TAG })).result.download_url)).rows.find(
        (r) => r[0] === SKU,
      )![costCol],
    ).toBe('300000');
    const salesFile = await sheet(
      (await exportAs('product.export', { q: TAG }, sales.token)).result.download_url,
      sales.token,
    );
    expect(salesFile.rows.find((r) => r[0] === SKU)![costCol]).toBeUndefined();
  });

  it('invoice.export: theo scope sales; kế toán xuất được cùng tập; CSKH không có invoice.manage → 403', async () => {
    const r = await exportAs('invoice.export', { q: '' });
    const f = await sheet(r.result.download_url);
    expect(f.name).toBe('Đề nghị thanh toán');
    expect(f.rows.some((x) => x[4] === 'Đặt cọc' && x[6] === '500000')).toBe(true);
    const acc = await h.member('accountant');
    expect((await exportAs('invoice.export', {}, acc.token)).count).toBe(r.count);
    const support = await h.member('cs');
    expect(
      (
        await json(
          await call(
            h,
            '/actions/invoice.export',
            { input: {} },
            { 'idempotency-key': uuidv7(), authorization: `Bearer ${support.token}` },
          ),
        )
      ).status,
    ).toBe(403);
  });
});
