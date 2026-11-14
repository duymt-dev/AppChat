// Bảng adapter theo thực thể (TIP-038b): phân loại + chia đơn vị ghi + ghép kết quả. Thực thể chưa nối nhập không có ở đây — registry
// `importReady: false` chặn trước (422 `entity: unsupported`); tập chỉ xuất (customer_packages) chặn ở resolveTarget (422 `dataset: export_only`).
import { AppError, type TransferTarget } from '@appchat/shared';
import { activityAdapter } from './activities';
import { classifyProducts, commitProducts } from './catalog';
import { classifyDocs, docResolve, docUnits } from './commerce';
import { classifyContacts, contactUnits, resolveContacts } from './contacts';
import { classifyCategories, commitCategories } from './ticket-categories';
import type { Adapter, Classifier } from './types';

export type { Importer, RowCheck } from './types';

const doc = (e: TransferTarget, grouped = false): Adapter => ({
  classify: classifyDocs(e),
  batch: 50,
  grouped,
  units: docUnits(e),
  resolve: docResolve(e),
});

const ADAPTERS: Partial<Record<TransferTarget, Adapter>> = {
  contact: { classify: classifyContacts, batch: 500, units: contactUnits, resolve: resolveContacts },
  product: { classify: classifyProducts, batch: 1, whole: commitProducts },
  quote: doc('quote', true),
  order: doc('order', true),
  contract: doc('contract'),
  invoice: doc('invoice'),
  // TIP-026b §5 — tập hoạt động CRM dưới khách.
  contact_notes: activityAdapter('contact_notes'),
  contact_tasks: activityAdapter('contact_tasks'),
  contact_opportunities: activityAdapter('contact_opportunities'),
  // TIP-034b §4 — từ điển gợi ý danh mục ticket: cả tệp là MỘT `ticket_categories.replace`.
  ticket_category_suggestions: { classify: classifyCategories, batch: 1, whole: commitCategories },
};

export function adapterFor(entity: TransferTarget): Adapter {
  const a = ADAPTERS[entity];
  if (!a) throw new AppError('VALIDATION_FAILED', 422, { entity: 'unsupported' });
  return a;
}

export const classifyFor = (entity: TransferTarget): Classifier => adapterFor(entity).classify;
