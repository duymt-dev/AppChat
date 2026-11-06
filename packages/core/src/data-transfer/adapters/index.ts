// Bảng adapter theo thực thể (TIP-038b): phân loại + chia đơn vị ghi + ghép kết quả. Thực thể chưa nối nhập không có ở đây — registry
// `importReady: false` chặn trước (422 `entity: unsupported`).
import { AppError, type TransferEntity } from '@appchat/shared';
import { classifyProducts, commitProducts } from './catalog';
import { classifyDocs, docResolve, docUnits } from './commerce';
import { classifyContacts, contactUnits, resolveContacts } from './contacts';
import type { Adapter, Classifier } from './types';

export type { Importer, RowCheck } from './types';

const doc = (e: TransferEntity, grouped = false): Adapter => ({
  classify: classifyDocs(e),
  batch: 50,
  grouped,
  units: docUnits(e),
  resolve: docResolve(e),
});

const ADAPTERS: Record<TransferEntity, Adapter> = {
  contact: { classify: classifyContacts, batch: 500, units: contactUnits, resolve: resolveContacts },
  product: { classify: classifyProducts, batch: 1, whole: commitProducts },
  quote: doc('quote', true),
  order: doc('order', true),
  contract: doc('contract'),
  invoice: doc('invoice'),
};

export function adapterFor(entity: TransferEntity): Adapter {
  const a = ADAPTERS[entity];
  if (!a) throw new AppError('VALIDATION_FAILED', 422, { entity: 'unsupported' });
  return a;
}

export const classifyFor = (entity: TransferEntity): Classifier => adapterFor(entity).classify;
