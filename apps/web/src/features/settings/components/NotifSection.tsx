// Mục Thông báo — prototype L6200–6216 (tuỳ chọn của người dùng hiện tại, quyền self): bảng sự kiện × Desktop / Email / Mobile theo nhóm
// (Tin nhắn · AI · Hệ thống — bỏ "Workflow chạy lỗi" vì Workflow OUT), "Tuỳ chọn nhận thông báo": Không làm phiền (khung giờ), âm thanh,
// email tóm tắt. Mỗi thao tác ghi một lần qua notification.update_prefs.
'use client';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { useAction } from '@/shared/actions/useAction';
import { useNotifStyles } from '../styles/notif.styles';
import { notifPrefsQuery } from '../api';
import type { NotifPrefs } from '../types';
import { Switch } from './Switch';

const CH = ['desktop', 'email', 'mobile'] as const;
const DIGEST = ['off', 'daily', 'weekly'] as const;
const SEP = ' · ';

function Body({ n }: { n: NotifPrefs }) {
  const t = useTranslations('settings.notif');
  const { styles, cx } = useNotifStyles();
  const save = useAction('notification.update_prefs');
  const put = (p: Parameters<typeof save.run>[0]) => void save.run(p, { silent: true });
  return (
    <>
      <div className={styles.table} data-testid="st-notif">
        <div className={cx(styles.grid, styles.th)}>
          <div>{t('col.event')}</div>
          {CH.map((c) => (
            <div key={c} className={styles.c}>
              {t(`col.${c}`)}
            </div>
          ))}
        </div>
        {n.groups.map((g) => (
          <div key={g.key}>
            <div className={styles.g}>{t(`group.${g.key}`)}</div>
            {g.events.map((e) => (
              <div key={e.key} className={cx(styles.grid, styles.tr)} data-event={e.key}>
                <div className={styles.l}>{t(`event.${e.key}`)}</div>
                {CH.map((c) => (
                  <div key={c} className={styles.cFlex}>
                    <Switch
                      mid
                      on={e[c]}
                      onChange={(v) => put({ events: { [e.key]: { desktop: e.desktop, email: e.email, mobile: e.mobile, [c]: v } } })}
                      label={t(`event.${e.key}`) + SEP + t(`col.${c}`)}
                      testId={`st-notif-${e.key}-${c}`}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className={styles.box}>
        <div className={styles.boxT}>{t('prefsT')}</div>
        <div className={cx(styles.opt, styles.optTop)}>
          <div className={styles.grow}>
            <div className={styles.oT}>{t('dnd')}</div>
            <div className={styles.oS}>{t('dndD')}</div>
            {n.dnd.on ? (
              <div className={styles.dnd}>
                <span>{t('from')}</span>
                <input type="time" className={styles.time} value={n.dnd.from} onChange={(e) => put({ dnd: { ...n.dnd, from: e.target.value } })} aria-label={t('from')} />
                <span>{t('to')}</span>
                <input type="time" className={styles.time} value={n.dnd.to} onChange={(e) => put({ dnd: { ...n.dnd, to: e.target.value } })} aria-label={t('to')} />
              </div>
            ) : null}
          </div>
          <Switch large on={n.dnd.on} onChange={(v) => put({ dnd: { ...n.dnd, on: v } })} label={t('dnd')} testId="st-notif-dnd" />
        </div>
        <div className={styles.opt}>
          <div className={styles.grow}>
            <div className={styles.oT}>{t('sound')}</div>
            <div className={styles.oS}>{t('soundD')}</div>
          </div>
          <Switch large on={n.sound} onChange={(v) => put({ sound: v })} label={t('sound')} />
        </div>
        <div className={cx(styles.opt, styles.optLast)}>
          <div className={styles.grow}>
            <div className={styles.oT}>{t('digest')}</div>
            <div className={styles.oS}>{t('digestD')}</div>
          </div>
          <select className={styles.select} value={n.digest} onChange={(e) => put({ digest: e.target.value as NotifPrefs['digest'] })} aria-label={t('digest')} data-testid="st-notif-digest">
            {DIGEST.map((d) => (
              <option key={d} value={d}>
                {t(`digests.${d}`)}
              </option>
            ))}
          </select>
        </div>
      </div>
    </>
  );
}

export function NotifSection() {
  const q = useQuery(notifPrefsQuery());
  return (
    <PageStates state={stateOf(q)} onRetry={() => void q.refetch()}>
      {q.data ? <Body n={q.data} /> : null}
    </PageStates>
  );
}
