// Bảng kiểm pháp lý của hợp đồng trong preview trình duyệt / duyệt & ký / gửi ký (templates.md §6 — Điều 398 BLDS 2015; TIP-028b,
// DC-444): mẫu sẽ render (ghi trên hợp đồng → theo loại → mặc định chung, như renderContractPdf) + dữ liệu thật. Hợp đồng tải tệp lên
// (`source = file`) không có mẫu → không có bảng kiểm. Cảnh báo, không chặn.
import type { ChecklistItem } from '@appchat/actions';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { docChecklist, pickContractTemplate, type ContractKind } from '../../../documents/public';
import type { ContractRecord } from '../../contract-access';
import { contractDocData } from '../../services/contract-doc';
import type { ContractDeps } from '../../services/contract-deps';

export async function contractChecklist(tx: TenantTx, d: ContractDeps, ws: string, c: ContractRecord): Promise<ChecklistItem[] | undefined> {
  if (c.source === 'file') return undefined;
  const id = c.templateId ?? (await pickContractTemplate(tx, c.kind as ContractKind))?.id;
  const t = id ? await tx.docTemplate.findFirst({ where: { id } }) : null;
  return t ? docChecklist(t, async () => (await contractDocData(tx, d, ws, c)).data) : undefined;
}
