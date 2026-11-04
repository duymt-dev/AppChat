// Thư mời là hiệu ứng ngoài của thao tác `member.invite` (TIP-045b annex A1): không gửi trong transaction nền tảng nữa — token mời chỉ
// nằm trong payload `platform_effect` (mã hoá AES-GCM, hạn = hạn lời mời), gửi SAU commit; gửi lại không sinh lời mời / token mới.
// Người gửi đăng ký một lần lúc boot ở tiến trình có MailProvider (api + worker jobs quét hiệu ứng đến hạn).
import { Inject, Optional, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import type { MailProvider } from '@appchat/integrations';
import { registerEffectSender } from '../../kernel/consistency/platform-effects';
import type { IdentityEnv } from '../identity.env';
import { IDENTITY_ENV, MAIL_PROVIDER } from './identity.tokens';
import { inviteMail } from './mail-templates';

export const INVITE_MAIL_EFFECT = 'identity.invite_mail';

export interface InviteMailPayload {
  to: string;
  locale: string;
  workspace: string;
  token: string;
}

export const inviteUrl = (base: string, token: string) => `${base}/invite?token=${encodeURIComponent(token)}`;

export class InviteEffectsInstaller implements OnModuleInit, OnModuleDestroy {
  private off: (() => void) | null = null;

  constructor(
    @Optional() @Inject(MAIL_PROVIDER) private readonly mail: MailProvider | null,
    @Optional() @Inject(IDENTITY_ENV) private readonly env: IdentityEnv | null,
  ) {}

  onModuleInit(): void {
    const { mail, env } = this;
    if (!mail || !env) return;
    this.off = registerEffectSender(INVITE_MAIL_EFFECT, async (p) => {
      const x = p as unknown as InviteMailPayload;
      await mail.send(inviteMail(x.to, x.locale, x.workspace, inviteUrl(env.APP_PUBLIC_URL, x.token)));
    });
  }

  onModuleDestroy(): void {
    this.off?.();
  }
}
