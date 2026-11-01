// Phụ thuộc dùng chung của domain hợp đồng cần ngoài transaction: render PDF (DocRenderer — TIP-028), tệp, giờ workspace, link ký,
// gửi OTP qua email (MailProvider), Redis (rate limit trang ký + đánh dấu outbox khi khách ký — endpoint công khai không qua executor).
import type { PlatformDb, TenantDbResolver } from '@appchat/db';
import { AppError } from '@appchat/shared';
import type { MailMessage, MailProvider } from '@appchat/integrations';
import type { FilesService } from '../../kernel/files/files.service';
import type { RateLimiter } from '../../kernel/rate-limit';
import type { KeyValueStore } from '../../kernel/redis';
import type { CrmMembers } from '../../crm/public';
import type { DocRenderer } from '../../documents/public';

export interface ContractEnv {
  /** Origin web (APP_PUBLIC_URL) — trang ký `/sign/<token>`. */
  appBase: string;
  /** Origin API — link tệp PDF ký gửi kèm tin. */
  apiBase: string;
  key: Buffer;
}

export function contractEnvFor(src: Record<string, string | undefined>, key: Buffer | undefined, apiBase: string): ContractEnv | null {
  if (!key) return null;
  return { appBase: (src.APP_PUBLIC_URL ?? 'http://localhost:3000').replace(/\/$/, ''), apiBase, key };
}

export class ContractDeps {
  constructor(
    readonly tenants: TenantDbResolver | null,
    readonly platform: Pick<PlatformDb, 'businessProfile' | 'workspace' | 'user' | 'tenantSignRoute'> | null,
    readonly renderer: DocRenderer | null,
    readonly files: FilesService | null,
    readonly env: ContractEnv | null,
    readonly members: CrmMembers,
    readonly mail: MailProvider | null,
    readonly limiter: RateLimiter | null,
    readonly kv: KeyValueStore | null,
  ) {}

  need<K extends 'tenants' | 'platform' | 'env' | 'files'>(k: K): NonNullable<this[K]> {
    const v = this[k];
    if (!v) throw new AppError('NOT_IMPLEMENTED', 501, { tip: '030' }, `${k} chưa cấu hình`);
    return v as NonNullable<this[K]>;
  }

  async place(ws: string): Promise<{ timeZone: string; locale: string; name: string }> {
    const w = this.platform ? await this.platform.workspace.findUnique({ where: { id: ws }, select: { timezone: true, locale: true, name: true } }) : null;
    return { timeZone: w?.timezone ?? 'Asia/Ho_Chi_Minh', locale: w?.locale ?? 'vi', name: w?.name ?? '' };
  }

  async viewerPlace(ws: string, userId: string): Promise<{ timeZone: string; locale: string }> {
    const [p, u] = await Promise.all([this.place(ws), this.platform?.user.findUnique({ where: { id: userId }, select: { locale: true } }) ?? null]);
    return { timeZone: p.timeZone, locale: u?.locale ?? p.locale };
  }

  /** Email của người dùng nền tảng (OTP Owner). */
  async userEmail(userId: string): Promise<string | null> {
    const u = await this.platform?.user.findUnique({ where: { id: userId }, select: { email: true } });
    return u?.email ?? null;
  }

  async sendMail(m: MailMessage): Promise<void> {
    if (!this.mail) throw new AppError('NOT_IMPLEMENTED', 501, { connector: 'mail' });
    await this.mail.send(m);
  }

  ownerName = async (id: string | null) => (id ? ((await this.members.names([id])).get(id) ?? '') : '');
}
