// Adapter nhập 3 tập hoạt động CRM (TIP-026b §5): mỗi dòng hợp lệ = MỘT lệnh action canonical qua ActionExecutor (contact.add_note /
// add_comment theo `kind` cố định của dòng · contact_task.create · contact_opportunity.create) — người nhập là tác giả, giờ tạo là giờ ghi
// (không ghi đè tác giả / thời điểm / audit), không giao việc cho người khác, không đổi phụ trách khách. Luật chặn ở bước kiểm (trước khi
// xác nhận): việc nhập luôn `open` (done / cancelled → `state: readonly`); cơ hội won / lost → `stage: terminal`; giá trị kỳ vọng cần quyền
// ghi tiền (quote.create) → thiếu quyền mà có cột → `expected_amount: forbidden` (không âm thầm bỏ). Dòng có `id` (tệp xuất từ hệ thống)
// → loại có lý do `exported_record`, không cập nhật ngầm. Hạn việc / ngày chốt là ngày lịch: hạn = 23:59 ngày đó giờ Việt Nam (+07:00).
import { probabilityOk, type ActivityDataset } from '@appchat/shared';
import { canWriteAmount } from '../../crm/activities/authority';
import type { CheckedRow } from '../services/validation';
import { activityPartyResolver } from './activity-party';
import type { Adapter, Classifier, PendingRow, RowCheck, UnitResult, WriteUnit } from './types';

const DUE_TIME = 'T23:59:00+07:00';

function rowRules(dataset: ActivityDataset, r: CheckedRow, moneyOk: boolean) {
  const d = r.data;
  if (dataset === 'contact_tasks' && d.state && d.state !== 'open') r.errors.state = 'readonly';
  if (dataset === 'contact_opportunities') {
    if (d.stage === 'won' || d.stage === 'lost') r.errors.stage = 'terminal';
    if (d.expected_amount && !moneyOk) r.errors.expected_amount = 'forbidden';
    if (d.probability && !probabilityOk(Number(d.probability))) r.errors.probability = 'invalid';
  }
}

export function classifyActivities(dataset: ActivityDataset): Classifier {
  return async (tx, who, rows) => {
    const party = activityPartyResolver(tx, who);
    const moneyOk = canWriteAmount(who.authz);
    const out: RowCheck[] = [];
    for (const r of rows) {
      rowRules(dataset, r, moneyOk);
      const p = await party(r.data);
      if ('error' in p) r.errors.contact = p.error;
      else r.data.contact_id = p.contactId;
      if (dataset === 'contact_notes') r.data.kind = r.data.kind || 'note';
      if (r.data.id) {
        r.errors.id_warning = 'exported_record';
        out.push('duplicate');
      } else out.push('valid');
    }
    return out;
  };
}

/** Dòng → input action canonical (chỉ trường action nhận; nguồn hội thoại không có khi nhập tệp). */
function unitOf(dataset: ActivityDataset, r: PendingRow): WriteUnit {
  const d = r.data;
  const base = { rows: [r], key: String(r.rowNo) };
  if (dataset === 'contact_notes')
    return { ...base, action: d.kind === 'comment' ? 'contact.add_comment' : 'contact.add_note', input: { contact_id: d.contact_id, body: d.body } };
  if (dataset === 'contact_tasks')
    return {
      ...base,
      input: {
        contact_id: d.contact_id,
        title: d.title,
        ...(d.description ? { description: d.description } : {}),
        ...(d.due ? { due_at: `${d.due}${DUE_TIME}` } : {}),
        // Người nhập tự nhận việc (mặc định của action) — tệp không giao việc cho người khác.
      },
    };
  return {
    ...base,
    input: {
      contact_id: d.contact_id,
      title: d.title,
      ...(d.need ? { need: d.need } : {}),
      ...(d.expected_amount ? { amount_vnd: d.expected_amount } : {}),
      ...(d.stage ? { stage: d.stage } : {}),
      ...(d.probability ? { probability: Number(d.probability) } : {}),
      ...(d.expected_close_date ? { expected_close_date: d.expected_close_date } : {}),
    },
  };
}

const ID_OF: Record<ActivityDataset, string> = { contact_notes: 'note_id', contact_tasks: 'task_id', contact_opportunities: 'opportunity_id' };

export const activityAdapter = (dataset: ActivityDataset): Adapter => ({
  classify: classifyActivities(dataset),
  batch: 50,
  units: (rows) => rows.map((r) => unitOf(dataset, r)),
  resolve: async (_db, unit, result): Promise<UnitResult> => {
    const id = (result as Record<string, string | undefined>)[ID_OF[dataset]];
    return new Map(unit.rows.map((r) => [r.id, id ? { id, code: null } : null]));
  },
});
