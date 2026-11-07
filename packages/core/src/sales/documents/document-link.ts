// Phát link công khai cho chứng từ đã đóng băng (TIP-032b P2 — webchat gửi link xem + tải PDF; mọi kênh kèm được). Gọi SAU khi tệp tenant
// đã lưu (artifact bền), TRƯỚC khi ghi tin: ghi platform lỗi → ném, action không ghi tin / không đẩy hàng gửi (không phát link chưa định
// tuyến). Gửi lại cùng chứng từ → thu hồi link cũ (revoked_at). Hạn mặc định 30 ngày (báo giá: tới hết hạn hiệu lực + 30 ngày).
import type { PlatformDb } from '@appchat/db';
import type { PUBLIC_DOCUMENT_KINDS } from '@appchat/shared';
import { uuidv7 } from '../../kernel/ids';
import { docToken, docTokenHash, documentUrl } from './public-token';

export type DocumentKind = (typeof PUBLIC_DOCUMENT_KINDS)[number];

export const LINK_DAYS = 30;
const DAY = 24 * 3600_000;

export interface IssueLink {
  ws: string;
  kind: DocumentKind;
  documentId: string;
  version: number;
  fileId: string;
  now: Date;
  /** Hạn riêng (vd báo giá: hết hiệu lực + 30 ngày); mặc định now + 30 ngày. */
  expiresAt?: Date;
}

export async function issueDocumentLink(platform: Pick<PlatformDb, 'commerceLink'>, env: { key: Buffer; appBase: string }, o: IssueLink) {
  const id = uuidv7(o.now.getTime());
  const token = docToken(env.key, id);
  const expiresAt = o.expiresAt ?? new Date(o.now.getTime() + LINK_DAYS * DAY);
  await platform.commerceLink.updateMany({
    where: { workspaceId: o.ws, documentKind: o.kind, documentId: o.documentId, revokedAt: null },
    data: { revokedAt: o.now },
  });
  await platform.commerceLink.create({
    data: { tokenHash: docTokenHash(token), workspaceId: o.ws, documentKind: o.kind, documentId: o.documentId, version: o.version, fileId: o.fileId, purpose: 'view', expiresAt, createdAt: o.now },
  });
  return { url: documentUrl(env.appBase, token), expiresAt };
}
