// Tab tuỳ biến của Hồ sơ 360° (REQ-F12, TIP-026): mỗi khối của thư viện 12 khối (Cài đặt › Hồ sơ 360°) là một thẻ. Khối hồ sơ (liên hệ,
// trường tuỳ biến, ghi chú, điểm, tín hiệu / tóm tắt AI) đọc Contact360; khối module khác (ticket, SLA, CSAT, báo giá, đơn, lịch hẹn) đọc
// `insights.links` (TIP-015b — LinkBlocks360).
'use client';
import { useTranslations } from 'next-intl';
import { Icon, color, type IconName } from '@appchat/ui';
import { useFmt } from '@/shared/i18n/useFmt';
import { CustomFieldList } from '@/shared/custom-fields';
import { usePanelStyles } from '../styles/panel.styles';
import { useCardStyles } from '../styles/card360.styles';
import { Rich } from './Rich';
import { LINK_BLOCKS, LinkBlock } from './LinkBlocks360';
import type { Contact360 } from '../types';

function Block({ k, c }: { k: string; c: Contact360 }) {
  const t = useTranslations('inbox.p360');
  const fmt = useFmt();
  const { styles } = usePanelStyles();
  const { styles: cs } = useCardStyles();
  const none = <div className={styles.small}>{t('blockNoData')}</div>;
  switch (k) {
    case 'contact': {
      const facts: [IconName, string][] = [
        ['ic-phone', c.phone],
        ['ic-mail', c.email],
        ['ic-box', c.company],
        ['ic-users', c.role],
      ];
      return (
        <div className={cs.facts}>
          {facts.filter(([, v]) => v).map(([ic, v]) => (
            <span key={ic} className={cs.fact}>
              <Icon name={ic} size={14} color={color.text3} />
              {v}
            </span>
          ))}
        </div>
      );
    }
    case 'fields':
      return <CustomFieldList entity="contact" values={c.custom} title={false} />;
    case 'careNote':
      return c.note.body ? (
        <>
          <div className={styles.tlText}>{c.note.body}</div>
          <div className={styles.small}>{c.note.meta}</div>
        </>
      ) : (
        none
      );
    case 'loyalty':
      return (
        <div className={styles.kv}>
          <span className={cs.tier}>{c.tier}</span>
          <b>{fmt.number(c.points)}</b>
        </div>
      );
    case 'signals':
      return c.ai.signals.length ? (
        <>
          {c.ai.signals.map(([s, text]) => (
            <div key={text} className={styles.tlText}>
              <span style={{ color: s === 'up' ? color.brandDeep : color.amberText }}>{t(s === 'up' ? 'signalUp' : 'signalWarn')}</span>
              <Rich text={text} />
            </div>
          ))}
        </>
      ) : (
        none
      );
    case 'summary':
      return c.ai_summary.bullets.length ? (
        <ul className={cs.bullets}>
          {c.ai_summary.bullets.map((b) => (
            <li key={b}>
              <Rich text={b} />
            </li>
          ))}
        </ul>
      ) : (
        none
      );
    default:
      return (LINK_BLOCKS as readonly string[]).includes(k) ? <LinkBlock k={k as (typeof LINK_BLOCKS)[number]} links={c.insights?.links} /> : none;
  }
}

export function Blocks360({ c, blocks }: { c: Contact360; blocks: string[] }) {
  const t = useTranslations('inbox.p360');
  const tb = useTranslations('settings.profile360.blocks');
  const { styles } = usePanelStyles();
  if (!blocks.length) return <div className={styles.small}>{t('blocksEmpty')}</div>;
  return (
    <>
      {blocks.map((k) => (
        <div key={k} className={styles.card} data-block={k}>
          <div className={styles.cardHead}>
            <span className={styles.eyebrow}>{tb(k as never)}</span>
          </div>
          <Block k={k} c={c} />
        </div>
      ))}
    </>
  );
}
