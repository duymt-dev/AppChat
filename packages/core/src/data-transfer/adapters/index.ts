// Bảng adapter theo thực thể (TIP-038b): phân loại trùng + dựng input action nghiệp vụ cho một lô dòng. Thực thể chưa nối nhập không có
// ở đây — registry `importReady: false` chặn trước (422 `entity: unsupported`).
import { AppError, type TransferEntity } from '@appchat/shared';
import { classifyContacts, contactImportInput } from './contacts';
import type { Classifier } from './types';

export type { RowCheck } from './types';

interface Adapter {
  classify: Classifier;
  /** Số dòng tối đa một lệnh action (contact.import ≤ 500). */
  batch: number;
  input: (rows: { data: Record<string, string> }[]) => unknown;
}

const ADAPTERS: Partial<Record<TransferEntity, Adapter>> = {
  contact: { classify: classifyContacts, batch: 500, input: contactImportInput },
};

export function adapterFor(entity: TransferEntity): Adapter {
  const a = ADAPTERS[entity];
  if (!a) throw new AppError('VALIDATION_FAILED', 422, { entity: 'unsupported' });
  return a;
}

export const classifyFor = (entity: TransferEntity): Classifier => adapterFor(entity).classify;
