// Phần DB tenant mà đường đo usage AI dùng (TIP-019b) — tách riêng để run.store / settlement / recovery không import lẫn nhau.
import type { TenantDb } from '@appchat/db';

export type MeteredDb = Pick<TenantDb, 'aiRun' | 'aiRootBudget' | 'aiUsageGroup' | 'aiUsageReceipt' | 'aiUsageSettlement' | '$executeRaw' | '$transaction'>;
