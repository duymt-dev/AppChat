// Menu ⋯ của tin nhắn — prototype L1774–1786: Thu hồi · Xoá tin · Lưu trữ · Ẩn · Xoá lịch sử · Tạo nhóm.
'use client';
import { useTranslations } from 'next-intl';
import { Icon, color, type IconName } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useBubbleStyles } from '../styles/bubble.styles';
import { useInboxStyles } from '../styles/inbox.styles';
import { useInboxUi } from '../inbox-store';

const MSG: [key: 'recall' | 'delete', icon: IconName][] = [
  ['recall', 'ic-refresh'],
  ['delete', 'ic-trash'],
];
const CONV: [key: 'archive' | 'hide' | 'clear' | 'group', icon: IconName][] = [
  ['archive', 'ic-box'],
  ['hide', 'ic-eye'],
  ['clear', 'ic-clock'],
  ['group', 'ic-users'],
];

export function MessageMenu({ convId, messageId }: { convId: string; messageId: string }) {
  const t = useTranslations('inbox.msgMenu');
  const { styles, cx } = useBubbleStyles();
  const { styles: base } = useInboxStyles();
  const ui = useInboxUi();
  const open = ui.pop === 'chatMenu' && ui.menuFor === messageId;
  const recall = useAction('message.recall');
  const del = useAction('message.delete');
  const archive = useAction('conversation.archive');
  const snooze = useAction('conversation.set_status');
  const clear = useAction('conversation.clear_history');

  const run = (key: string) => {
    ui.closePop();
    const ids = { conversation_id: convId, message_id: messageId };
    if (key === 'recall') void recall.run(ids);
    if (key === 'delete') void del.run(ids);
    if (key === 'archive') void archive.run({ conversation_id: convId });
    if (key === 'hide') void snooze.run({ conversation_id: convId, status: 'snoozed', snooze_hours: 24 });
    if (key === 'clear') void clear.run({ conversation_id: convId });
  };

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
          <div className={styles.menu} role="menu" data-testid="chat-menu">
            <div className={styles.menuHead}>{t('messages')}</div>
            {MSG.map(([key, icon]) => (
              <button key={key} type="button" role="menuitem" className={cx(styles.menuItem, key === 'delete' && styles.danger)} onClick={() => run(key)}>
                <Icon name={icon} size={16} color={key === 'delete' ? color.danger : color.text3} />
                {t(key)}
              </button>
            ))}
            <div className={styles.menuHead}>{t('conversation')}</div>
            {CONV.map(([key, icon]) => (
              <button key={key} type="button" role="menuitem" className={styles.menuItem} onClick={() => run(key)}>
                <Icon name={icon} size={16} color={color.text3} />
                {t(key)}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </>
  );
}
