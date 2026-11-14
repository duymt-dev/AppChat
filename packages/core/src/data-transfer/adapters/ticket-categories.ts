// Adapter tệp từ điển gợi ý danh mục ticket (TIP-034b §4): CẢ tệp là MỘT bộ cấu hình — không ghi theo dòng, không nâng cấp từng nhãn.
// Phân loại: vị trí (nếu có) phải là số nguyên duy nhất, liền 1..N; không có cột vị trí → thứ tự dòng nguồn. Nhãn qua validator dùng chung
// (NFC + trim, 1–60 ký tự, không ký tự điều khiển, không trùng không phân biệt hoa thường) — một dòng lỗi là cả bộ không xác nhận được (atomic).
// Quá 100 nhãn → dòng vượt trần lỗi `too_many` (không cắt ngầm). Phiên bản cấu hình đọc lúc lập kế hoạch (người nhập có settings.manage) ghi ở
// `group_key` của dòng (`cfg:<version>`) — tệp không mang phiên bản. Ghi = MỘT `ticket_categories.replace {labels, if_version}` dưới quyền
// HIỆN TẠI của người nhập, khoá idempotency theo kế hoạch + phiên bản kế hoạch; cấu hình đã đổi sau khi lập → 409 STALE_VERSION, phải lập lại.
import type { TenantDb } from '@appchat/db';
import { AppError, CATEGORY_CONFIG_KEY, CATEGORY_LABELS_MAX, diffCategoryLabels, normalizeCategoryLabel, validateCategoryLabels } from '@appchat/shared';
import type { ActionPreview } from '@appchat/actions';
import type { TenantTx } from '../../kernel/actions/action-context';
import { readCategoryConfig } from '../../support/public';
import type { CheckedRow } from '../services/validation';
import type { Classifier, RowCheck, WholeCommit } from './types';

const CFG = /^cfg:(\d{1,9})$/;
/** Tệp xuất (`ticket_categories.export`) thêm một `'` trước nhãn bắt đầu bằng = + - @ ' (chống công thức) — nhập lại bỏ đúng một dấu đó. */
const unescape = (s: string) => (/^'[=+\-@']/.test(s) ? s.slice(1) : s);

type Row = { rowNo: number; data: Record<string, string> };
const position = (r: Row) => (r.data.position ? Number(r.data.position) : r.rowNo);
const ordered = <T extends Row>(rows: T[]) => [...rows].sort((a, b) => position(a) - position(b) || a.rowNo - b.rowNo);

/** Vị trí: có cột → mọi dòng phải có, nguyên dương, duy nhất, trong 1..N (liền khúc). */
function checkPositions(rows: CheckedRow[]) {
  if (!rows.some((r) => r.data.position || r.errors.position)) return;
  const seen = new Set<number>();
  for (const r of [...rows].sort((a, b) => a.rowNo - b.rowNo)) {
    if (r.errors.position) continue;
    const raw = r.data.position;
    const p = Number(raw);
    if (!raw) r.errors.position = 'required';
    else if (!/^\d+$/.test(raw) || p < 1) r.errors.position = 'invalid';
    else if (p > rows.length) r.errors.position = 'out_of_range';
    else if (seen.has(p)) r.errors.position = 'duplicate';
    seen.add(p);
  }
}

export const classifyCategories: Classifier = async (tx, _who, rows) => {
  const cfg = await readCategoryConfig(tx);
  for (const r of rows) {
    if (r.data.label !== undefined) r.data.label = normalizeCategoryLabel(unescape(r.data.label));
    r.groupKey = `cfg:${cfg.version}`;
  }
  checkPositions(rows);
  const list = ordered(rows.filter((r) => !r.errors.label && r.data.label !== undefined));
  const v = validateCategoryLabels(list.map((r) => r.data.label!));
  for (const e of v.errors) list[e.index]!.errors.label = e.code;
  list.slice(CATEGORY_LABELS_MAX).forEach((r) => (r.errors.label ??= 'too_many'));
  return rows.map((): RowCheck => 'valid');
};

type Pending = { id: string; rowNo: number; groupKey: string | null; data: unknown };

async function pendingRows(db: Pick<TenantDb, 'transferRow'> | TenantTx, planId: string) {
  const rows = (await db.transferRow.findMany({
    where: { planId, check: 'valid', status: 'pending' },
    select: { id: true, rowNo: true, groupKey: true, data: true },
  })) as Pending[];
  const list = ordered(rows.map((r) => ({ ...r, data: r.data as Record<string, string> })));
  const m = CFG.exec(list[0]?.groupKey ?? '');
  if (!m || list.some((r) => r.groupKey !== list[0]!.groupKey)) throw new AppError('CONFLICT', 409, { plan: 'stale' });
  return { labels: list.map((r) => r.data.label!), version: Number(m[1]) };
}

/** Xem trước của transfer.commit: cả bộ trước / sau + thêm / bớt / đổi mặc định; cấu hình đã đổi sau khi lập kế hoạch → 409. */
export async function categoryCommitPreview(tx: TenantTx, planId: string): Promise<Pick<ActionPreview, 'count' | 'changes' | 'warnings'>> {
  const next = await pendingRows(tx, planId);
  const cur = await readCategoryConfig(tx);
  if (cur.version !== next.version) throw new AppError('STALE_VERSION', 409, { version: String(cur.version) });
  const d = diffCategoryLabels(cur.labels, next.labels);
  return {
    count: next.labels.length,
    changes: [
      {
        entity: 'ticket_category_config',
        id: CATEGORY_CONFIG_KEY,
        before: { labels: cur.labels, default: cur.labels[0] ?? '', version: cur.version },
        after: { labels: next.labels, default: next.labels[0], added: d.added, removed: d.removed, reordered: d.reordered, default_changed: d.default_changed },
      },
    ],
    warnings: ['existing_tickets_unchanged'],
  };
}

const errCode = (e: unknown) => {
  const x = e as { code?: string; fields?: Record<string, unknown> };
  return (x.code ? `${x.code}${x.fields ? `:${Object.keys(x.fields).join(',')}` : ''}` : 'error').slice(0, 200);
};

/** Ghi cả bộ: MỘT lệnh replace; biên nhận mọi dòng = action_log của lệnh đó (hoàn tác 24h theo luật của action). Lỗi → mọi dòng failed. */
export const commitCategories: WholeCommit = async ({ db, plan, ctx, executor, now }) => {
  const t = now();
  try {
    const next = await pendingRows(db, plan.id);
    const out = await executor.execute<{ version: number }>(ctx, 'ticket_categories.replace', { labels: next.labels, if_version: next.version });
    if (out.status !== 200) throw new AppError('CONFLICT', 409, { status: String((out.data as { status?: string }).status ?? out.status) });
    await db.transferRow.updateMany({
      where: { planId: plan.id, status: 'pending', check: 'valid' },
      data: { status: 'applied', resultId: out.data.action_log_id, resultCode: `v${out.data.result.version}`, updatedAt: t },
    });
  } catch (e) {
    await db.transferRow.updateMany({ where: { planId: plan.id, status: 'pending' }, data: { status: 'failed', error: errCode(e), updatedAt: t } });
  }
};
