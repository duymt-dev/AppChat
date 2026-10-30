// Mã chứng từ trong transaction tạo bản ghi (money-time-numbering §3): UPDATE … RETURNING khoá dòng tới hết transaction.
import { CODE_START, formatCode, type CodeKind } from '@appchat/shared';
import type { TenantTx } from './actions/action-context';

export async function nextCode(tx: TenantTx, kind: CodeKind): Promise<string> {
  const rows = await tx.$queryRaw<{ value: bigint }[]>`
    INSERT INTO sequence_counter (kind, value) VALUES (${kind}, ${BigInt(CODE_START + 1)})
    ON CONFLICT (kind) DO UPDATE SET value = sequence_counter.value + 1
    RETURNING value`;
  return formatCode(kind, rows[0]!.value);
}
