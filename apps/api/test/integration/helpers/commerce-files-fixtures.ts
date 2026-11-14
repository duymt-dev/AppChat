// Dựng dữ liệu cho ma trận tệp đính kèm đơn / đề nghị (TIP-032d): bundle validator thật (build api một lần), đơn + đề nghị qua executor,
// tải tệp `record_attachment` kèm đích qua `POST /v1/files` (cùng đường UI). Không có action tạo staging — tải lên là bước HTTP riêng.
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { setValidatorEntry } from '@appchat/core';
import { pdf } from '../../../../../fixtures/contracts/files/build-fixtures';
import type { Matrix, Who } from './action-matrix';

const API = join(import.meta.dirname, '..', '..', '..');

/** Build bundle validator (dist/attachment-validator.cjs) rồi trỏ bộ kiểm cô lập tới đó. */
export function useBuiltValidator(): void {
  execFileSync(process.execPath, [join(API, 'node_modules', 'tsup', 'dist', 'cli-default.js'), '--silent'], { cwd: API, stdio: 'ignore' });
  setValidatorEntry(join(API, 'dist', 'attachment-validator.cjs'));
}

export async function uploadFor(m: Matrix, parentType: 'order' | 'invoice', parentId: string, who?: Who, name = 'bien-ban.pdf'): Promise<string> {
  const form = new FormData();
  form.set('purpose', 'record_attachment');
  form.set('parent_type', parentType);
  form.set('parent_id', parentId);
  form.set('file', new Blob([new Uint8Array(pdf({ text: name }))], { type: 'application/pdf' }), name);
  const r = await fetch(`${m.h.base}/v1/files`, { method: 'POST', headers: { 'x-workspace-id': m.h.ws, authorization: `Bearer ${who?.token ?? m.h.tokenFor(m.h.user)}` }, body: form });
  if (r.status !== 201) throw new Error(`upload ${r.status} ${await r.text()}`);
  return ((await r.json()) as { data: { file_id: string } }).data.file_id;
}

/** Đơn + đề nghị của Owner; đơn giao cho sales (assigned) + đề nghị sales phụ trách (owner) — scope own thấy được. */
export async function seedParents(m: Matrix, phone: string) {
  const lan = (await m.seed('contact.create', { full_name: `Chị Lan ${phone.slice(-3)}`, phone })).contact_id;
  const item = { name: 'Gói tệp', qty: 1, unit_price: '500000', tax_rate: 0 };
  const order = await m.seed('order.create', { contact_id: lan, items: [item] });
  const salesOrder = await m.seed('order.create', { contact_id: lan, items: [item] });
  const db = await m.db();
  await db.order.update({ where: { id: salesOrder.order_id }, data: { assignedUserId: m.sales.id } });
  const invoice = await m.seed('invoice.create', { order_id: order.order_id, contact_id: lan, kind: 'full', amount: '500000' });
  const salesInvoice = await m.seed('invoice.create', { order_id: salesOrder.order_id, contact_id: lan, kind: 'full', amount: '500000' });
  await db.invoice.update({ where: { id: salesInvoice.invoice_id }, data: { ownerUserId: m.sales.id } });
  return { lan, order, salesOrder, invoice, salesInvoice };
}

export const handle = (fileId: string) => ({ kind: 'target_upload_handle', file_id: fileId });
