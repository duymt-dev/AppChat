// AI Governance của workspace (Blueprint §2.2 `ai_governance`, Cài đặt › AI Governance — prototype; FE `Governance`): phạm vi dữ
// liệu AI được đọc, ranh giới hành vi, từ cấm, bộ lọc đầu ra, lưu trữ, PII, vùng dữ liệu. Một dòng (id = 1, seed lúc provision).
// "Đang áp dụng n/m chính sách khuyến nghị": khuyến nghị = giá trị mặc định của mỗi phạm vi / ranh giới + ẩn danh PII + không cho
// bên ngoài huấn luyện.
import { Inject, Injectable } from '@nestjs/common';
import type { ActionInput, governanceUpdate } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { registerTenantSeed } from '../../kernel/tenant-seeds';
import { governancePreview } from './previews/governance.preview';
import { BOUNDS, SCOPES, defaultGovernance, flags, governanceDto, pick, readGovernance } from './governance.store';

export { DEFAULT_BANNED, FORCE_APPROVAL, defaultGovernance, governanceDto, readGovernance } from './governance.store';

@Injectable()
@ActionHandler('governance.update')
export class GovernanceUpdateHandler implements Handler<ActionInput<typeof governanceUpdate>, { ok: boolean }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(_ctx: ActionContext, input: ActionInput<typeof governanceUpdate>, tx: TenantTx): Promise<HandlerOutcome<{ ok: boolean }>> {
    const g = await readGovernance(tx);
    const data = {
      ...(input.scopes ? { scopes: { ...flags(g.scopes), ...pick(SCOPES, input.scopes) } } : {}),
      ...(input.bounds ? { bounds: { ...flags(g.bounds), ...pick(BOUNDS, input.bounds) } } : {}),
      ...(input.keywords ? { bannedWords: [...new Set(input.keywords.map((k) => k.trim()).filter(Boolean))] } : {}),
      ...(input.filter ? { filter: input.filter } : {}),
      ...(input.retention ? { retentionDays: Number(input.retention) } : {}),
      ...(input.long_review !== undefined ? { longReview: input.long_review } : {}),
      ...(input.no_external_train !== undefined ? { noExternalTrain: input.no_external_train } : {}),
      ...(input.anonymize_pii !== undefined ? { piiFilter: input.anonymize_pii } : {}),
      ...(input.residency ? { residency: input.residency } : {}),
    };
    await tx.aiGovernance.update({ where: { id: 1 }, data: { ...data, updatedAt: this.clock.now() } });
    return { result: { ok: true }, before: governanceDto(g), after: data };
  }

  async preview(_ctx: ActionContext, input: ActionInput<typeof governanceUpdate>, tx: TenantTx) {
    return governancePreview(tx, input);
  }
}

registerTenantSeed({
  name: 'ai.governance',
  order: 30,
  async run(tx) {
    await tx.aiGovernance.upsert({ where: { id: 1 }, create: defaultGovernance(), update: {} });
  },
});
