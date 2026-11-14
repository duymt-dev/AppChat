// Xuất bộ gợi ý danh mục ticket (TIP-034b §4.1): tệp CSV / XLSX chỉ gồm bộ CẤU HÌNH (vị trí + nhãn theo thứ tự) — không nhãn lấy từ ticket,
// không id / dữ liệu khách. Chưa cấu hình → 8 nhãn mặc định thật (không tệp rỗng). Dùng khung việc dữ liệu (`data_job` hoàn tất trong cùng
// transaction, tải `/v1/data-jobs/:id/download` — chỉ người tạo, 24 giờ, dấu quyền settings.manage). Ô chữ không công thức: XLSX gán chuỗi;
// CSV thêm `'` trước nhãn bắt đầu bằng = + - @ ' (nhập lại bỏ đúng một dấu — khứ hồi đúng chuỗi).
import { Inject, Injectable, Optional } from '@nestjs/common';
import type { PlatformDb } from '@appchat/db';
import { AppError, can, serverMessages, type AuthzContext, type ListExportResult } from '@appchat/shared';
import type { ActionInput, ticketCategoriesExport } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { line, preview } from '../../kernel/actions/preview-kit';
import { createJob } from '../../kernel/jobs/data-jobs/store';
import { dataJobUrl } from '../../kernel/jobs/data-jobs/handlers';
import { registerExportStamp } from '../../kernel/jobs/bulk-status';
import { STORAGE, type Storage } from '../../kernel/files/storage';
import { PLATFORM_DB } from '../../kernel/tenant/tenant.providers';
import { readCategoryConfig } from './repository';

type In = ActionInput<typeof ticketCategoriesExport>;
const KIND = 'ticket_categories.export';
const TTL_MS = 24 * 60 * 60_000;
const RISKY = /^[=+\-@'\t\r]/;

const stampOf = (a: AuthzContext) => (can(a, 'settings.manage') ? 'settings.manage' : '-');
// Mất settings.manage sau khi xuất → tệp cũ không tải nữa.
registerExportStamp(KIND, async (_db, a) => stampOf(a));

const csvCell = (v: string) => {
  const safe = RISKY.test(v) ? `'${v}` : v;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export function categoriesCsv(head: [string, string], labels: readonly string[]): Buffer {
  const lines = [head.map(csvCell).join(','), ...labels.map((l, i) => `${i + 1},${csvCell(l)}`)];
  return Buffer.from(`﻿${lines.join('\r\n')}\r\n`, 'utf8');
}

export async function categoriesXlsx(sheet: string, head: [string, string], labels: readonly string[]): Promise<Buffer> {
  const { default: ExcelJS } = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheet.slice(0, 31));
  ws.columns = [{ width: 10 }, { width: 40 }];
  ws.addRow(head).font = { bold: true };
  // Gán từng ô kiểu chuỗi — exceljs không diễn giải "=…" thành công thức khi value là string.
  labels.forEach((l, i) => {
    const r = ws.addRow([]);
    r.getCell(1).value = i + 1;
    r.getCell(2).value = l;
  });
  return Buffer.from(await wb.xlsx.writeBuffer());
}

@Injectable()
@ActionHandler(KIND)
export class TicketCategoriesExportHandler implements Handler<In, ListExportResult> {
  constructor(
    @Inject(CLOCK) private readonly clock: Clock,
    @Optional() @Inject(STORAGE) private readonly storage?: Storage,
    @Optional() @Inject(PLATFORM_DB) private readonly platform?: PlatformDb,
  ) {}

  /** Ngôn ngữ người xuất (tiêu đề cột / tên tệp) — tiêu đề cả hai ngôn ngữ đều khớp alias nhập lại. */
  private async locale(userId: string): Promise<'vi' | 'en'> {
    const u = this.platform ? await this.platform.user.findUnique({ where: { id: userId }, select: { locale: true } }) : null;
    return u?.locale === 'en' ? 'en' : 'vi';
  }

  async preview(_ctx: ActionContext, i: In, tx: TenantTx) {
    const c = await readCategoryConfig(tx);
    return preview('write', line(KIND, c.labels.length, i.format ?? 'xlsx'), { count: c.labels.length });
  }

  async execute(ctx: ActionContext, i: In, tx: TenantTx): Promise<HandlerOutcome<ListExportResult>> {
    const actor = ctx.onBehalfOfUserId ?? (ctx.actor.type === 'user' ? ctx.actor.id : null);
    if (!actor) throw new AppError('FORBIDDEN', 403, { actor: 'user_required' });
    if (!this.storage) throw new AppError('NOT_IMPLEMENTED', 503, { storage: 'unavailable' });
    const now = this.clock.now();
    const c = await readCategoryConfig(tx);
    const format = i.format ?? 'xlsx';
    const m = serverMessages(await this.locale(actor)).support.categories;
    const head: [string, string] = [m.position, m.label];
    const body = format === 'csv' ? categoriesCsv(head, c.labels) : await categoriesXlsx(m.sheet, head, c.labels);
    const id = await createJob(tx, { kind: KIND, actionId: KIND, actorId: actor, actionLogId: null, input: { format, version: c.version }, targets: [], fieldPolicy: stampOf(ctx.authz), now });
    const fileKey = `${ctx.workspaceId}/exports/${id}.${format}`;
    await this.storage.put(fileKey, body);
    const fileName = `${m.file}-${now.toISOString().slice(0, 10)}.${format}`;
    const expiresAt = new Date(now.getTime() + TTL_MS);
    await tx.dataJob.update({ where: { id }, data: { status: 'completed', total: c.labels.length, done: c.labels.length, fileKey, fileName, expiresAt, finishedAt: now, updatedAt: now } });
    return {
      result: { job_id: id, rows: c.labels.length, file_name: fileName, download_url: `${dataJobUrl(id)}/download`, expires_at: expiresAt.toISOString() },
      after: { job_id: id, total: c.labels.length, version: c.version },
    };
  }
}
