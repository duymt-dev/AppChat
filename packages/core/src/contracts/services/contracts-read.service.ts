// Đọc domain hợp đồng cho apps/api (Blueprint §4.4 contracts — shape packages/shared/src/api/contracts.ts): danh sách D42 (page +
// limit, deferred join), chi tiết, meta (KPI + chip + panel AI; kèm `contract_id` → thẻ CRM / nhận định / tệp của hợp đồng đó), PDF
// (bản đã ký → bản đóng băng lúc Duyệt & ký → render nháp theo mẫu), gửi OTP "Duyệt & ký" cho người ký phía DN.
import { TenantContexts } from '@appchat/db';
import type { AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { UUID, visibleContract } from '../contract-access';
import { listContractIds, type ContractFilter } from '../repos/contracts.repo';
import type { ContractDeps } from './contract-deps';
import { renderContractPdf } from './contract-doc';
import { signingContent } from '../files/source';
import { listContractFiles, readContractFile } from '../files/read';
import { contractInsights, contractKpis, contractRuns } from './contract-insights';
import { sendOwnerOtp } from './contract-system';
import { contactsOf, extrasOf, toContractRow, type ViewCtx } from './contract-view';

export interface ContractViewer {
  workspaceId: string;
  userId: string;
  authz: AuthzContext;
}

const MAX_LIMIT = 100;

export class ContractsReadService {
  constructor(
    private readonly d: ContractDeps,
    private readonly now: () => Date,
  ) {}

  private async db(v: ContractViewer) {
    return this.d.need('tenants').get(TenantContexts.fromMembership(v.workspaceId, v.userId));
  }

  private async tx<T>(v: ContractViewer, fn: (tx: TenantTx) => Promise<T>): Promise<T> {
    return (await this.db(v)).$transaction(fn);
  }

  private async base(v: ContractViewer) {
    return { ...(await this.d.viewerPlace(v.workspaceId, v.userId)), now: this.now() };
  }

  /** Bước 2 deferred join: đủ cột + khách + nhật ký + link cho đúng các id, giữ thứ tự bước 1. */
  private async rowsOf(tx: TenantTx, ids: string[], base: Omit<ViewCtx, 'names'>) {
    if (!ids.length) return [];
    const rows = await tx.contract.findMany({ where: { id: { in: ids } } });
    const order = new Map(ids.map((id, i) => [id, i]));
    rows.sort((a, b) => order.get(a.id)! - order.get(b.id)!);
    const [contacts, x] = await Promise.all([contactsOf(tx, rows.map((r) => r.contactId)), extrasOf(tx, rows, this.d, base.now)]);
    const names = await this.d.members.names(rows.map((r) => r.ownerUserId));
    const ctx: ViewCtx = { ...base, names };
    return rows.map((c) => toContractRow(c, { contact: contacts.get(c.contactId), events: x.ev.get(c.id) ?? [], token: x.tok.get(c.id) ?? null, quoteCode: (c.quoteId && x.qc.get(c.quoteId)) || '' }, ctx));
  }

  async list(v: ContractViewer, f: ContractFilter, page?: number, limit?: number) {
    const lim = Math.min(MAX_LIMIT, Math.max(1, limit ?? 20));
    const paged = page !== undefined;
    const pg = Math.max(1, page ?? 1);
    const base = await this.base(v);
    return this.tx(v, async (tx) => {
      const { ids, total } = await listContractIds(tx, v.authz, f, paged ? { offset: (pg - 1) * lim, limit: lim } : null);
      const data = await this.rowsOf(tx, ids, base);
      const pages = Math.max(1, Math.ceil(total / lim));
      return { data, next_cursor: paged && pg < pages ? String(pg + 1) : null, meta: { total, page: paged ? pg : 1, limit: paged ? lim : data.length } };
    });
  }

  async get(v: ContractViewer, id: string) {
    const base = await this.base(v);
    return this.tx(v, async (tx) => (await this.rowsOf(tx, [(await visibleContract(tx, v.authz, id)).id], base))[0]!);
  }

  async meta(v: ContractViewer, contractId?: string) {
    const base = await this.base(v);
    return this.tx(v, async (tx) => {
      const k = await contractKpis(tx, v.authz);
      const runs = await contractRuns(tx, v.authz, k, base);
      const empty = { crm: { ltv: '0', total: 0, tier: '', debt: '0', others: [] }, insight: '', suggestions: [] as string[], files: [] as never[] };
      if (!contractId || !UUID.test(contractId)) return { counts: k.counts, stats: k.stats, ...empty, ai_runs: runs };
      const c = await visibleContract(tx, v.authz, contractId);
      const names = await this.d.members.names([c.ownerUserId]);
      return { counts: k.counts, stats: k.stats, ...(await contractInsights(tx, v.authz, c, base, names)), ai_runs: runs };
    });
  }

  /** PDF: bản đã ký → bản đóng băng lúc Duyệt & ký → render nháp theo mẫu hiện tại. */
  async pdf(v: ContractViewer, id: string): Promise<{ name: string; pdf: Buffer }> {
    const db = await this.db(v);
    const c = await db.$transaction((tx) => visibleContract(tx, v.authz, id));
    const fid = c.signedFileId ?? c.fileId;
    if (fid && this.d.files) {
      const f = await this.d.files.read(db, fid);
      if (f) return { name: f.row.name, pdf: f.body };
    }
    // Nguồn tệp chưa duyệt: PDF gốc / bản DOCX đã đổi cô lập (không bao giờ rơi về render theo mẫu).
    if (c.source === 'file' && this.d.files) return { name: `${c.code}.pdf`, pdf: (await signingContent(db, this.d.files, this.d.isolated, c)).pdf };
    const r = await renderContractPdf(db, this.d, v.workspaceId, c);
    return { name: `${c.code}.pdf`, pdf: r.pdf };
  }

  /** Tệp của hợp đồng theo vai trò (TIP-030b spec 17). */
  async files(v: ContractViewer, id: string) {
    const db = await this.db(v);
    const c = await db.$transaction((tx) => visibleContract(tx, v.authz, id));
    return listContractFiles(db, c, (ids) => this.d.members.names(ids));
  }

  /** Tải một tệp của hợp đồng — kiểm lại scope + tệp thuộc hợp đồng. */
  async file(v: ContractViewer, id: string, fileId: string) {
    const db = await this.db(v);
    const c = await db.$transaction((tx) => visibleContract(tx, v.authz, id));
    return readContractFile(db, this.d.need('files'), c, fileId);
  }

  /** OTP "Duyệt & ký" tới email của người ký (cần `contract.sign`, controller kiểm). */
  async ownerOtp(v: ContractViewer, id: string): Promise<{ sent_to: string }> {
    const db = await this.db(v);
    const c = await db.$transaction((tx) => visibleContract(tx, v.authz, id));
    const name = (await this.d.members.names([v.userId])).get(v.userId) ?? '';
    return { sent_to: await sendOwnerOtp(this.d, db, v.workspaceId, c, { id: v.userId, name }, this.now()) };
  }
}
