// billing.contact_sales (TIP-039 pha 3, AC08) — yêu cầu tư vấn gói Doanh nghiệp: ghi `sales_inquiry` ở DB nền tảng trong PlatformTx của action
// (sổ thao tác 045b + Idempotency-Key: gửi lại cùng khoá → cùng kết quả, không tạo dòng thứ hai). Giới hạn 3 yêu cầu / 24 giờ mỗi workspace
// (khoá dòng workspace trước khi đếm — hai request song song không vượt). Event `sales.inquiry_created` chỉ mang id (không email / SĐT /
// nội dung — không đưa PII vào log / outbox / LLM); đội vận hành đọc chi tiết ở Quản trị nền tảng (TIP-040). Thành công = đã nhận yêu cầu.
import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { ActionInput, billingContactSales } from '@appchat/actions';
import type { ActionContext, PlatformTx, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { line, preview } from '../../kernel/actions/preview-kit';
import { CLOCK, type Clock } from '../../kernel/clock';
import { uuidv7 } from '../../kernel/ids';

type Input = ActionInput<typeof billingContactSales>;
type Out = { inquiry_id: string; status: 'received' };

export const CONTACT_SALES_LIMIT = 3;
const WINDOW_MS = 24 * 3_600_000;

@Injectable()
@ActionHandler('billing.contact_sales')
export class BillingContactSalesHandler implements Handler<Input, Out> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, input: Input, _tx: TenantTx, ptx?: PlatformTx): Promise<HandlerOutcome<Out>> {
    if (!ptx) throw new AppError('INTERNAL', 500, undefined, 'billing.contact_sales cần PlatformTx');
    const now = this.clock.now();
    await ptx.$queryRaw`SELECT id FROM workspace WHERE id = ${ctx.workspaceId}::uuid FOR UPDATE`;
    const recent = await ptx.salesInquiry.count({ where: { workspaceId: ctx.workspaceId, createdAt: { gt: new Date(now.getTime() - WINDOW_MS) } } });
    if (recent >= CONTACT_SALES_LIMIT) throw new AppError('RATE_LIMITED', 429, { inquiry: 'too_many' });
    const id = uuidv7(now.getTime());
    await ptx.salesInquiry.create({
      data: { id, workspaceId: ctx.workspaceId, requestedBy: ctx.onBehalfOfUserId ?? ctx.actor.id, name: input.name, email: input.email.toLowerCase(), phone: input.phone, message: input.message, consent: true, createdAt: now },
    });
    return {
      result: { inquiry_id: id, status: 'received' },
      // `after` chỉ giữ id (input đã che email / SĐT theo REDACT_KEYS; bản đầy đủ ở bảng nền tảng có quyền đọc riêng).
      after: { inquiry_id: id },
      events: [{ topic: 'sales.inquiry_created', payload: { inquiry_id: id } }],
    };
  }

  async preview(_ctx: ActionContext, input: Input) {
    return preview('write', line('sales_inquiry', input.name), { changes: [{ entity: 'sales_inquiry', after: { name: input.name } }] });
  }
}
