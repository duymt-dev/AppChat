// Hội thoại Trợ lý — prototype L1256–1311: bong bóng người dùng / AppChat AI, thẻ xác nhận (ActionPreviewCard — đổi gì, Sửa, Xác nhận /
// Huỷ, đã lưu / đã huỷ / chờ duyệt), "đang soạn", composer đáy.
'use client';
import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useThreadStyles } from '../styles/thread.styles';
import { useAssistantUi } from '../assistant-store';
import type { UiCommand } from '@appchat/actions';
import { GenUiRenderer } from '@/shared/genui';
import type { ChatMessage } from '../types';
import { ActionPreviewCard } from './ActionPreviewCard';
import { BotFaceSmall } from './BotFace';
import { Composer } from './Composer';

export interface ChatThreadProps {
  onSend: () => void;
  onDecide: (m: ChatMessage, d: 'confirm' | 'cancel') => void;
  onOpen: (m: ChatMessage) => void;
  /** Lệnh UI từ nút của cây GenUI (đổi màn / lọc / tô sáng — không đổi dữ liệu). */
  onUi: (cmd: UiCommand) => void;
  /** Kết quả ngoài đã xác minh (QR đã kết nối) → gửi tiếp lượt cho Trợ lý. */
  onExternal?: (e: { node: string; status: 'connected' }) => void;
}

export function ChatThread({ onSend, onDecide, onOpen, onUi, onExternal }: ChatThreadProps) {
  const t = useTranslations('assistant');
  const { styles } = useThreadStyles();
  const { messages, typing } = useAssistantUi();
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView?.({ block: 'end' });
  }, [messages.length, typing]);

  return (
    <>
      <div className={styles.scroll} data-testid="asst-thread">
        <div className={styles.list}>
          {messages.map((m) =>
            m.role === 'user' ? (
              <div key={m.id} className={styles.userRow}>
                <div className={styles.user} data-testid="asst-user-msg">
                  {m.text}
                </div>
              </div>
            ) : (
              <div key={m.id} className={styles.aiRow}>
                <span className={styles.avatar}>
                  <BotFaceSmall />
                </span>
                <div className={styles.aiCol}>
                  <div className={styles.aiName}>{t('ai')}</div>
                  {m.ui ? (
                    <GenUiRenderer part={m.ui} mode="full" onUi={onUi} onExternal={onExternal} />
                  ) : (
                    <div className={styles.ai} data-testid="asst-ai-msg">
                      {m.card ? t('confirmLead') : m.text}
                    </div>
                  )}
                  {m.card ? <ActionPreviewCard m={m} onDecide={onDecide} onOpen={onOpen} /> : null}
                </div>
              </div>
            ),
          )}
          {typing ? (
            <div className={styles.aiRow} data-testid="asst-typing">
              <span className={styles.avatar}>
                <BotFaceSmall talking />
              </span>
              <div className={styles.typing}>
                <span />
                <span />
                <span />
              </div>
            </div>
          ) : null}
          <div ref={end} />
        </div>
      </div>
      <div className={styles.foot}>
        <div className={styles.footInner}>
          <Composer rows={1} placeholder={t('placeholderShort')} onSend={onSend} sendIcon="plane" testId="asst-composer" />
        </div>
      </div>
    </>
  );
}
