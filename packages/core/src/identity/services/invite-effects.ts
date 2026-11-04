// Thư mời là hiệu ứng ngoài của thao tác `member.invite` (TIP-045b annex A1): không gửi trong transaction nền tảng nữa — token mời chỉ
// nằm trong payload `platform_effect` (mã hoá AES-GCM, hạn = hạn lời mời), gửi SAU commit; gửi lại không sinh lời mời / token mới.
// Mã OTP đổi Chủ sở hữu (TIP-045b annex A3) đi cùng đường. Người gửi đăng ký một lần lúc boot ở tiến trình có MailProvider (api + worker jobs quét hiệu ứng đến hạn).
import { Inject, Optional, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import type { MailProvider } from '@appchat/integrations';
import { registerEffectSender } from '../../kernel/consistency/platform-effects';
import type { IdentityEnv } from '../identity.env';
import { IDENTITY_ENV, MAIL_PROVIDER } from './identity.tokens';
import { inviteMail, transferOtpMail } from './mail-templates';
import { TRANSFER_OTP_MAIL_EFFECT, type TransferOtpMail } from './ownership-transfer';

export const INVITE_MAIL_EFFECT = 'identity.invite_mail';

export interface InviteMailPayload {
  to: string;
  locale: string;
  workspace: string;
  token: string;
}

export const inviteUrl = (base: string, token: string) => `${base}/invite?token=${encodeURIComponent(token)}`;

export class InviteEffectsInstaller implements OnModuleInit, OnModuleDestroy {
  private offs: (() => void)[] = [];

  constructor(
    @Optional() @Inject(MAIL_PROVIDER) private readonly mail: MailProvider | null,
    @Optional() @Inject(IDENTITY_ENV) private readonly env: IdentityEnv | null,
  ) {}

  onModuleInit(): void {
    const { mail, env } = this;
    if (!mail || !env) return;
    this.offs.push(
      registerEffectSender(INVITE_MAIL_EFFECT, async (p) => {
        const x = p as unknown as InviteMailPayload;
        await mail.send(inviteMail(x.to, x.locale, x.workspace, inviteUrl(env.APP_PUBLIC_URL, x.token)));
      }),
      // Mã đổi Chủ sở hữu (annex A3) — cùng đường hiệu ứng bền: mã chỉ trong payload mã hoá, hạn = hạn mã.
      registerEffectSender(TRANSFER_OTP_MAIL_EFFECT, async (p) => {
        const x = p as unknown as TransferOtpMail;
        await mail.send(transferOtpMail(x.to, x.locale, x.code));
      }),
    );
  }

  onModuleDestroy(): void {
    for (const off of this.offs.splice(0)) off();
  }
}
