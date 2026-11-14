// Trang xem / tải chứng từ công khai (TIP-032b P2): `/v1/public/documents/:token` + `/pdf`. Thứ tự kiểm: chữ ký HMAC (không chạm DB) →
// rate limit theo token + IP → `commerce_link` theo băm (đúng workspace, chưa thu hồi / hết hạn) → DB tenant qua TenantDbResolver → chứng
// từ còn sống (chưa xoá / huỷ) và tệp đóng băng đúng `file_id` đã gửi. Mọi lỗi → 410 `SIGN_LINK_INVALID` một kiểu (không lộ lý do,
// storage key hay chứng từ khác). Chỉ trả: loại, mã, tên doanh nghiệp, tên tệp, hạn link — không ghi chú nội bộ / người phụ trách.
import type { PlatformDb, TenantDb, TenantDbResolver } from '@appchat/db';
import { TenantContexts } from '@appchat/db';
import { AppError, type PublicDocumentView } from '@appchat/shared';
import type { FilesService } from '../../kernel/files/files.service';
import type { RateLimiter } from '../../kernel/rate-limit';
import type { DocumentKind } from './document-link';
import { docTokenHash, readDocToken } from './public-token';

export interface PublicDocumentDeps {
  tenants: TenantDbResolver | null;
  platform: Pick<PlatformDb, 'commerceLink' | 'businessProfile' | 'workspace'> | null;
  files: FilesService | null;
  key: Buffer | null;
  limiter: RateLimiter | null;
  now: () => Date;
}

const invalid = () => new AppError('SIGN_LINK_INVALID', 410, { token: 'invalid' });
const RULE = { name: 'doc:public', limit: 60, windowMs: 60_000 };

type Link = { workspaceId: string; documentKind: string; documentId: string; version: number; fileId: string; expiresAt: Date };

/** Chứng từ còn sống + mã hiển thị. Đã xoá / huỷ → null (link hết hiệu lực). */
async function documentOf(db: TenantDb, l: Link): Promise<{ code: string } | null> {
  const id = l.documentId;
  switch (l.documentKind as DocumentKind) {
    case 'quote': {
      const q = await db.quote.findUnique({ where: { id }, select: { code: true, deletedAt: true, fileId: true, sentAt: true } });
      return q && !q.deletedAt && q.sentAt && q.fileId === l.fileId ? { code: q.code } : null;
    }
    case 'payment_request': {
      const i = await db.invoice.findUnique({ where: { id }, select: { code: true, status: true, fileId: true } });
      return i && i.status !== 'void' && i.fileId === l.fileId ? { code: i.code } : null;
    }
    case 'contract': {
      const c = await db.contract.findUnique({ where: { id }, select: { code: true, deletedAt: true } });
      return c && !c.deletedAt ? { code: c.code } : null;
    }
    case 'order_confirmation': {
      const o = await db.order.findUnique({ where: { id }, select: { code: true, deletedAt: true } });
      return o && !o.deletedAt ? { code: o.code } : null;
    }
    case 'receipt': {
      const p = await db.customerPayment.findUnique({ where: { id }, select: { receiptCode: true, receiptFileId: true } });
      return p?.receiptCode && p.receiptFileId === l.fileId ? { code: p.receiptCode } : null;
    }
    default:
      return null;
  }
}

export class PublicDocumentService {
  constructor(private readonly d: PublicDocumentDeps) {}

  private async resolve(token: string, ip: string | null) {
    const { key, platform, tenants } = this.d;
    if (!key || !platform || !tenants) throw new AppError('NOT_IMPLEMENTED', 501, { tip: '032b' });
    const raw = token.slice(0, 120);
    if (!readDocToken(key, raw)) throw invalid();
    const hash = docTokenHash(raw);
    if (this.d.limiter) {
      await this.d.limiter.hit(RULE, hash.slice(0, 24));
      if (ip) await this.d.limiter.hit({ ...RULE, name: `${RULE.name}:ip`, limit: RULE.limit * 4 }, docTokenHash(ip).slice(0, 24));
    }
    const l = await platform.commerceLink.findUnique({ where: { tokenHash: hash } });
    if (!l || l.revokedAt || l.expiresAt <= this.d.now()) throw invalid();
    const ws = await platform.workspace.findUnique({ where: { id: l.workspaceId }, select: { status: true } });
    if (!ws || ws.status !== 'active') throw invalid();
    const db = await tenants.get(TenantContexts.system(l.workspaceId, 'document.public'));
    const doc = await documentOf(db, l);
    if (!doc) throw invalid();
    return { l, db, doc };
  }

  async view(token: string, ip: string | null): Promise<PublicDocumentView> {
    const { l, db, doc } = await this.resolve(token, ip);
    const [f, bp] = await Promise.all([
      db.file.findUnique({ where: { id: l.fileId }, select: { name: true } }),
      this.d.platform!.businessProfile.findUnique({ where: { workspaceId: l.workspaceId }, select: { legalName: true } }),
    ]);
    if (!f) throw invalid();
    return { kind: l.documentKind as DocumentKind, code: doc.code, version: l.version, business: bp?.legalName ?? '', file_name: f.name, expires_at: l.expiresAt.toISOString() };
  }

  async file(token: string, ip: string | null): Promise<{ name: string; body: Buffer }> {
    const { l, db } = await this.resolve(token, ip);
    const f = this.d.files ? await this.d.files.read(db, l.fileId) : null;
    if (!f || f.row.mime !== 'application/pdf') throw invalid();
    return { name: f.row.name, body: f.body };
  }
}
