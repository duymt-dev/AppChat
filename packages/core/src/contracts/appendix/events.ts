// Nhật ký ký phụ lục (TIP-030b F3 spec 14): chỉ thêm (trigger chặn sửa / xoá) — mỗi bước ghi version phụ lục + digest + bên ký.
// Nhật ký hợp đồng cha (`contract_signature_event`) không bị ghi hay đổi bởi phụ lục.
import type { TenantTx } from '../../kernel/actions/action-context';
import { uuidv7 } from '../../kernel/ids';

export interface AppendixEventIn {
  appendixId: string;
  version: number;
  type: string;
  actorName: string;
  party?: 'business' | 'customer' | null;
  signerId?: string | null;
  docSha256?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  meta?: Record<string, unknown>;
  at: Date;
}

export async function logAppendixEvent(tx: Pick<TenantTx, 'appendixSignatureEvent'>, e: AppendixEventIn) {
  await tx.appendixSignatureEvent.create({
    data: {
      id: uuidv7(e.at.getTime()),
      appendixId: e.appendixId,
      appendixVersion: e.version,
      signerId: e.signerId ?? null,
      type: e.type,
      party: e.party ?? null,
      actorName: e.actorName.slice(0, 200),
      docSha256: e.docSha256 ?? null,
      ip: e.ip?.slice(0, 64) ?? null,
      userAgent: e.userAgent?.slice(0, 300) ?? null,
      meta: (e.meta ?? {}) as object,
      createdAt: e.at,
    },
  });
}
