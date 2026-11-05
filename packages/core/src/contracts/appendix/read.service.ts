// Đọc phụ lục cho apps/api (TIP-030b F3 spec 17–18): `GET /v1/contracts/:id/appendices` — kiểm scope hợp đồng cha hiện hành (không thấy →
// 404), trang id theo index (contract_id, created_at DESC, id DESC) rồi join thân rộng (deferred join, limit ≤ 50); kèm nhật ký ký của
// đúng phụ lục. PDF: `GET /v1/contracts/:id/appendices/:aid/pdf` — bản đã ký → bản đóng băng; phụ lục phải thuộc đúng hợp đồng.
import { TenantContexts, TenantSql as Prisma } from '@appchat/db';
import { AppError, type Appendix } from '@appchat/shared';
import { UUID, visibleContract } from '../contract-access';
import type { ContractDeps } from '../services/contract-deps';
import type { ContractViewer } from '../services/contracts-read.service';

export const APPENDIX_PAGE = 50;

const iso = (d: Date | null) => d?.toISOString() ?? null;

export class AppendixReadService {
  constructor(private readonly d: ContractDeps) {}

  private db(v: ContractViewer) {
    return this.d.need('tenants').get(TenantContexts.fromMembership(v.workspaceId, v.userId));
  }

  async list(v: ContractViewer, contractId: string): Promise<Appendix[]> {
    const db = await this.db(v);
    return db.$transaction(async (tx) => {
      const c = await visibleContract(tx, v.authz, contractId);
      const ids = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT id FROM contract_appendix WHERE contract_id = ${c.id}::uuid ORDER BY created_at DESC, id DESC LIMIT ${APPENDIX_PAGE}`);
      if (!ids.length) return [];
      const rows = await tx.contractAppendix.findMany({ where: { id: { in: ids.map((r) => r.id) } } });
      const events = await tx.appendixSignatureEvent.findMany({ where: { appendixId: { in: ids.map((r) => r.id) } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: 50 * ids.length });
      const files = await tx.file.findMany({ where: { id: { in: rows.map((r) => r.sourceFileId).filter((x): x is string => !!x) } }, select: { id: true, name: true } });
      const name = new Map(files.map((f) => [f.id, f.name]));
      const byId = new Map(rows.map((r) => [r.id, r]));
      return ids.map(({ id }) => {
        const a = byId.get(id)!;
        return {
          id: a.id,
          contract_id: a.contractId,
          code: a.code,
          seq: a.seq,
          title: a.title,
          content: a.bodyHtml,
          status: a.status,
          version: a.version,
          value_delta: a.valueDelta === null ? null : String(a.valueDelta),
          source: a.source,
          source_name: a.sourceFileId ? (name.get(a.sourceFileId) ?? null) : null,
          note: a.note,
          sent_channel: a.sentChannel,
          sign_link_expires_at: iso(a.signLinkExpiresAt),
          signed_by_business_at: iso(a.signedByBusinessAt),
          signed_by_customer_at: iso(a.signedByCustomerAt),
          file_sha256: a.fileSha256,
          signed_sha256: a.signedSha256,
          pdf: !!(a.signedFileId ?? a.fileId),
          declined_reason: a.declinedReason,
          created_at: a.createdAt.toISOString(),
          events: events.filter((e) => e.appendixId === a.id).map((e) => ({ type: e.type, at: e.createdAt.toISOString(), actor: e.actorName, party: e.party, version: e.appendixVersion, doc_sha256: e.docSha256 })),
        };
      });
    });
  }

  async pdf(v: ContractViewer, contractId: string, appendixId: string): Promise<{ name: string; pdf: Buffer }> {
    const db = await this.db(v);
    const a = await db.$transaction(async (tx) => {
      const c = await visibleContract(tx, v.authz, contractId);
      const row = UUID.test(appendixId) ? await tx.contractAppendix.findUnique({ where: { id: appendixId } }) : null;
      if (!row || row.contractId !== c.id) throw new AppError('NOT_FOUND', 404, { appendix_id: 'not_found' });
      return row;
    });
    const id = a.signedFileId ?? a.fileId;
    const f = id ? await this.d.need('files').read(db, id) : null;
    if (!f) throw new AppError('NOT_FOUND', 404, { file: 'not_ready' });
    return { name: f.row.name, pdf: f.body };
  }
}
