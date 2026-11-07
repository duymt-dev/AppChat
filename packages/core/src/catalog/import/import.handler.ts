// product.import · import_cancel · import_retry (TIP-032b, Blueprint §3.4 `product.import` write + bulk → preview). Tệp: guard tệp tải lên
// (chính người tải, purpose import / attachment, CSV / XLSX, ≤ 25MB) + hash ghi vào lần nhập. Preview = kiểm toàn tệp (số dòng hợp lệ /
// lỗi + mẫu lỗi đầu) trước khi xác nhận. Xác nhận: ghi `product_import` (+ action_log) trong transaction executor; ≤ 500 dòng → chạy
// ngay sau commit (afterCommit, từng dòng có biên nhận) và trả 200 với số đã đếm; > 500 dòng → outbox `product.import_requested` cùng
// transaction → 202 `job_accepted` (`/v1/product-imports/:id`). Cancel: CAS queued / running → cancelling (dòng đã ghi giữ nguyên). Retry:
// failed / cancelled → queued + event mới; chỉ dòng chưa có biên nhận chạy lại, kiểm lại quyền ở worker.
import { Inject, Injectable } from '@nestjs/common';
import { TenantContexts } from '@appchat/db';
import { AppError } from '@appchat/shared';
import type { ActionInput, productImport, productImportCancel, productImportRetry } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { jobAccepted } from '../../kernel/actions/job-accepted';
import { line, preview } from '../../kernel/actions/preview-kit';
import { checkFile, type FileAccessRule } from '../../kernel/files/file-access';
import { uuidv7 } from '../../kernel/ids';
import { actorUserId } from '../../crm/public';
import { IMPORT_SYNC_ROWS, type Mapping } from './parse';
import { prepareRows } from './processor';
import { isRowError } from './validate';
import { ImportDeps } from './status';

type In = ActionInput<typeof productImport>;
type Out = { import_id: string; status: string; total: number; created: number; updated: number; failed: number };

export const IMPORT_FILE_RULE: FileAccessRule = {
  purposes: ['import', 'attachment'],
  mimes: ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/octet-stream', 'text/plain'],
};
export const statusUrl = (id: string) => `/v1/product-imports/${id}`;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
@ActionHandler('product.import')
export class ProductImportHandler implements Handler<In, Out> {
  constructor(
    @Inject(ImportDeps) private readonly d: ImportDeps,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** Đọc + kiểm tệp ngoài transaction (exceljs chậm): metadata + số dòng; lỗi tệp → 422 trước khi ghi gì. */
  private async load(ctx: ActionContext, input: In) {
    const db = await this.d.tenants().get(TenantContexts.system(ctx.workspaceId, 'product.import'));
    const g = await checkFile(db, actorUserId(ctx) ?? '', input.file_id, IMPORT_FILE_RULE, this.clock.now());
    if ('denied' in g) throw new AppError('VALIDATION_FAILED', 422, { file_id: g.denied });
    const f = await this.d.files().read(db, g.id);
    if (!f) throw new AppError('VALIDATION_FAILED', 422, { file_id: 'not_found' });
    const rows = await prepareRows({ name: f.row.name, mime: f.row.mime, body: f.body }, input.mapping as Mapping);
    return { file: f.row, rows };
  }

  async prepare(ctx: ActionContext, input: In) {
    return this.load(ctx, input);
  }

  async execute(ctx: ActionContext, input: In, tx: TenantTx, _ptx?: unknown, prepared?: unknown): Promise<HandlerOutcome<Out>> {
    const p = prepared as Awaited<ReturnType<ProductImportHandler['load']>>;
    const now = this.clock.now();
    const id = uuidv7(now.getTime());
    const big = p.rows.length > IMPORT_SYNC_ROWS;
    const actor = actorUserId(ctx);
    await tx.productImport.create({
      data: { id, fileId: p.file.id, fileSha256: p.file.sha256, fileName: p.file.name, mapping: input.mapping as object, actorId: actor && UUID.test(actor) ? actor : null, status: 'queued', total: p.rows.length, nextAttemptAt: big ? now : null, createdAt: now, updatedAt: now },
    });
    await tx.file.updateMany({ where: { id: p.file.id }, data: { confirmed: true } });
    const result: Out = { import_id: id, status: 'queued', total: p.rows.length, created: 0, updated: 0, failed: 0 };
    if (big) return { result, after: { id }, events: [{ topic: 'product.import_requested', payload: { import_id: id } }], ...jobAccepted(id, statusUrl(id)) };
    // ≤ 500 dòng: chạy ngay sau commit — kết quả cuối đọc lại ở `/v1/product-imports/:id` (cùng runner với việc nền, cùng biên nhận).
    return { result, after: { id }, afterCommit: () => this.d.runNow(ctx.workspaceId, id) };
  }

  async preview(ctx: ActionContext, input: In) {
    const p = await this.load(ctx, input);
    const bad = p.rows.filter(isRowError);
    return preview('write', line(p.file.name, `${p.rows.length}`), {
      count: p.rows.length,
      changes: [{ entity: 'product_import', after: { file: p.file.name, rows: p.rows.length, valid: p.rows.length - bad.length, invalid: bad.length, mode: p.rows.length > IMPORT_SYNC_ROWS ? 'job' : 'sync' } }],
      ...(bad.length ? { warnings: bad.slice(0, 5).map((r) => `row:${r.rowNo}:${r.error}`) } : {}),
    });
  }
}

async function lockImport(tx: TenantTx, ctx: ActionContext, id: string) {
  const rows = UUID.test(id) ? await tx.$queryRaw<{ id: string }[]>`SELECT id FROM product_import WHERE id = ${id}::uuid FOR UPDATE` : [];
  const imp = rows[0] ? await tx.productImport.findUnique({ where: { id } }) : null;
  // Lần nhập của người khác: chỉ Owner thấy (không lộ là có).
  if (!imp || (!ctx.authz.isOwner && imp.actorId !== actorUserId(ctx))) throw new AppError('NOT_FOUND', 404, { import_id: 'not_found' });
  return imp;
}

@Injectable()
@ActionHandler('product.import_cancel')
export class ProductImportCancelHandler implements Handler<ActionInput<typeof productImportCancel>, { import_id: string; status: string }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof productImportCancel>, tx: TenantTx): Promise<HandlerOutcome<{ import_id: string; status: string }>> {
    const imp = await lockImport(tx, ctx, input.import_id);
    if (imp.status === 'cancelling' || imp.status === 'cancelled') return { result: { import_id: imp.id, status: imp.status } };
    if (imp.status !== 'queued' && imp.status !== 'running') throw new AppError('INVALID_STATE', 409, { status: imp.status });
    await tx.productImport.update({ where: { id: imp.id }, data: { status: 'cancelling', updatedAt: this.clock.now() } });
    return { result: { import_id: imp.id, status: 'cancelling' }, before: { id: imp.id, status: imp.status }, events: [{ topic: 'product.import_requested', payload: { import_id: imp.id } }] };
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof productImportCancel>, tx: TenantTx) {
    const imp = await lockImport(tx, ctx, input.import_id);
    const written = await tx.productImportRow.count({ where: { importId: imp.id, status: { in: ['created', 'updated'] } } });
    return preview('write', line(imp.fileName, imp.status), { changes: [{ entity: 'product_import', id: imp.id, before: { status: imp.status }, after: { status: 'cancelling' } }], ...(written ? { warnings: [`committed:${written}`] } : {}) });
  }
}

@Injectable()
@ActionHandler('product.import_retry')
export class ProductImportRetryHandler implements Handler<ActionInput<typeof productImportRetry>, { import_id: string; status: string }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof productImportRetry>, tx: TenantTx): Promise<HandlerOutcome<{ import_id: string; status: string }>> {
    const imp = await lockImport(tx, ctx, input.import_id);
    if (imp.status !== 'failed' && imp.status !== 'cancelled') throw new AppError('INVALID_STATE', 409, { status: imp.status });
    const now = this.clock.now();
    await tx.productImport.update({ where: { id: imp.id }, data: { status: 'queued', error: null, finishedAt: null, nextAttemptAt: now, updatedAt: now } });
    return {
      result: { import_id: imp.id, status: 'queued' },
      before: { id: imp.id, status: imp.status },
      events: [{ topic: 'product.import_requested', payload: { import_id: imp.id } }],
      ...jobAccepted(imp.id, statusUrl(imp.id)),
    };
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof productImportRetry>, tx: TenantTx) {
    const imp = await lockImport(tx, ctx, input.import_id);
    const done = await tx.productImportRow.count({ where: { importId: imp.id } });
    return preview('write', line(imp.fileName, imp.status), { changes: [{ entity: 'product_import', id: imp.id, before: { status: imp.status }, after: { status: 'queued', remaining: Math.max(0, imp.total - done) } }] });
  }
}
