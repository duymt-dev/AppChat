// Vùng luồng tin (TIP-025b §B.3): danh sách tin + (khi đã nhảy tới kết quả tìm) dải "Đang xem tin cũ · Về tin mới nhất" và nút tải tin
// mới hơn; cuộn tới tin đích và tô nhẹ. TIP-025b §F.2: bản dịch tự động dưới tin khách + nút Dịch thêm / Thử lại. Thẻ gợi ý / bàn giao (children) chỉ hiện ở luồng mới nhất.
'use client';
import { useEffect, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { useChatStyles } from '../styles/chat.styles';
import { useThreadStyles } from '../styles/thread.styles';
import { useAssistStyles } from '../styles/assist.styles';
import { useXlPref } from '../hooks/useInboxTranslation';
import { useIncomingTranslations } from '../hooks/useIncomingTranslations';
import { MessageBubble } from './MessageBubble';
import type { useThreadWindow } from '../hooks/useThreadWindow';
import type { Conversation } from '../types';

export function ThreadViewport({ conv, w, children }: { conv: Conversation; w: ReturnType<typeof useThreadWindow>; children?: ReactNode }) {
  const t = useTranslations('inbox.chat.window');
  const { styles } = useChatStyles();
  const { styles: ts } = useThreadStyles();
  const ready = w.jumped && !w.loadingWindow;
  const tx = useTranslations('inbox.composer.xl');
  const { styles: as } = useAssistStyles();
  // TIP-025b §F.2: tự dịch tin khách đang thấy sang tiếng Việt (bật theo hội thoại; 10 tin đầu, sau đó "Dịch thêm").
  const xl = useIncomingTranslations(conv.id, w.messages, useXlPref(conv.id).pref.auto);
  useEffect(() => {
    if (!ready || !w.anchorId) return;
    const el = document.getElementById(`msg-${w.anchorId}`);
    el?.scrollIntoView({ block: 'center' });
    el?.setAttribute('data-hit', 'on');
    return () => el?.removeAttribute('data-hit');
  }, [ready, w.anchorId]);

  return (
    <div className={styles.thread} data-testid="thread">
      {w.jumped ? (
        <div className={ts.jumpBar} role="status" data-testid="thread-jumped">
          <span>{w.windowError ? t('error') : w.loadingWindow ? t('loading') : t('older')}</span>
          <button type="button" className={ts.jumpBtn} onClick={w.backToLatest} data-testid="thread-latest">
            {t('latest')}
          </button>
        </div>
      ) : null}
      {xl.more || xl.paused ? (
        <button type="button" className={as.more} onClick={xl.paused ? xl.retry : xl.loadMore} data-testid={xl.paused ? 'xl-in-retry' : 'xl-in-more'}>
          {xl.paused ? tx('inPaused') : tx('inMore')}
        </button>
      ) : null}
      {w.messages.map((m) => (
        <MessageBubble key={m.id} m={m} conv={conv} translated={xl.texts[m.id]} />
      ))}
      {w.jumped && w.hasNewer ? (
        <button type="button" className={ts.more} onClick={() => void w.loadNewer()} data-testid="thread-newer">
          {t('newer')}
        </button>
      ) : null}
      {w.jumped ? null : children}
    </div>
  );
}
