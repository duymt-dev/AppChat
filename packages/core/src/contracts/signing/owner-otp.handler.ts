// contract.request_sign_otp (TIP-030c §1.5, §4.1–4.2): Owner / người được uỷ quyền `contract.sign` tự xin mã "Duyệt & ký" cho mình — chỉ
// người bấm ở UI (Trợ lý / agent / API 403, không thẻ xác nhận). Trong transaction: khoá hợp đồng (scope ghi), người ký bên business (tạo /
// cập nhật theo người gọi HIỆN TẠI), tăng thế hệ OTP + HMAC + đặt lại số lần sai (như trước), ý định gửi mail bền (mã mã hoá). Sau commit
// thử gửi ngay; lỗi / chậm → quét ROLE=jobs làm nốt. Trả email đã che + trạng thái giao thật (queued ≠ accepted ≠ đã tới hộp thư).
import { Inject, Injectable, Optional } from '@nestjs/common';
import { TenantContexts } from '@appchat/db';
import { AppError, CONTRACT_FLOW, nextState } from '@appchat/shared';
import type { ActionInput, contractRequestSignOtp } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { uuidv7 } from '../../kernel/ids';
import { CrmMembers, actorUserId } from '../../crm/public';
import { lockContract } from '../contract-access';
import { ContractDeps } from '../services/contract-deps';
import { logSignEvent } from '../services/contract-write';
import { addOwnerOtpIntent, deliverOwnerOtp, type DeliveryStatus } from './delivery';
import { issueOtp } from './otp';
import { SIGNING_RECIPIENTS, type SigningRecipients } from './recipients';

type Out = { contract_id: string; sent_to: string; delivery_status: DeliveryStatus };
const mask = (email: string) => email.replace(/^(.{2})[^@]*/, '$1•••');

@Injectable()
@ActionHandler('contract.request_sign_otp')
export class ContractRequestSignOtpHandler implements Handler<ActionInput<typeof contractRequestSignOtp>, Out> {
  constructor(
    @Inject(ContractDeps) private readonly d: ContractDeps,
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
    @Optional() @Inject(SIGNING_RECIPIENTS) private readonly recipients: SigningRecipients | null = null,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof contractRequestSignOtp>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const me = actorUserId(ctx);
    if (!me || ctx.source !== 'ui') throw new AppError('FORBIDDEN', 403, { actor: 'owner_ui_only' });
    const c = await lockContract(tx, ctx.authz, input.contract_id);
    if (input.expected_version !== undefined && input.expected_version !== c.version) throw new AppError('CONFLICT', 409, { version: 'stale' });
    if (!nextState(CONTRACT_FLOW, c.status, 'contract.approve_and_sign')) throw new AppError('INVALID_TRANSITION', 409, { status: c.status });
    const email = await this.d.userEmail(me);
    if (!email) throw new AppError('INVALID_STATE', 409, { email: 'missing' });
    if (this.d.limiter) await this.d.limiter.hit({ name: 'sign:owner-otp', limit: 5, windowMs: 15 * 60_000 }, `${ctx.workspaceId}:${me}`);
    const now = this.clock.now();
    const name = (await this.members.names([me])).get(me) ?? '';
    const s = await tx.contractSigner.upsert({
      where: { contractId_party: { contractId: c.id, party: 'business' } },
      create: { id: uuidv7(now.getTime()), contractId: c.id, party: 'business', userId: me, name, email, otpChannel: 'email', createdAt: now },
      update: { userId: me, name, email, otpChannel: 'email' },
    });
    const key = this.d.need('env').key;
    const otp = await issueOtp(tx, key, s.id, now, true);
    const deliveryId = await addOwnerOtpIntent(tx, key, { signerId: s.id, generation: otp.generation, recipientUserId: me, requestRef: ctx.idempotencyKey ?? uuidv7(now.getTime()), code: otp.code, expiresAt: otp.expiresAt, now });
    await logSignEvent(tx, { contractId: c.id, signerId: s.id, type: 'otp_sent', actorName: name, meta: { channel: 'email', generation: otp.generation }, at: now });
    const result: Out = { contract_id: c.id, sent_to: mask(email), delivery_status: 'queued' };
    return { result, noUndo: true, afterCommit: () => this.dispatch(ctx.workspaceId, deliveryId, c.code).then(() => undefined) };
  }

  /** Gửi ngay sau commit (tối ưu) — kết quả bền ở dòng ý định; facade HTTP đọc lại trạng thái. */
  async dispatch(ws: string, deliveryId: string, code: string): Promise<DeliveryStatus> {
    if (!this.recipients || !this.d.tenants || !this.d.env) return 'queued';
    const db = await this.d.tenants.get(TenantContexts.system(ws, 'contract.request_sign_otp'));
    return deliverOwnerOtp({ mail: this.d.mail, key: this.d.env.key, recipient: this.recipients.of, place: (w) => this.d.place(w), now: () => this.clock.now() }, db, ws, deliveryId, { code });
  }

  /** Bước step-up chỉ người dùng tự bấm — Trợ lý không nhận thẻ xác nhận, không sinh / gửi mã. */
  async preview(ctx: ActionContext): Promise<never> {
    throw new AppError('FORBIDDEN', 403, { actor: 'owner_ui_only', source: ctx.source });
  }
}
