// contract.draft_from_content (TIP-030b spec 9): tạo đúng MỘT nháp từ đề xuất BẤT BIẾN của `contract.prepare_draft` — không gọi model, không
// trừ credit ở preview / confirm / execute. Preview đọc đúng đề xuất (hash nội dung hiện trên thẻ); execute khoá đề xuất (FOR UPDATE), kiểm
// lại người tạo / hạn / chưa dùng + quyền khách hiện hành rồi tạo nháp từ mẫu theo loại (điều khoản mẫu nguyên văn) và gắn gợi ý AI ở trạng
// thái `pending`. Gọi lại sau khi đã dùng → trả đúng hợp đồng đã tạo (không tạo thêm, không soạn lại). Hết hạn → phải soạn lại rõ ràng.
import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { ActionInput, contractDraftFromContent } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../kernel/actions/handler';
import { created, preview } from '../../kernel/actions/preview-kit';
import { CrmMembers, editableContact } from '../../crm/public';
import { pendingOf, type AiSuggestion, type DraftContent } from '../files/draft-content';
import { proposalActor } from '../files/suggestions';
import { createdAfter, insertContract, undoCreate } from './contract-create';

type In = ActionInput<typeof contractDraftFromContent>;
type Out = { contract_id: string; code: string; pending_suggestions: number };
const UUID = /^[0-9a-f-]{36}$/i;

/** Đề xuất của chính người gọi, còn hạn. `lock` = khoá dòng trong transaction ghi (tiêu thụ một lần). */
async function proposalOf(ctx: ActionContext, tx: TenantTx, id: string, now: Date, lock: boolean) {
  if (!UUID.test(id)) throw new AppError('NOT_FOUND', 404, { proposal_id: 'not_found' });
  if (lock) await tx.$queryRaw`SELECT id FROM contract_draft_proposal WHERE id = ${id}::uuid FOR UPDATE`;
  const p = await tx.contractDraftProposal.findUnique({ where: { id } });
  // Đề xuất của người khác: không xác nhận tồn tại.
  if (!p || p.requestActor !== proposalActor(ctx)) throw new AppError('NOT_FOUND', 404, { proposal_id: 'not_found' });
  if (!p.consumedContractId && p.expiresAt <= now) throw new AppError('INVALID_STATE', 409, { proposal_id: 'expired' });
  return p;
}

@Injectable()
@ActionHandler('contract.draft_from_content')
export class ContractDraftFromContentHandler implements Handler<In, Out> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: In, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const now = this.clock.now();
    const p = await proposalOf(ctx, tx, input.proposal_id, now, true);
    if (p.consumedContractId) {
      // Đã dùng: trả hợp đồng đã tạo (thử lại / hai lần bấm) — không tạo thêm.
      const c = await tx.contract.findUnique({ where: { id: p.consumedContractId }, select: { id: true, code: true, aiSuggestions: true, deletedAt: true } });
      // Nháp đã hoàn tác → đề xuất không dùng lại được (soạn lại rõ ràng).
      if (!c || c.deletedAt) throw new AppError('INVALID_STATE', 409, { proposal_id: 'consumed' });
      return { result: { contract_id: c.id, code: c.code, pending_suggestions: pendingOf(c.aiSuggestions) } };
    }
    const content = p.content as unknown as DraftContent;
    const suggestions: AiSuggestion[] = (p.suggestions as { id: string; text: string }[]).map((s) => ({ id: s.id, text: s.text, status: 'pending', version: 1 }));
    const c = await insertContract(
      ctx,
      tx,
      this.members,
      { contact_id: p.contactId, kind: p.kind, title: content.title, value: content.value, start_date: content.start_date ?? undefined, end_date: content.end_date ?? undefined },
      now,
      'created_by_ai',
    );
    await tx.contract.update({ where: { id: c.id }, data: { draftProposalId: p.id, aiSuggestions: suggestions as never } });
    const used = await tx.contractDraftProposal.updateMany({ where: { id: p.id, consumedContractId: null }, data: { consumedContractId: c.id, consumedAt: now } });
    if (!used.count) throw new AppError('CONFLICT', 409, { proposal_id: 'consumed' });
    return { result: { contract_id: c.id, code: c.code, pending_suggestions: suggestions.length }, after: await createdAfter(tx, c.id) };
  }

  async preview(ctx: ActionContext, input: In, tx: TenantTx) {
    const p = await proposalOf(ctx, tx, input.proposal_id, this.clock.now(), false);
    const { contact } = await editableContact(tx, ctx.authz, p.contactId);
    const content = p.content as unknown as DraftContent;
    const warnings = [...(content.off_catalog ? ['off_catalog'] : []), ...((p.suggestions as unknown[]).length ? ['ai_suggested'] : [])];
    return preview('write', `${contact.name} · ${content.title}`, {
      changes: [created('contract', { contact: contact.name, kind: p.kind, title: content.title, value: content.value, start_date: content.start_date ?? undefined, end_date: content.end_date ?? undefined, proposal: p.contentHash.slice(0, 12) })],
      ...(warnings.length ? { warnings } : {}),
    });
  }

  async undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    await undoCreate(ctx, log, tx, this.clock.now());
  }
}
