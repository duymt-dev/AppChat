// Link ký phụ lục (TIP-030b F3 spec 14–15): token = `<id>.<HMAC(APP_ENC_KEY, "appendix:<id>") base64url 32>` — khác miền ký của link hợp
// đồng cha ("sign:<id>") nên token hợp đồng cha không đọc được ở đây và ngược lại. DB tenant lưu `token_hash`; định tuyến workspace dùng
// chung `tenant_sign_route` (khoá = hash). Token gắn phụ lục + version + digest + người ký; phát link mới vô hiệu link cũ.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { dayEndAfter } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { uuidv7 } from '../../kernel/ids';
import type { ContractDeps } from '../services/contract-deps';
import { sha256Hex } from '../services/sign-link';

const SIG_LEN = 32;
const sig = (key: Buffer, id: string) => createHmac('sha256', key).update(`appendix:${id}`).digest('base64url').slice(0, SIG_LEN);

export const appendixToken = (key: Buffer, tokenId: string) => `${tokenId}.${sig(key, tokenId)}`;

/** Kiểm chữ ký token phụ lục → id bản ghi token (null = giả / token hợp đồng cha / sai khoá). */
export function readAppendixToken(key: Buffer, token: string): string | null {
  const m = /^([0-9a-f-]{36})\.([A-Za-z0-9_-]{32})$/.exec(token);
  if (!m) return null;
  const want = Buffer.from(sig(key, m[1]!));
  const got = Buffer.from(m[2]!);
  return want.length === got.length && timingSafeEqual(want, got) ? m[1]! : null;
}

export const appendixSignUrl = (appBase: string, token: string) => `${appBase}/sign/appendix/${token}`;

export interface IssuedAppendixLink {
  tokenId: string;
  token: string;
  tokenHash: string;
  url: string;
  expiresAt: Date;
}

/** Sinh token + định tuyến nền tảng (ngoài transaction tenant — route mồ côi vô hại, tự hết hạn). */
export async function issueAppendixLink(d: ContractDeps, ws: string, days: number, now: Date): Promise<IssuedAppendixLink> {
  const env = d.need('env');
  const { timeZone } = await d.place(ws);
  const tokenId = uuidv7(now.getTime());
  const token = appendixToken(env.key, tokenId);
  const tokenHash = sha256Hex(token);
  const expiresAt = dayEndAfter(now, days, timeZone);
  await d.need('platform').tenantSignRoute.create({ data: { tokenHash, workspaceId: ws, expiresAt } });
  return { tokenId, token, tokenHash, url: appendixSignUrl(env.appBase, token), expiresAt };
}

/** Ghi token (trong transaction action) gắn version + digest hiện tại; vô hiệu link cũ của phụ lục. */
export async function saveAppendixLink(tx: TenantTx, a: { id: string; version: number; fileSha256: string }, signerId: string, l: IssuedAppendixLink, now: Date) {
  await tx.appendixSignToken.updateMany({ where: { appendixId: a.id, usedAt: null }, data: { usedAt: now } });
  await tx.appendixSignToken.create({ data: { id: l.tokenId, tokenHash: l.tokenHash, appendixId: a.id, appendixVersion: a.version, documentHash: a.fileSha256, signerId, expiresAt: l.expiresAt, createdAt: now } });
}
