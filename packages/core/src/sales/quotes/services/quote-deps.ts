// Phụ thuộc dùng chung của handler báo giá cần ngoài transaction (render PDF, giờ workspace, link). Một provider cho cả domain.
import type { PlatformDb, TenantDbResolver } from '@appchat/db';
import { AppError } from '@appchat/shared';
import type { FilesService } from '../../../kernel/files/files.service';
import type { CrmMembers } from '../../../crm/public';
import type { DocRenderer } from '../../../documents/public';
import type { QuoteDocDeps } from './quote-doc';
import type { QuoteEnv } from './quote-env';

export class QuoteDeps {
  constructor(
    readonly tenants: TenantDbResolver | null,
    readonly platform: Pick<PlatformDb, 'businessProfile' | 'workspace' | 'user' | 'commerceLink'> | null,
    readonly renderer: DocRenderer | null,
    readonly files: FilesService | null,
    readonly env: QuoteEnv | null,
    readonly members: CrmMembers,
  ) {}

  need<K extends 'tenants' | 'platform' | 'env'>(k: K): NonNullable<this[K]> {
    const v = this[k];
    if (!v) throw new AppError('NOT_IMPLEMENTED', 501, { tip: '029' }, `${k} chưa cấu hình`);
    return v as NonNullable<this[K]>;
  }

  /** Múi giờ + locale của workspace (hạn hiệu lực theo giờ workspace). */
  async place(ws: string): Promise<{ timeZone: string; locale: string }> {
    const w = this.platform ? await this.platform.workspace.findUnique({ where: { id: ws }, select: { timezone: true, locale: true } }) : null;
    return { timeZone: w?.timezone ?? 'Asia/Ho_Chi_Minh', locale: w?.locale ?? 'vi' };
  }

  /** Locale người xem (hồ sơ) → mặc định của workspace. */
  async viewerPlace(ws: string, userId: string): Promise<{ timeZone: string; locale: string }> {
    const [p, u] = await Promise.all([this.place(ws), this.platform?.user.findUnique({ where: { id: userId }, select: { locale: true } }) ?? null]);
    return { timeZone: p.timeZone, locale: u?.locale ?? p.locale };
  }

  doc(): QuoteDocDeps {
    return {
      platform: this.need('platform'),
      renderer: this.renderer,
      files: this.files,
      ownerName: async (id) => (id ? ((await this.members.names([id])).get(id) ?? '') : ''),
    };
  }
}
