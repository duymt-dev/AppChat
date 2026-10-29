// Xem trước widget (360px) — prototype L7271–7298: khung 440 nền gradient, cửa sổ chat (đầu xanh: 3 avatar, "Xin chào! 👋"), lời chào AI,
// nút hành động đang bật, ô nhập; nút launcher 58 tròn đóng / mở cửa sổ.
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useWidgetPvStyles } from '../styles/widget-preview.styles';
import type { Widget } from '../types';

const AVATARS: [string, string][] = [
  ['T', color.okStrong],
  ['H', color.purple],
  ['M', color.blue],
];
const CLOSE = '✕';
const MIN = '—';
const AI = 'AI';

export function WidgetPreview({ w }: { w: Widget }) {
  const t = useTranslations('settings.widget.pv');
  const tw = useTranslations('settings.widget');
  const { styles } = useWidgetPvStyles();
  const [open, setOpen] = useState(true);
  return (
    <div className={styles.panel} data-testid="st-wg-preview">
      <div className={styles.lbl}>{t('title')}</div>
      <div className={styles.stage}>
        {open ? (
          <div className={styles.win}>
            <div className={styles.head}>
              <div className={styles.ctl}>
                <span>{MIN}</span>
                <button type="button" onClick={() => setOpen(false)} aria-label={t('close')}>
                  {CLOSE}
                </button>
              </div>
              <div className={styles.avs}>
                {AVATARS.map(([l, c], i) => (
                  <span key={l} className={i ? styles.avOver : styles.av} style={i ? { background: c } : { color: c }}>
                    {l}
                  </span>
                ))}
                <span className={styles.online}>
                  <span className={styles.onDot} />
                  {t('online')}
                </span>
              </div>
              <div className={styles.hi}>{t('hi')}</div>
              <div className={styles.hiS}>{t('hiS')}</div>
            </div>
            <div className={styles.body}>
              <div className={styles.msgRow}>
                <span className={styles.aiAv}>{AI}</span>
                <div className={styles.msgCol}>
                  <div className={styles.msg}>{w.greeting}</div>
                  <div className={styles.meta}>{t('meta', { a: w.agent })}</div>
                </div>
              </div>
              <div className={styles.acts}>
                {w.actions
                  .filter((a) => a.on)
                  .map((a) => (
                    <span key={a.key} className={styles.act} style={{ color: a.color, borderColor: a.color }}>
                      {tw(`act.${a.key}`)}
                      <Icon name="ic-arrow" size={13} color={a.color} strokeWidth={2.4} />
                    </span>
                  ))}
              </div>
            </div>
            <div className={styles.foot}>
              <div className={styles.bar}>
                <Icon name="ic-smile" size={17} color={color.text4} />
                <span className={styles.ph}>{t('ph')}</span>
                <Icon name="ic-clip" size={16} color={color.text4} />
                <span className={styles.send}>
                  <Icon name="ic-send" size={14} color={color.white} strokeWidth={2} />
                </span>
              </div>
              <div className={styles.pow}>{t.rich('powered', { b: (c) => <b>{c}</b> })}</div>
            </div>
          </div>
        ) : null}
        <button type="button" className={styles.launcher} onClick={() => setOpen(!open)} aria-label={open ? t('close') : t('open')} data-testid="st-wg-launcher">
          {open ? <Icon name="ic-x" size={24} color={color.white} strokeWidth={2.2} /> : <Icon name="ic-inbox" size={26} color={color.white} />}
        </button>
      </div>
    </div>
  );
}
