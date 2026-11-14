// Modal "Chuyển tiếp tin nhắn" (REQ-C09) — chọn hội thoại khác để chuyển tới.
'use client';
import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { App } from 'antd';
import { Icon, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useModalStyles } from '../styles/modal.styles';
import { useInboxUi } from '../inbox-store';
import { conversationsQuery } from '../api';

export function ForwardModal() {
  const t = useTranslations('inbox.forward');
  const { message: toast } = App.useApp();
  const { styles, cx } = useModalStyles();
  const ui = useInboxUi();
  const from = ui.forwardFrom;
  const list = useInfiniteQuery(conversationsQuery());
  const forward = useAction('message.forward');
  const [q, setQ] = useState('');
  const close = () => ui.set({ modal: null, forwardFrom: null });

  if (!from) return null;
  const rows = (list.data?.pages.flatMap((p) => p.data) ?? []).filter((c) => c.id !== from.convId && c.title.toLowerCase().includes(q.trim().toLowerCase()));

  const pick = async (targetId: string) => {
    const r = await forward.run({ conversation_id: from.convId, message_id: from.messageId, target_conversation_id: targetId }, { silent: true });
    if (r) toast.success(t('sent'));
    close();
  };

  return (
    <div className={styles.veil} onClick={close} data-testid="forward-modal">
      <div className={styles.box} role="dialog" aria-modal="true" aria-label={t('title')} onClick={(e) => e.stopPropagation()}>
        <div className={styles.head}>
          <div className={styles.grow}>
            <div className={styles.hintTitle}>{t('title')}</div>
          </div>
          <button type="button" className={styles.x} onClick={close} aria-label={t('close')}>
            <Icon name="ic-x" size={18} color={color.text3} />
          </button>
        </div>
        <div className={styles.aiScroll}>
          <input className={styles.askInput} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('search')} aria-label={t('search')} autoFocus />
          <div className={styles.cmds}>
            {rows.map((c) => (
              <button key={c.id} type="button" className={cx(styles.cmd, styles.cmdRow)} onClick={() => void pick(c.id)} data-testid="forward-target">
                <span className={styles.cmdLabel}>{c.title}</span>
                <span>{t('send')}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
