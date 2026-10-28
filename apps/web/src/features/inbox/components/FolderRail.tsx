// Rail thư mục (mở bằng nút ☰) — prototype L1602–1627: Hộp thư · Trạng thái AI · Kênh · Bộ lọc đã lưu.
'use client';
import { useTranslations } from 'next-intl';
import { createStyles } from 'antd-style';
import { Icon, color, font, layout, radius } from '@appchat/ui';
import { useInboxUi } from '../inbox-store';
import type { ChannelMeta, ChannelType, FolderCounts } from '../types';

const useStyles = createStyles(({ css, responsive }) => ({
  rail: css`
    width: ${layout.inboxRail}px;
    flex-shrink: 0;
    border-right: 1px solid ${color.border};
    background: ${color.surface};
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    @media (max-width: 900px) {
      display: none;
    }
    ${responsive.md} {
      display: none;
    }
  `,
  sync: css`
    padding: 12px 12px 8px;
    border-bottom: 1px solid ${color.border};
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
  `,
  dot: css`
    width: 6px;
    height: 6px;
    border-radius: ${radius.r4}px;
    background: ${color.brand};
  `,
  list: css`
    padding: 8px 8px 16px;
  `,
  head: css`
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.bold};
    letter-spacing: 0.1em;
    color: ${color.text4};
    padding: 12px 8px 6px;
    text-transform: uppercase;
  `,
  item: css`
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border-radius: ${radius.r6}px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.medium};
    color: ${color.text};
    cursor: pointer;
    margin-bottom: 2px;
    border: none;
    background: none;
    font-family: inherit;
    text-align: left;
    &:hover {
      background: ${color.bg};
    }
  `,
  on: css`
    font-weight: ${font.weight.semibold};
    color: ${color.brandInk};
    background: ${color.brandBg};
    &:hover {
      background: ${color.brandBg};
    }
  `,
  at: css`
    width: 14px;
    text-align: center;
    color: ${color.text3};
    font-weight: ${font.weight.bold};
  `,
  ch: css`
    width: 16px;
    height: 16px;
    border-radius: ${radius.r4}px;
    display: grid;
    place-items: center;
    color: ${color.white};
    font-size: ${font.scale.s10}px;
    font-weight: ${font.weight.heavy};
  `,
  label: css`
    flex: 1;
  `,
  count: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    color: ${color.text4};
  `,
  countOn: css`
    color: ${color.brandInk};
  `,
}));

const AI_TONE: Record<string, string> = { ai_running: color.brand, ai_pending_approval: color.amberText, needs_human: color.dangerStrong };

export function FolderRail({ counts, channels }: { counts: FolderCounts; channels: Record<ChannelType, ChannelMeta> | undefined }) {
  const t = useTranslations('inbox.folders');
  const { styles, cx } = useStyles();
  const ui = useInboxUi();
  const row = (key: string, label: string, icon: React.ReactNode, n: number) => {
    const on = ui.tab === key;
    return (
      <button key={key} type="button" className={cx(styles.item, on && styles.on)} onClick={() => ui.set({ tab: key })} aria-pressed={on}>
        {icon}
        <span className={styles.label}>{label}</span>
        <span className={cx(styles.count, on && styles.countOn)}>{n}</span>
      </button>
    );
  };

  return (
    <nav className={styles.rail} data-testid="folder-rail" aria-label={t('title')}>
      <div className={styles.sync}>
        <span className={styles.dot} />
        <span>{t.rich('synced', { n: counts.synced, b: (c) => <b style={{ color: color.text3 }}>{c}</b> })}</span>
      </div>
      <div className={styles.list}>
        <div className={styles.head}>{t('mailbox')}</div>
        {counts.mailbox.map(([key, icon, n]) =>
          row(key, t(`items.${key}` as never), icon === '@' ? <span className={styles.at}>{t('at')}</span> : <Icon name={icon} size={14} color={key === 'unread' ? color.brand : color.text3} />, n),
        )}
        <div className={styles.head}>{t('ai')}</div>
        {counts.ai.map(([key, icon, n]) => (icon === '@' ? null : row(key, t(`items.${key}` as never), <Icon name={icon} size={14} color={AI_TONE[key]} />, n)))}
        <div className={styles.head}>{t('channels')}</div>
        {counts.channels.map(([key, n]) =>
          row(
            `ch_${key}`,
            channels?.[key].label ?? key,
            <span className={styles.ch} style={{ background: channels?.[key].color }}>
              {channels?.[key].short}
            </span>,
            n,
          ),
        )}
        <div className={styles.head}>{t('saved')}</div>
        {counts.saved.map(([label, n], i) => row(`saved_${i}`, label, null, n))}
      </div>
    </nav>
  );
}
