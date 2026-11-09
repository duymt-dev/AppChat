// quote.export · order.export · contract.export · ticket.export (TIP-038 pha 3, AC07–08). Mọi lần xuất là một việc `data_job` với tập id CHỐT
// trong transaction của action (cùng action_log): ≤ 50 dòng dựng tệp ngay (200 + link tải), > 50 → 202 job_accepted, worker ROLE=jobs dựng
// tệp. Quá trần 100.000 dòng → 422 `rows: too_many` (không cắt ngầm); lọc theo trường tuỳ biến bị ẩn → 422. Tải qua /v1/data-jobs/:id/download
// (chỉ người tạo, 24 giờ, dấu quyền khớp). Idempotency-Key: gửi lại cùng khoá trả đúng handle, không chốt / dựng tệp lần hai.
import { Inject, Injectable, Optional } from '@nestjs/common';
import type { PlatformDb } from '@appchat/db';
import {
  AppError,
  LIST_EXPORT_MAX,
  LIST_EXPORT_SYNC_MAX,
  type ListExportKind,
  type ListExportResult,
} from '@appchat/shared';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import {
  ActionHandler,
  type ActionHandler as Handler,
  type HandlerOutcome,
} from '../../kernel/actions/handler';
import { jobAccepted } from '../../kernel/actions/job-accepted';
import { line, preview } from '../../kernel/actions/preview-kit';
import { createJob } from '../../kernel/jobs/data-jobs/store';
import { dataJobUrl } from '../../kernel/jobs/data-jobs/handlers';
import { STORAGE, type Storage } from '../../kernel/files/storage';
import { PLATFORM_DB } from '../../kernel/tenant/tenant.providers';
import { assertQueryFields, fieldView } from '../../authz/public';
import {
  READERS,
  buildExport,
  exportFileName,
  exportPlace,
  exportStamp,
  formatOf,
  itemBatches,
  storeExport,
} from '../exports/export-runner';
import type { ExportDb } from '../exports/types';

type In = Record<string, unknown>;

const actorOf = (ctx: ActionContext) =>
  ctx.onBehalfOfUserId ?? (ctx.actor.type === 'user' ? ctx.actor.id : null);

abstract class ListExportHandler implements Handler<In, ListExportResult> {
  protected abstract readonly kind: ListExportKind;

  constructor(
    @Inject(CLOCK) private readonly clock: Clock,
    @Optional() @Inject(STORAGE) private readonly storage?: Storage,
    @Optional() @Inject(PLATFORM_DB) private readonly platform?: PlatformDb,
  ) {}

  /** Bộ lọc → tập id chốt (trần + 1 để phát hiện vượt trần); lọc trường tuỳ biến bị ẩn → 422. */
  private async ids(ctx: ActionContext, input: In, tx: TenantTx): Promise<string[]> {
    const reader = READERS[this.kind];
    if (reader.entity)
      assertQueryFields(
        await fieldView(tx, reader.entity, ctx.authz),
        input.custom as Record<string, string> | undefined,
      );
    const ids = await reader.snapshot(
      tx as unknown as ExportDb,
      ctx.authz,
      reader.filter(input),
      LIST_EXPORT_MAX + 1,
      this.clock.now(),
    );
    if (ids.length > LIST_EXPORT_MAX)
      throw new AppError('VALIDATION_FAILED', 422, { rows: 'too_many' }, `> ${LIST_EXPORT_MAX}`);
    return ids;
  }

  protected async count(ctx: ActionContext, input: In, tx: TenantTx) {
    const n = (await this.ids(ctx, input, tx)).length;
    return preview('write', line(this.kind, n), { count: n });
  }

  abstract preview(ctx: ActionContext, input: In, tx: TenantTx): Promise<ReturnType<typeof preview>>;

  async execute(ctx: ActionContext, input: In, tx: TenantTx): Promise<HandlerOutcome<ListExportResult>> {
    const actor = actorOf(ctx);
    if (!actor) throw new AppError('FORBIDDEN', 403, { actor: 'user_required' });
    if (!this.storage) throw new AppError('NOT_IMPLEMENTED', 503, { storage: 'unavailable' });
    const ids = await this.ids(ctx, input, tx);
    const now = this.clock.now();
    const db = tx as unknown as ExportDb;
    const stamp = await exportStamp(db, this.kind, ctx.authz);
    const id = await createJob(tx, {
      kind: this.kind,
      actionId: this.kind,
      actorId: actor,
      actionLogId: null,
      input,
      targets: ids,
      fieldPolicy: stamp,
      now,
    });
    const base = await exportPlace(this.platform ?? null, ctx.workspaceId, actor);
    if (ids.length > LIST_EXPORT_SYNC_MAX) {
      return {
        result: {
          job_id: id,
          rows: ids.length,
          file_name: exportFileName(this.kind, base.locale, now, formatOf(input)),
          download_url: null,
          expires_at: null,
        },
        after: { job_id: id, total: ids.length },
        events: [{ topic: 'data_job.requested', payload: { job_id: id, kind: this.kind } }],
        ...jobAccepted(id, dataJobUrl(id)),
      };
    }
    // Nhỏ: dựng ngay trong transaction (cùng ảnh chụp với tập id) — việc kết thúc `completed` cùng commit; rollback → không có việc, tệp mồ côi
    // không tải được (khoá theo id việc chưa commit).
    const built = await buildExport(db, this.kind, ctx.authz, base, now, itemBatches(tx, id), undefined, formatOf(input));
    const file = await storeExport(tx, this.storage, ctx.workspaceId, id, built, now);
    await tx.dataJob.update({
      where: { id },
      data: { status: 'completed', done: ids.length, ...file, finishedAt: now, updatedAt: now },
    });
    return {
      result: {
        job_id: id,
        rows: built.shown.length,
        file_name: file.fileName,
        download_url: `${dataJobUrl(id)}/download`,
        expires_at: file.expiresAt.toISOString(),
      },
      after: { job_id: id, total: ids.length },
    };
  }
}

// Thẻ xác nhận Trợ lý: số dòng sẽ xuất (preview khai ở từng lớp — mỗi action một handler).
@Injectable()
@ActionHandler('quote.export')
export class QuoteExportHandler extends ListExportHandler {
  protected readonly kind = 'quote.export' as const;
  async preview(ctx: ActionContext, input: In, tx: TenantTx) {
    return this.count(ctx, input, tx);
  }
}

@Injectable()
@ActionHandler('order.export')
export class OrderExportHandler extends ListExportHandler {
  protected readonly kind = 'order.export' as const;
  async preview(ctx: ActionContext, input: In, tx: TenantTx) {
    return this.count(ctx, input, tx);
  }
}

@Injectable()
@ActionHandler('contract.export')
export class ContractExportHandler extends ListExportHandler {
  protected readonly kind = 'contract.export' as const;
  async preview(ctx: ActionContext, input: In, tx: TenantTx) {
    return this.count(ctx, input, tx);
  }
}

@Injectable()
@ActionHandler('ticket.export')
export class TicketExportHandler extends ListExportHandler {
  protected readonly kind = 'ticket.export' as const;
  async preview(ctx: ActionContext, input: In, tx: TenantTx) {
    return this.count(ctx, input, tx);
  }
}

@Injectable()
@ActionHandler('product.export')
export class ProductExportHandler extends ListExportHandler {
  protected readonly kind = 'product.export' as const;
  async preview(ctx: ActionContext, input: In, tx: TenantTx) {
    return this.count(ctx, input, tx);
  }
}

@Injectable()
@ActionHandler('invoice.export')
export class InvoiceExportHandler extends ListExportHandler {
  protected readonly kind = 'invoice.export' as const;
  async preview(ctx: ActionContext, input: In, tx: TenantTx) {
    return this.count(ctx, input, tx);
  }
}

// TIP-026b §5: 3 tập hoạt động CRM — cùng khung (tập id chốt, tệp XLSX, tải có hạn, dấu quyền).
@Injectable()
@ActionHandler('contact_note.export')
export class ContactNoteExportHandler extends ListExportHandler {
  protected readonly kind = 'contact_note.export' as const;
  async preview(ctx: ActionContext, input: In, tx: TenantTx) {
    return this.count(ctx, input, tx);
  }
}

@Injectable()
@ActionHandler('contact_task.export')
export class ContactTaskExportHandler extends ListExportHandler {
  protected readonly kind = 'contact_task.export' as const;
  async preview(ctx: ActionContext, input: In, tx: TenantTx) {
    return this.count(ctx, input, tx);
  }
}

@Injectable()
@ActionHandler('contact_opportunity.export')
export class ContactOpportunityExportHandler extends ListExportHandler {
  protected readonly kind = 'contact_opportunity.export' as const;
  async preview(ctx: ActionContext, input: In, tx: TenantTx) {
    return this.count(ctx, input, tx);
  }
}

// TIP-033b §5.1: liệu trình MỘT khách (tập chỉ xuất customer_packages) — cùng khung (tập id chốt, tệp CSV / XLSX, tải có hạn, dấu quyền).
@Injectable()
@ActionHandler('package.export')
export class PackageExportHandler extends ListExportHandler {
  protected readonly kind = 'package.export' as const;
  async preview(ctx: ActionContext, input: In, tx: TenantTx) {
    return this.count(ctx, input, tx);
  }
}
