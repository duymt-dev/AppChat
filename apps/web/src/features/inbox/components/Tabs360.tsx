// Các tab CRM · AI · Tệp · Lịch sử của Hồ sơ 360° — prototype L2096–2207.
'use client';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { usePanelStyles } from '../styles/panel.styles';
import { useCardStyles } from '../styles/card360.styles';
import { TAG_TONE } from '../tones';
import { Rich } from './Rich';
import { Timeline } from './Timeline';
import { MemoryPanel } from '@/shared/contact-memory';
import type { Contact360 } from '../types';
import { HistoryCsvButton } from './HistoryCsvButton';

const BAR = { ok: color.okStrong, brand: color.brand, blue: color.blueAvatar } as const;

export function Crm360({ c }: { c: Contact360 }) {
  const t = useTranslations('inbox.p360');
  const { styles } = usePanelStyles();
  const { styles: cs } = useCardStyles();
  return (
    <>
      <div className={cs.facts}>
        {c.crm.kpis.map(([k, v]) => (
          <div key={k} className={styles.card}>
            <div className={styles.small}>{k}</div>
            <div className={cs.points}>{v}</div>
          </div>
        ))}
      </div>
      <div className={styles.card}>
        <div className={styles.eyebrow}>{t('openDeal')}</div>
        <div className={styles.kv}>
          <span>
            <b>{c.crm.open_deal.title}</b>
            <div className={styles.small}>{c.crm.open_deal.meta}</div>
          </span>
          <b className={styles.ok}>{c.crm.open_deal.value}</b>
        </div>
      </div>
      {[
        [t('recentOrder'), c.crm.recent_order],
        [t('recentPayment'), c.crm.recent_payment],
      ].map(([label, item]) => (
        <div key={label as string} className={styles.card}>
          <div className={styles.eyebrow}>{label as string}</div>
          <div className={styles.kv}>
            {(item as { title: string }).title}
            <span className={styles.chip} style={{ color: color.brandInk, background: color.brandBg }}>
              {(item as { status: string }).status}
            </span>
          </div>
        </div>
      ))}
      <div className={styles.card}>
        <div className={styles.cardHead}>
          <span className={styles.eyebrow}>{t('segments')}</span>
        </div>
        {c.crm.segments.map(([l, tone]) => (
          <span key={l} className={styles.chip} style={{ background: TAG_TONE[tone].bg, color: TAG_TONE[tone].fg, marginRight: 6, display: 'inline-block', marginBottom: 6 }}>
            {l}
          </span>
        ))}
      </div>
    </>
  );
}

export function Ai360({ c }: { c: Contact360 }) {
  const t = useTranslations('inbox.p360');
  const { styles } = usePanelStyles();
  return (
    <>
      <MemoryPanel contactId={c.id} />
      <div className={styles.card}>
        <div className={styles.cardHead}>
          <span className={styles.eyebrow}>{t('behavior')}</span>
        </div>
        {c.ai.bars.map(([k, v, pct, tone]) => (
          <div key={k} className={styles.kv}>
            {k}
            <b>{v}</b>
            <span style={{ display: 'block', width: '100%', height: 5, background: color.divider }}>
              <span style={{ display: 'block', width: `${pct}%`, height: '100%', background: BAR[tone] }} />
            </span>
          </div>
        ))}
      </div>
      <div className={styles.card}>
        <div className={styles.cardHead}>
          <span className={styles.eyebrow}>{t('signals')}</span>
        </div>
        {c.ai.signals.map(([k, s]) => (
          <div key={s} className={styles.tlText}>
            <span style={{ color: k === 'up' ? color.brandDeep : color.amberText }}>{t(k === 'up' ? 'signalUp' : 'signalWarn')}</span>
            <Rich text={s} />
          </div>
        ))}
      </div>
      <div className={styles.card}>
        <div className={styles.cardHead}>
          <span className={styles.eyebrow}>{t('nba')}</span>
        </div>
        {c.ai.nba.map((n) => (
          <div key={n} className={styles.kv}>
            → {n}
          </div>
        ))}
      </div>
    </>
  );
}

export function Files360({ c }: { c: Contact360 }) {
  const t = useTranslations('inbox.p360');
  const { styles } = usePanelStyles();
  const { styles: cs } = useCardStyles();
  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <span className={styles.eyebrow}>{t('files')}</span>
      </div>
      {c.files.map((f) => (
        <div key={f.name} className={styles.kv}>
          <span className={cs.fact}>
            <Icon name="ic-doc" size={15} color={f.tone === 'red' ? color.dangerStrong : color.amberGold} />
            <span>{f.name}</span>
          </span>
          <span className={styles.small}>{f.meta}</span>
        </div>
      ))}
    </div>
  );
}

export function History360({ c }: { c: Contact360 }) {
  const t = useTranslations('inbox.p360');
  const { styles } = usePanelStyles();
  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <span className={styles.eyebrow}>{t('timeline')}</span>
        <HistoryCsvButton contactId={c.id} />
      </div>
      <Timeline items={c.timeline} />
    </div>
  );
}
