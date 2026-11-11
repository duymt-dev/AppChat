// Đọc Hợp đồng (Blueprint §4.4 contracts, TIP-030 — shape packages/shared/src/api/contracts.ts): /v1/contracts (D42 page + limit,
// chip `status` / `owner_id` / `contact_id` / `value` / `q` không dấu), /contracts/meta (?contract_id= kèm thẻ CRM / tệp của hợp đồng),
// /contracts/:id, /contracts/:id/pdf. Quyền `contract.view` (hoặc `contract.draft`); data scope sales trong service (không thấy → 404).
// `POST /contracts/:id/sign-otp` = facade action `contract.request_sign_otp` (TIP-030c) — OTP "Duyệt & ký" tới email người ký (`contract.sign`). Ghi qua action contract.*.
import { Controller, Get, HttpCode, Inject, Param, Post, Query, Req, Res } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { ActionExecutor, ContractsReadService, type ContractFilter } from '@appchat/core';
import { AppError } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';
import { sendPdf } from '../sales/quotes.controller';

const int = (v: string | undefined, field: string) => {
  if (v === undefined || v === '') return undefined;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) throw new AppError('VALIDATION_FAILED', 400, { [field]: 'invalid' });
  return n;
};

export const contractFilterOf = (q: Record<string, string | undefined>): ContractFilter => ({ status: q.status, ownerId: q.owner_id, assignedId: q.assigned_user_id, contactId: q.contact_id, value: q.value, q: q.q?.slice(0, 100) });

@Controller('contracts')
export class ContractsController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(ContractsReadService) private readonly read: ContractsReadService,
    @Inject(ActionExecutor) private readonly executor: ActionExecutor,
  ) {}

  private async viewer(req: IncomingMessage, perm: 'contract.view' | 'contract.sign' = 'contract.view') {
    const a = await this.actors.resolve(req);
    const p = a.authz.permissions;
    const ok = a.authz.isOwner || p.has(perm) || (perm === 'contract.view' && p.has('contract.draft'));
    if (!ok) throw new AppError('FORBIDDEN', 403, { permission: perm });
    return a;
  }

  @Get()
  async list(@Req() req: IncomingMessage, @Query() q: Record<string, string | undefined>) {
    return this.read.list(await this.viewer(req), contractFilterOf(q), int(q.page, 'page'), int(q.limit, 'limit'));
  }

  @Get('meta')
  async meta(@Req() req: IncomingMessage, @Query('contract_id') contractId?: string) {
    return { data: await this.read.meta(await this.viewer(req), contractId || undefined) };
  }

  @Get(':id')
  async get(@Req() req: IncomingMessage, @Param('id') id: string) {
    return { data: await this.read.get(await this.viewer(req), id) };
  }

  @Get(':id/pdf')
  async pdf(@Req() req: IncomingMessage, @Param('id') id: string, @Res() res: ServerResponse) {
    const r = await this.read.pdf(await this.viewer(req), id);
    sendPdf(res, r.name, r.pdf, 'inline');
  }

  @Post(':id/sign-otp')
  @HttpCode(200)
  async signOtp(@Req() req: IncomingMessage, @Param('id') id: string) {
    // TIP-030c §1.5: facade của đúng action `contract.request_sign_otp` (người gọi hiện tại, nguồn ui, idempotency theo header nếu có) —
    // không còn đường ghi thứ hai. Giữ hình dạng `{ sent_to }` + thêm `delivery_status`.
    const a = await this.viewer(req, 'contract.sign');
    const key = req.headers['idempotency-key'];
    const out = await this.executor.execute<{ sent_to: string; delivery_status: string }>(
      { workspaceId: a.workspaceId, source: 'ui', actor: { type: 'user', id: a.userId }, authz: a.authz, idempotencyKey: (Array.isArray(key) ? key[0] : key) ?? `sign-otp:${randomUUID()}` },
      'contract.request_sign_otp',
      { contract_id: id },
    );
    const r = (out.data as { result: { sent_to: string; delivery_status: string } }).result;
    // Kết quả action tính trước commit (queued) — đọc lại trạng thái ý định sau lần gửi ngay sau commit.
    return { data: { sent_to: r.sent_to, delivery_status: await this.read.ownerOtpStatus(a, id) } };
  }
}
