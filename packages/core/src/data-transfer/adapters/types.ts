// Kiểu dùng chung của adapter nhập theo thực thể (TIP-038b).
import type { TenantTx } from '../../kernel/actions/action-context';
import type { CheckedRow } from '../services/validation';

export type RowCheck = 'valid' | 'invalid' | 'duplicate' | 'owned';
export type Classifier = (tx: TenantTx, actorUserId: string, rows: CheckedRow[]) => Promise<RowCheck[]>;
