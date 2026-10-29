// Menu ⋯ của tin nhắn (REQ-C09, ver2.1 #1) — prototype L2121–2135 (menu), L11800–11845 (danh sách hành vi):
// hàng cảm xúc (bấm lại để bỏ) · Trả lời · Sao chép · Chuyển tiếp · Ghim · Dịch · Tạo ticket · Thu hồi / Xoá.
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { App } from 'antd';
import { Icon, color, type IconName } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useMessageMenuStyles } from '../styles/menu.styles';
import { useInboxStyles } from '../styles/inbox.styles';
import { useInboxUi } from '../inbox-store';
import type { Message } from '../types';

const REACTS = ['👍', '❤️', '😂', '😮', '😢', '🙏'] as const;

export function MessageMenu({ convId, message, isPinned }: { convId: string; message: Message; isPinned: boolean }) {
  const t = useTranslations('inbox.msgMenu');
  const router = useRouter();
  const { message: toast } = App.useApp();
  const { styles, cx } = useMessageMenuStyles();
  const { styles: base } = useInboxStyles();
  const ui = useInboxUi();
  const messageId = message.id;
  const open = ui.pop === 'chatMenu' && ui.menuFor === messageId;
  const react = useAction('message.react');
  const pin = useAction('message.pin');
  const translate = useAction<{ text: string }>('ai.translate');
  const recall = useAction('message.recall');
  const del = useAction('message.delete');
  const [translated, setTranslated] = useState<string | null>(null);

  const close = ui.closePop;

  const items: [key: string, icon: IconName, hint: string | undefined, danger: boolean, onClick: () => void][] = [
    ['reply', 'ic-reply', undefined, false, () => { close(); ui.set({ replyTo: { id: messageId, preview: (message.body ?? '').slice(0, 80) } }); }],
    ['copy', 'ic-doc', undefined, false, () => { close(); void navigator.clipboard?.writeText(message.body ?? '').then(() => toast.success(t('copied'))); }],
    ['forward', 'ic-send', undefined, false, () => { close(); ui.set({ modal: 'forward', forwardFrom: { convId, messageId } }); }],
    [isPinned ? 'unpin' : 'pin', 'ic-pin', undefined, false, () => { close(); void pin.run({ conversation_id: convId, message_id: messageId, pinned: !isPinned }, { silent: true }); }],
    ['translate', 'ic-globe', undefined, false, () => { close(); void translate.run({ conversation_id: convId, message_id: messageId }, { silent: true }).then((r) => r && setTranslated(r.result.text)); }],
    ['ticket', 'ic-ticket', undefined, false, () => {
      close();
      const q = new URLSearchParams({
        tk_title: `Từ tin nhắn: ${(message.body ?? '').slice(0, 40)}…`,
        tk_channel: 'zalo_personal',
      });
      router.push(`/tickets?${q.toString()}`);
    }],
    ['recall', 'ic-refresh', t('recallHint'), false, () => { close(); void recall.run({ conversation_id: convId, message_id: messageId }); }],
    ['delete', 'ic-trash', undefined, true, () => { close(); void del.run({ conversation_id: convId, message_id: messageId }); }],
  ];

  return (
    <>
      <button
        type="button"
        className={cx(styles.dots, 'msg-dots', open && styles.dotsOn)}
        title={t('title')}
        aria-label={t('title')}
        aria-expanded={open}
        onClick={() => ui.togglePop('chatMenu', messageId)}
        data-testid="msg-dots"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </button>
      {open ? (
        <>
          <div className={base.veil} onClick={ui.closePop} />
          <div className={cx(styles.menu, styles.menuWide)} role="menu" data-testid="chat-menu">
            <div className={styles.reactRow}>
              {REACTS.map((e) => (
                <button
                  key={e}
                  type="button"
                  className={cx(styles.reactBtn, message.reaction === e && styles.reactBtnOn)}
                  title={t(`reacts.${e}` as never)}
                  onClick={() => { close(); void react.run({ conversation_id: convId, message_id: messageId, emoji: e }, { silent: true }); }}
                >
                  {e}
                </button>
              ))}
            </div>
            {items.map(([key, icon, hint, danger, onClick], i) => (
              <div key={key}>
                {i === items.length - 2 ? <div className={styles.sep} /> : null}
                <button type="button" role="menuitem" className={cx(styles.menuItem, danger && styles.danger)} onClick={onClick}>
                  <Icon name={icon} size={15} color={danger ? color.danger : color.text3} />
                  <span className={styles.menuGrow}>{t(key as never)}</span>
                  {hint ? <span className={styles.menuHint}>{hint}</span> : null}
                </button>
              </div>
            ))}
          </div>
        </>
      ) : null}
      {translated ? (
        <div className={styles.translated} data-testid="msg-translated">
          <Icon name="ic-globe" size={12} color={color.info} />
          {translated}
        </div>
      ) : null}
    </>
  );
}
