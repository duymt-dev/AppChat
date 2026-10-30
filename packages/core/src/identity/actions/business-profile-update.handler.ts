// business_profile.update (db platform, settings.manage) — khai báo DN / hộ KD / cá nhân sau đăng ký (REQ-A02, DC-019).
// Lần đầu ghi declared_at; cập nhật sau giữ declared_at cũ.
import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { ActionInput, businessProfileUpdate } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, PlatformTx, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';

type Input = ActionInput<typeof businessProfileUpdate>;
type Output = { workspace_id: string; declared_at: string };

@Injectable()
@ActionHandler('business_profile.update')
export class BusinessProfileUpdateHandler implements Handler<Input, Output> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, input: Input, _tx: TenantTx, ptx?: PlatformTx): Promise<HandlerOutcome<Output>> {
    if (!ptx) throw new AppError('INTERNAL', 500, undefined, 'business_profile.update cần PlatformTx');
    const ws = ctx.workspaceId;
    const before = await ptx.businessProfile.findUnique({ where: { workspaceId: ws } });
    const fields = {
      kind: input.kind,
      taxCode: input.kind === 'individual' ? null : (input.tax_code ?? null),
      nationalId: input.kind === 'individual' ? (input.national_id ?? null) : null,
      legalName: input.legal_name,
      address: input.address,
      representative: input.representative ?? null,
      phone: input.phone ?? null,
      foundedOn: input.founded_on ?? null,
      legalStatus: input.legal_status ?? null,
      businessDescription: input.business_description,
    };
    const row = await ptx.businessProfile.upsert({
      where: { workspaceId: ws },
      create: { workspaceId: ws, ...fields, declaredAt: this.clock.now() },
      update: fields,
    });
    const declaredAt = row.declaredAt.toISOString();
    return {
      result: { workspace_id: ws, declared_at: declaredAt },
      before: before ? { ...before, declaredAt: before.declaredAt.toISOString(), updatedAt: before.updatedAt.toISOString() } : null,
      after: { kind: row.kind, legal_name: row.legalName },
      events: before ? [] : [{ topic: 'workspace.declared', payload: { workspace_id: ws, kind: row.kind } }],
    };
  }
}
