// Trợ lý AI thu nhỏ trong hộp thư — prototype L1509–1546: lời chào theo hội thoại · lệnh nhanh · ô hỏi · mở Trợ lý đầy đủ.
'use client';
import { Fragment, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Icon, color, type IconName } from '@appchat/ui';
import { useShellStore } from '@/shared/shell/shell-store';
import { useModalStyles } from '../styles/modal.styles';
import { useInboxUi } from '../inbox-store';

const SECTIONS: [section: string, items: [key: string, icon: IconName, tone: string, kbd?: string][]][] = [
  ['quick', [['new', 'ic-plus', color.brandDeep, '/new'], ['invite', 'ic-users', color.blueAvatar, '/invite'], ['meet', 'ic-cal', color.calText, '/meet']]],
  ['cowork', [['summary', 'ic-spark', color.violetInk, '/summary'], ['draft', 'ic-spark', color.violetInk, '/draft'], ['translate', 'ic-globe', color.violetInk, '/translate'], ['intent', 'ic-spark', color.violetInk, '/intent']]],
  ['move', [['mention', 'ic-inbox', color.text3], ['assign', 'ic-users', color.text3], ['vip', 'ic-gift', color.text3]]],
];

export function InboxAiModal({ customer }: { customer: string }) {
  const t = useTranslations('inbox.ai');
  const router = useRouter();
  const { styles, cx } = useModalStyles();
  const ui = useInboxUi();
  const setDock = useShellStore((s) => s.setDock);
  const [q, setQ] = useState('');
  const close = () => ui.set({ modal: null });
  const openFull = () => {
    close();
    setDock(true);
  };

  return (
    <div className={cx(styles.veil, styles.veilSoft)} onClick={close} data-testid="inbox-ai-modal">
      <div className={cx(styles.box, styles.aiBox)} role="dialog" aria-modal="true" aria-label={t('title')} onClick={(e) => e.stopPropagation()}>
        <div className={cx(styles.head, styles.aiHead)}>
          <span className={styles.hintIcon}>
            <Icon name="ic-spark" size={16} color={color.white} />
          </span>
          <div className={styles.grow}>
            <div className={styles.hintTitle}>{t('title')}</div>
            <div className={styles.eyebrow} style={{ textTransform: 'none', letterSpacing: 0, color: color.tealInk }}>
              {t('sub')}
            </div>
          </div>
          <button type="button" className={styles.x} onClick={close} aria-label={t('close')}>
            <Icon name="ic-x" size={18} color={color.text3} />
          </button>
        </div>
        <div className={styles.aiScroll}>
          <div className={styles.bot}>
            <span className={styles.botAv}>
              <Icon name="ic-spark" size={16} color={color.brand} />
            </span>
            <div className={styles.botMsg}>{t.rich('hello', { name: customer, b: (c) => <b>{c}</b> })}</div>
          </div>
          <div className={styles.cmds}>
          {SECTIONS.map(([section, items], i) => (
            <Fragment key={section}>
              <div className={cx(styles.section, i === 0 && styles.sectionFirst)}>{t(`sections.${section}` as never)}</div>
              {items.map(([key, icon, tone, kbd]) => (
                <button key={key} type="button" className={styles.cmd} onClick={() => (key === 'meet' ? router.push('/calendar') : openFull())}>
                  <Icon name={icon} size={15} color={tone} />
                  <span className={styles.cmdLabel}>{t(`cmds.${key}` as never)}</span>
                  {kbd ? <kbd className={styles.kbd}>{kbd}</kbd> : null}
                </button>
              ))}
            </Fragment>
          ))}
          </div>
        </div>
        <div className={styles.aiFoot}>
          <div className={styles.ask}>
            <input className={styles.askInput} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('ask')} aria-label={t('ask')} />
            <button type="button" className={styles.askSend} onClick={openFull} aria-label={t('send')}>
              <Icon name="ic-send" size={16} color={color.white} />
            </button>
          </div>
          <button type="button" className={styles.full} onClick={openFull}>
            <Icon name="ic-spark" size={14} color={color.violetInk} />
            {t('openFull')}
          </button>
        </div>
      </div>
    </div>
  );
}
