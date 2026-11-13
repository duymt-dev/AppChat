// order.file_attach / order.file_detach / order.files_list (TIP-032d §1.2): class mỏng trên bộ dùng chung `sales/files/handlers-kit`. Quyền
// action order.manage / order.view (executor kiểm) + scope sales GHI / ĐỌC hiện hành của đơn (read.ts). Không undo (gỡ là thao tác riêng,
// có cảnh báo; không hoàn tác gửi / tải ra ngoài).
import { Inject, Injectable, Optional } from '@nestjs/common';
import type { ActionInput, orderFileAttach, orderFileDetach, orderFilesList } from '@appchat/actions';
import type { TenantDbResolver } from '@appchat/db';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler } from '../../../kernel/actions/handler';
import { CLOCK, type Clock } from '../../../kernel/clock';
import { FilesService } from '../../../kernel/files/files.service';
import { TENANT_RESOLVER } from '../../../kernel/tenant/tenant.providers';
import { AttachmentKit } from '../../files/handlers-kit';
import { orderPort } from './read';

abstract class OrderFiles {
  protected readonly kit: AttachmentKit;
  constructor(tenants: TenantDbResolver | null, files: FilesService | null, clock: Clock) {
    this.kit = new AttachmentKit(orderPort, tenants, files, () => clock.now());
  }
}

@Injectable()
@ActionHandler('order.file_attach')
export class OrderFileAttachHandler extends OrderFiles implements Handler<ActionInput<typeof orderFileAttach>, unknown> {
  constructor(@Optional() @Inject(TENANT_RESOLVER) t: TenantDbResolver | null, @Optional() @Inject(FilesService) f: FilesService | null, @Inject(CLOCK) c: Clock) {
    super(t, f, c);
  }
  async prepare(ctx: ActionContext, i: ActionInput<typeof orderFileAttach>) {
    return this.kit.prepare(ctx, i.order_id, i);
  }
  async execute(ctx: ActionContext, i: ActionInput<typeof orderFileAttach>, tx: TenantTx) {
    return this.kit.attach(ctx, tx, i.order_id, i);
  }
  async preview(ctx: ActionContext, i: ActionInput<typeof orderFileAttach>, tx: TenantTx) {
    return this.kit.previewAttach(ctx, tx, i.order_id, i);
  }
}

@Injectable()
@ActionHandler('order.file_detach')
export class OrderFileDetachHandler extends OrderFiles implements Handler<ActionInput<typeof orderFileDetach>, unknown> {
  constructor(@Optional() @Inject(TENANT_RESOLVER) t: TenantDbResolver | null, @Optional() @Inject(FilesService) f: FilesService | null, @Inject(CLOCK) c: Clock) {
    super(t, f, c);
  }
  async execute(ctx: ActionContext, i: ActionInput<typeof orderFileDetach>, tx: TenantTx) {
    return this.kit.detach(ctx, tx, i.order_id, i);
  }
  async preview(ctx: ActionContext, i: ActionInput<typeof orderFileDetach>, tx: TenantTx) {
    return this.kit.previewDetach(ctx, tx, i.order_id, i);
  }
}

@Injectable()
@ActionHandler('order.files_list')
export class OrderFilesListHandler extends OrderFiles implements Handler<ActionInput<typeof orderFilesList>, unknown> {
  constructor(@Optional() @Inject(TENANT_RESOLVER) t: TenantDbResolver | null, @Optional() @Inject(FilesService) f: FilesService | null, @Inject(CLOCK) c: Clock) {
    super(t, f, c);
  }
  async execute(ctx: ActionContext, i: ActionInput<typeof orderFilesList>, tx: TenantTx) {
    return this.kit.list(ctx, tx, i.order_id, i);
  }
}

export const ORDER_FILE_HANDLERS = [OrderFileAttachHandler, OrderFileDetachHandler, OrderFilesListHandler] as const;
