// invoice.file_attach / invoice.file_detach / invoice.files_list (TIP-032d §1.2, §1.5): class mỏng trên bộ dùng chung `sales/files/handlers-kit`. Quyền
// action invoice.manage (executor kiểm) + scope sales GHI / ĐỌC hiện hành của đề nghị; chứng từ đã sinh chỉ đọc (read.ts). Không undo (gỡ là thao tác riêng,
// có cảnh báo; không hoàn tác gửi / tải ra ngoài).
import { Inject, Injectable, Optional } from '@nestjs/common';
import type { ActionInput, invoiceFileAttach, invoiceFileDetach, invoiceFilesList } from '@appchat/actions';
import type { TenantDbResolver } from '@appchat/db';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler } from '../../../kernel/actions/handler';
import { CLOCK, type Clock } from '../../../kernel/clock';
import { FilesService } from '../../../kernel/files/files.service';
import { TENANT_RESOLVER } from '../../../kernel/tenant/tenant.providers';
import { AttachmentKit } from '../../files/handlers-kit';
import { invoicePort } from './read';

abstract class InvoiceFiles {
  protected readonly kit: AttachmentKit;
  constructor(tenants: TenantDbResolver | null, files: FilesService | null, clock: Clock) {
    this.kit = new AttachmentKit(invoicePort, tenants, files, () => clock.now());
  }
}

@Injectable()
@ActionHandler('invoice.file_attach')
export class InvoiceFileAttachHandler extends InvoiceFiles implements Handler<ActionInput<typeof invoiceFileAttach>, unknown> {
  constructor(@Optional() @Inject(TENANT_RESOLVER) t: TenantDbResolver | null, @Optional() @Inject(FilesService) f: FilesService | null, @Inject(CLOCK) c: Clock) {
    super(t, f, c);
  }
  async prepare(ctx: ActionContext, i: ActionInput<typeof invoiceFileAttach>) {
    return this.kit.prepare(ctx, i.invoice_id, i);
  }
  async execute(ctx: ActionContext, i: ActionInput<typeof invoiceFileAttach>, tx: TenantTx) {
    return this.kit.attach(ctx, tx, i.invoice_id, i);
  }
  async preview(ctx: ActionContext, i: ActionInput<typeof invoiceFileAttach>, tx: TenantTx) {
    return this.kit.previewAttach(ctx, tx, i.invoice_id, i);
  }
}

@Injectable()
@ActionHandler('invoice.file_detach')
export class InvoiceFileDetachHandler extends InvoiceFiles implements Handler<ActionInput<typeof invoiceFileDetach>, unknown> {
  constructor(@Optional() @Inject(TENANT_RESOLVER) t: TenantDbResolver | null, @Optional() @Inject(FilesService) f: FilesService | null, @Inject(CLOCK) c: Clock) {
    super(t, f, c);
  }
  async execute(ctx: ActionContext, i: ActionInput<typeof invoiceFileDetach>, tx: TenantTx) {
    return this.kit.detach(ctx, tx, i.invoice_id, i);
  }
  async preview(ctx: ActionContext, i: ActionInput<typeof invoiceFileDetach>, tx: TenantTx) {
    return this.kit.previewDetach(ctx, tx, i.invoice_id, i);
  }
}

@Injectable()
@ActionHandler('invoice.files_list')
export class InvoiceFilesListHandler extends InvoiceFiles implements Handler<ActionInput<typeof invoiceFilesList>, unknown> {
  constructor(@Optional() @Inject(TENANT_RESOLVER) t: TenantDbResolver | null, @Optional() @Inject(FilesService) f: FilesService | null, @Inject(CLOCK) c: Clock) {
    super(t, f, c);
  }
  async execute(ctx: ActionContext, i: ActionInput<typeof invoiceFilesList>, tx: TenantTx) {
    return this.kit.list(ctx, tx, i.invoice_id, i);
  }
}

export const INVOICE_FILE_HANDLERS = [InvoiceFileAttachHandler, InvoiceFileDetachHandler, InvoiceFilesListHandler] as const;
