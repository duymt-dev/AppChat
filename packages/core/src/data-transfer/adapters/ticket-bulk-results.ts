// Tập 038b `ticket_bulk_results` CHỈ XUẤT (TIP-034c §4.4): dòng tệp kết quả của MỘT thao tác sửa ticket hàng loạt — id người gọi đã gửi,
// kết quả (ok / failed / pending), mã lỗi an toàn, đã đổi, trạng thái hoàn tác. Không tiêu đề / nội dung / người phụ trách / ảnh chụp trước.
// Chiếu theo quyền HIỆN TẠI lúc dựng tệp: ticket nay ngoài phạm vi support của người xuất (hoặc khách đang bị quên — 015c) chỉ còn id + NOT_FOUND
// (không lộ đã đổi / hoàn tác). Ô chữ chống công thức (CSV thêm `'`, XLSX gán chuỗi) qua cùng bộ dựng tệp danh sách (038). Nhập tệp kết quả
// KHÔNG được hỗ trợ (registry `direction: 'export'` → 422 trước khi đọc tệp) — không phải cửa sau sửa ticket.
import { createHash } from 'node:crypto';
import { Inject, Injectable, Optional } from '@nestjs/common';
import type { PlatformDb, TenantDb } from '@appchat/db';
import { AppError, serverMessages, type AuthzContext, type ListExportResult, type TicketBulkOutcome } from '@appchat/shared';
import type { ActionInput, ticketBulkExport } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { line, preview } from '../../kernel/actions/preview-kit';
import { CLOCK, type Clock } from '../../kernel/clock';
import { STORAGE, type Storage } from '../../kernel/files/storage';
import { allowedAction, registerExportStamp } from '../../kernel/jobs/bulk-status';
import { dataJobUrl } from '../../kernel/jobs/data-jobs/handlers';
import { createJob } from '../../kernel/jobs/data-jobs/store';
import { PLATFORM_DB } from '../../kernel/tenant/tenant.providers';
import { csvFile } from '../../insights/exports/export-csv';
import { workbook } from '../../insights/exports/export-columns';
import type { Cell, ExportColumn } from '../../insights/exports/types';
import { UUID } from '../../support/ticket-access';
import { bulkResultOf, visibleTicketIds } from '../../support/bulk/results';

export const BULK_RESULT_COLUMNS = ['ticket_id', 'outcome', 'error_code', 'changed', 'undo_state'] as const;
export type BulkResultColumn = (typeof BULK_RESULT_COLUMNS)[number];

/** Dòng an toàn: id + kết quả + mã + đã đổi + hoàn tác (đã chiếu theo quyền hiện tại). */
export type BulkResultRow = [id: string, outcome: 'ok' | 'failed' | 'pending', code: string, changed: '' | 'yes' | 'no', undo: string];

/** Chiếu kết quả từng id (từ biên nhận) theo phạm vi support HIỆN TẠI — một truy vấn ticket + một truy vấn rào riêng tư, không N+1. */
export async function projectBulkRows(tx: TenantTx, authz: AuthzContext, outcomes: readonly TicketBulkOutcome[], undo: ReadonlyMap<string, string>): Promise<BulkResultRow[]> {
  const seen = await visibleTicketIds(tx, authz, outcomes.map((o) => o.id));
  return outcomes.map((o): BulkResultRow => {
    // Ngoài phạm vi hiện tại → chỉ id người gọi đã gửi + NOT_FOUND (không suy ra tồn tại / đã đổi / hoàn tác).
    if (!seen.has(o.id)) return [o.id, 'failed', 'NOT_FOUND', '', ''];
    if (o.pending) return [o.id, 'pending', '', '', ''];
    if (!o.ok) return [o.id, 'failed', o.error?.code ?? 'INTERNAL', '', ''];
    return [o.id, 'ok', '', o.changed ? 'yes' : 'no', o.changed ? (undo.get(o.id) ?? 'eligible') : ''];
  });
}

async function* once(rows: Cell[][]): AsyncIterable<Cell[][]> {
  yield rows;
}

/** Bytes tệp (CSV UTF-8 BOM / XLSX một sheet): dòng chú thích + tiêu đề cột + đúng số dòng đã chiếu. */
export async function bulkResultsFile(format: 'csv' | 'xlsx', labels: { sheet: string; note: string; cols: Record<BulkResultColumn, string> }, rows: readonly BulkResultRow[]): Promise<Buffer> {
  const cols: ExportColumn[] = BULK_RESULT_COLUMNS.map((k) => ({ key: k, header: labels.cols[k], width: k === 'ticket_id' ? 40 : 16 }));
  const data = once(rows.map((r) => [...r]));
  return format === 'csv' ? csvFile(labels.note, cols, data) : workbook(labels.sheet, labels.note, cols, data);
}

type In = ActionInput<typeof ticketBulkExport>;
const KIND = 'ticket.bulk_export';
const TTL_MS = 24 * 60 * 60_000;
type Db = Pick<TenantDb | TenantTx, 'dataJob' | 'dataJobItem' | 'ticket' | '$queryRaw'>;

/** Thao tác đi của log cha — CHỈ người tạo + còn ticket.bulk_update (như hoàn tác); khác → 404 (không lộ tồn tại). */
async function forwardJob(db: Db, actor: string, authz: AuthzContext, logId: string) {
  const job = UUID.test(logId) ? await db.dataJob.findFirst({ where: { actionLogId: logId, kind: 'ticket.bulk_update' }, select: { id: true, status: true, total: true, input: true, actorId: true } }) : null;
  if (!job || job.actorId !== actor || !allowedAction(authz, 'ticket.bulk_update')) throw new AppError('NOT_FOUND', 404, { parent_action_log_id: 'not_found' });
  return job;
}

/** Dòng tệp theo biên nhận + quyền hiện tại (undo_state lấy từ biên nhận thế hệ 0 của thao tác đi). */
async function rowsOf(db: Db, authz: AuthzContext, job: { id: string; status: string; total: number; input: unknown }) {
  const r = await bulkResultOf(db, job);
  const undo = await db.dataJobItem.findMany({ where: { jobId: job.id, generation: 0, changed: true }, select: { targetId: true, undoState: true } });
  return projectBulkRows(db as TenantTx, authz, r.outcomes, new Map(undo.map((u) => [u.targetId, u.undoState ?? 'eligible'])));
}

/** Dấu xuất xứ: đổi người tạo / quyền / phạm vi / hoàn tác → dấu khác → tệp cũ 410 (tải lại phải dựng lại). */
const stampOf = (rows: readonly BulkResultRow[]) => createHash('sha256').update(JSON.stringify(rows)).digest('hex').slice(0, 32);
registerExportStamp(KIND, async (db, a, job) => {
  const i = job.input as { parent_action_log_id?: string };
  try {
    return stampOf(await rowsOf(db, a, await forwardJob(db, a.userId, a, i.parent_action_log_id ?? '')));
  } catch {
    return 'revoked';
  }
});

@Injectable()
@ActionHandler(KIND)
export class TicketBulkExportHandler implements Handler<In, ListExportResult> {
  constructor(
    @Inject(CLOCK) private readonly clock: Clock,
    @Optional() @Inject(STORAGE) private readonly storage?: Storage,
    @Optional() @Inject(PLATFORM_DB) private readonly platform?: PlatformDb,
  ) {}

  private async locale(userId: string): Promise<'vi' | 'en'> {
    const u = this.platform ? await this.platform.user.findUnique({ where: { id: userId }, select: { locale: true } }) : null;
    return u?.locale === 'en' ? 'en' : 'vi';
  }

  async preview(ctx: ActionContext, i: In, tx: TenantTx) {
    const job = await forwardJob(tx, ctx.onBehalfOfUserId ?? ctx.authz.userId, ctx.authz, i.parent_action_log_id);
    return preview('write', line(KIND, job.total, i.format ?? 'xlsx'), { count: job.total });
  }

  async execute(ctx: ActionContext, i: In, tx: TenantTx): Promise<HandlerOutcome<ListExportResult>> {
    const actor = ctx.onBehalfOfUserId ?? (ctx.actor.type === 'user' ? ctx.actor.id : null);
    if (!actor) throw new AppError('FORBIDDEN', 403, { actor: 'user_required' });
    if (!this.storage) throw new AppError('NOT_IMPLEMENTED', 503, { storage: 'unavailable' });
    const now = this.clock.now();
    const rows = await rowsOf(tx, ctx.authz, await forwardJob(tx, actor, ctx.authz, i.parent_action_log_id));
    const format = i.format ?? 'xlsx';
    const m = serverMessages(await this.locale(actor)).support.bulkResults;
    const body = await bulkResultsFile(format, m, rows);
    const id = await createJob(tx, { kind: KIND, actionId: KIND, actorId: actor, actionLogId: null, input: { parent_action_log_id: i.parent_action_log_id, format }, targets: [], fieldPolicy: stampOf(rows), now });
    const fileKey = `${ctx.workspaceId}/exports/${id}.${format}`;
    await this.storage.put(fileKey, body);
    const fileName = `${m.file}-${now.toISOString().slice(0, 10)}.${format}`;
    const expiresAt = new Date(now.getTime() + TTL_MS);
    await tx.dataJob.update({ where: { id }, data: { status: 'completed', total: rows.length, done: rows.length, fileKey, fileName, expiresAt, finishedAt: now, updatedAt: now } });
    return {
      result: { job_id: id, rows: rows.length, file_name: fileName, download_url: `${dataJobUrl(id)}/download`, expires_at: expiresAt.toISOString() },
      after: { job_id: id, total: rows.length },
    };
  }
}
