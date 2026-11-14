// Preview AI soạn báo giá từ nội dung (TIP-023b R2.8): khách + trích nội dung + ước lượng bằng bộ luật miễn phí (không gọi model trong
// preview — không trừ Credit) khớp danh mục: số dòng, số dòng ngoài danh mục, tổng tạm. Báo giá do AI soạn có dòng ngoài danh mục / giảm
// > 5% → buộc duyệt trước khi gửi (COMMERCE §12). Kết quả thật do model trích khi xác nhận nên có thể khác — cảnh báo `ai_estimate`.
import type { ActionInput, ActionPreview, quoteDraftFromContent } from '@appchat/actions';
import { quoteTotals } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { created, line, preview } from '../../../kernel/actions/preview-kit';
import { editableContact } from '../../../crm/public';
import { intentByRules, matchCatalog } from '../services/quote-draft';
import { approvalWarnings } from './quote-write.handlers.preview';
import { quotePolicy } from '../../settings/policy';

const clip = (s: string, n = 80) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export async function draftPreview(ctx: ActionContext, tx: TenantTx, i: ActionInput<typeof quoteDraftFromContent>): Promise<ActionPreview> {
  const { contact } = await editableContact(tx, ctx.authz, i.contact_id);
  const intent = intentByRules(i.content);
  const m = await matchCatalog(tx, intent.lines.length ? intent : { lines: [{ text: i.content.slice(0, 200), qty: 1 }], discountPct: null });
  const t = quoteTotals(m.items, m.discount);
  return preview('write', line(contact.name, clip(i.content.trim())), {
    changes: [created('quote', { contact: contact.name, status: 'draft', items: m.items.length, off_catalog: m.offCatalog, total: t.total })],
    warnings: ['ai_estimate', ...approvalWarnings(t, m.offCatalog > 0, await quotePolicy(tx, 'assistant'))],
  });
}
