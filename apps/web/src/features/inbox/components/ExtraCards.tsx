// Cuối tab Tổng quan: Việc cần làm · Ghi chú · Comment — prototype L2074–2092.
'use client';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { usePanelStyles } from '../styles/panel.styles';
import { useCardStyles } from '../styles/card360.styles';
import type { Contact360 } from '../types';

export function ExtraCards({ c }: { c: Contact360 }) {
  const t = useTranslations('inbox.p360');
  const { styles } = usePanelStyles();
  const { styles: cs } = useCardStyles();
  return (
    <>
      <div className={styles.card}>
        <div className={styles.cardHead}>
          <span className={styles.eyebrow}>{t('tasks')}</span>
          <button type="button" className={styles.link}>
            {t('addTask')}
          </button>
        </div>
        {c.tasks.map((k) => (
          <div key={k.id} className={styles.kv}>
            <span className={cs.fact}>
              <Icon name={k.done ? 'ic-check' : 'ic-clock'} size={14} color={k.done ? color.brand : color.text4} />
              <span style={{ textDecoration: k.done ? 'line-through' : undefined, color: k.done ? color.text4 : color.text }}>{k.title}</span>
            </span>
            <span className={styles.small}>{k.due}</span>
          </div>
        ))}
      </div>
      <div className={styles.card}>
        <div className={styles.cardHead}>
          <span className={styles.eyebrow}>{t('notes')}</span>
          <button type="button" className={styles.link}>
            {t('addNote')}
          </button>
        </div>
        <div className={styles.tlText}>{c.note.body}</div>
        <div className={styles.small}>{c.note.meta}</div>
      </div>
      <div className={styles.card}>
        <div className={styles.cardHead}>
          <span className={styles.eyebrow}>{t('comments')}</span>
        </div>
        {c.comments.map((m) => (
          <div key={m.at} className={styles.tl}>
            <div className={styles.tlDot}>{m.initial}</div>
            <div className={styles.grow}>
              <div className={styles.tlWhen}>{m.author}</div>
              <div className={styles.tlText}>{m.body}</div>
              <div className={styles.small}>{m.at}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
