// Phát / thay link ký của khách (COMMERCE §9: một lần, hết hạn 7 ngày, gia hạn được). Bản ghi `contract_sign_token` ở DB tenant
// (hash token), định tuyến hash → workspace ở DB nền tảng `tenant_sign_route` (trang công khai chưa biết workspace). Route ghi
// TRƯỚC transaction action (`prepare`) — action lỗi để lại route mồ côi vô hại (không có token tenant khớp, hết hạn tự dọn).
// Link cũ bị vô hiệu khi phát link mới (used_at). Hạn link = cuối ngày (hôm nay + N) theo giờ workspace (money-time-numbering §2).
import { dayEndAfter } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { uuidv7 } from '../../kernel/ids';
import type { ContractDeps } from './contract-deps';
import { sha256Hex, signToken, signUrl } from './sign-link';

export interface IssuedLink {
  tokenId: string;
  token: string;
  tokenHash: string;
  url: string;
  expiresAt: Date;
}

/** Sinh token + ghi định tuyến nền tảng (ngoài transaction tenant). */
export async function issueLink(d: ContractDeps, ws: string, days: number, now: Date): Promise<IssuedLink> {
  const env = d.need('env');
  const { timeZone } = await d.place(ws);
  const tokenId = uuidv7(now.getTime());
  const token = signToken(env.key, tokenId);
  const tokenHash = sha256Hex(token);
  const expiresAt = dayEndAfter(now, days, timeZone);
  await d.need('platform').tenantSignRoute.create({ data: { tokenHash, workspaceId: ws, expiresAt } });
  return { tokenId, token, tokenHash, url: signUrl(env.appBase, token), expiresAt };
}

/** Ghi token vào DB tenant (trong transaction action), vô hiệu link cũ của hợp đồng. */
export async function saveLink(tx: TenantTx, contractId: string, signerId: string, l: IssuedLink, now: Date) {
  await tx.contractSignToken.updateMany({ where: { contractId, usedAt: null }, data: { usedAt: now } });
  await tx.contractSignToken.create({ data: { id: l.tokenId, tokenHash: l.tokenHash, contractId, signerId, expiresAt: l.expiresAt, createdAt: now } });
}

/** Token đang hiệu lực của hợp đồng (người nội bộ sao chép link) — đọc lại được từ id bản ghi. */
export async function liveToken(tx: Pick<TenantTx, 'contractSignToken'>, d: ContractDeps, contractId: string, now: Date): Promise<{ token: string; expiresAt: Date } | null> {
  if (!d.env) return null;
  const t = await tx.contractSignToken.findFirst({ where: { contractId, usedAt: null, expiresAt: { gt: now } }, orderBy: { createdAt: 'desc' } });
  return t ? { token: signToken(d.env.key, t.id), expiresAt: t.expiresAt } : null;
}
