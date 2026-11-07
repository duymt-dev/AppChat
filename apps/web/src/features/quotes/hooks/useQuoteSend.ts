// Gửi báo giá (TIP-029): lỗi do kênh báo đúng lý do thay vì câu chung — khách chưa nhắn Zalo (Zalo cá nhân không nhắn chủ động được),
// khách chưa có email, workspace chưa kết nối email; vượt ngưỡng dùng câu chung QUOTE_NEEDS_APPROVAL. TIP-032b P2: thêm webchat + định dạng
// PDF / ảnh (kênh không gửi được ảnh → câu riêng).
'use client';
import { App } from 'antd';
import { useTranslations } from 'next-intl';
import { useAction } from '@/shared/actions/useAction';

const REASONS = ['no_conversation', 'no_email'] as const;

export type QuoteChannel = 'zalo_personal' | 'email' | 'webchat';
export type QuoteFormat = 'pdf' | 'image';

export function useQuoteSend() {
  const t = useTranslations('quotes.detail.sendErr');
  const { message } = App.useApp();
  const send = useAction('quote.send');
  const run = (quoteId: string, channel: QuoteChannel, format: QuoteFormat = 'pdf') =>
    send.run(
      { quote_id: quoteId, channel, format },
      {
        onError: (e) => {
          const f = e.error.fields ?? {};
          if (f.format === 'channel_no_image') {
            void message.error(t('noImage'));
            return true;
          }
          const key = f.connector === 'email' ? 'connector' : REASONS.find((r) => f.channel === r);
          if (!key) return false;
          void message.error(t(key === 'no_conversation' ? `no_conversation_${channel}` : key));
          return true;
        },
      },
    );
  return { run, isPending: send.isPending };
}
