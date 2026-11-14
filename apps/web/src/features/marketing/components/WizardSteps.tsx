// Thân 4 bước wizard — prototype L3683–3780. Bước 1: 2 kênh (Zalo cá nhân · Email — ngoại lệ §6 Kênh, chọn 1 kênh / chiến dịch).
// Bước 2: tìm · Nhập Excel (lô thật) · phân khúc đã lưu · nhóm · bảng khách (id thật). Bước 3 ở StepContent. Bước 4: Gửi ngay / Hẹn giờ /
// AI tối ưu + tài khoản gửi + tóm tắt (AI Credit = 0 khi không gọi AI — gửi tin không tính credit, DC-246).
'use client';
import { useTranslations } from 'next-intl';
import { Icon, color, type IconName } from '@appchat/ui';
import { MailSenderPicker } from './MailSenderPicker';
import { useWizardStyles } from '../styles/wizard.styles';
import { useStepStyles } from '../styles/steps.styles';
import { useComposeStyles } from '../styles/compose.styles';
import { useFmt } from '@/shared/i18n/useFmt';
import { CHANNEL_LOOK, GROUP_TONE, avColor } from '../status';
import type { Customer, MarketingMeta, MkChannel, SendMode } from '../types';
import type { WizardDraft } from '../hooks/useWizard';
import { AudienceImportButton, AudienceImportResult } from './AudienceImport';

type Patch = (p: Partial<WizardDraft>) => void;
const CHANNELS: MkChannel[] = ['zalo', 'email'];
const GROUPS = ['all', 'vip', 'loyal', 'new', 'potential'];
const C_COLS = ['name', 'phone', 'email', 'meta'] as const;
const SENDS: [SendMode, IconName, string, string][] = [
  ['now', 'ic-send', color.brand, color.white],
  ['schedule', 'ic-cal', color.muteBg, color.text3],
  ['ai_time', 'ic-spark', color.violetChip, color.violetInk],
];

export function StepChannel({ d, patch }: { d: WizardDraft; patch: Patch }) {
  const t = useTranslations('marketing.wiz');
  const { styles, cx } = useWizardStyles();
  return (
    <>
      <div className={styles.sec}>
        <div className={styles.secT}>{t('s1')}</div>
        <div className={styles.secS}>{t('s1sub')}</div>
      </div>
      <div className={styles.chans}>
        {CHANNELS.map((k) => {
          const on = d.channel === k;
          const [c, g] = CHANNEL_LOOK[k];
          return (
            <button key={k} type="button" className={cx(styles.chan, on && styles.chanOn)} onClick={() => patch({ channel: k })} data-testid={`mk-wiz-ch-${k}`}>
              <span className={styles.chIc} style={{ background: c }}>
                {g}
              </span>
              <div className={styles.grow}>
                <div className={styles.chN}>
                  <b>{t(`ch.${k}.name`)}</b>
                  <span className={styles.cost}>{t(`ch.${k}.cost`)}</span>
                </div>
                <div className={styles.chD}>{t(`ch.${k}.desc`)}</div>
              </div>
              <span className={cx(styles.radio, on && styles.radioOn)}>
                <Icon name="ic-check" size={12} color={color.white} strokeWidth={3} />
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}

interface AudienceProps {
  meta: MarketingMeta;
  d: WizardDraft;
  patch: Patch;
  visible: Customer[];
  toggle: (id: string) => void;
  selectAll: () => void;
}

export function StepAudience({ meta, d, patch, visible, toggle, selectAll }: AudienceProps) {
  const t = useTranslations('marketing.wiz');
  const w = useWizardStyles().styles;
  const { styles, cx } = useStepStyles();
  const seg = (id: string) => patch({ segment_ids: d.segment_ids.includes(id) ? d.segment_ids.filter((x) => x !== id) : [...d.segment_ids, id] });
  return (
    <>
      <div className={w.sec}>
        <div className={w.secT}>{t('s2')}</div>
        <div className={w.secS}>{t('s2sub')}</div>
      </div>
      <div className={styles.tools}>
        <div className={styles.search}>
          <Icon name="ic-search" size={14} color={color.text4} strokeWidth={1.9} />
          <input value={d.q} onChange={(e) => patch({ q: e.target.value })} placeholder={t('custSearch')} aria-label={t('custSearch')} data-testid="mk-wiz-q" />
        </div>
        <AudienceImportButton onDone={(batch) => patch({ batch })} />
      </div>
      {meta.segments.length ? (
        <div className={styles.groups} data-testid="mk-wiz-segments">
          {meta.segments.map(([id, name, n]) => (
            <button key={id} type="button" className={cx(styles.group, d.segment_ids.includes(id) && styles.groupOn)} onClick={() => seg(id)} data-seg={id}>
              {`${name} · ${n}`}
            </button>
          ))}
        </div>
      ) : null}
      <div className={styles.groups}>
        {GROUPS.map((g) => (
          <button key={g} type="button" className={cx(styles.group, d.group === g && styles.groupOn)} onClick={() => patch({ group: g })}>
            {g === 'all' ? t('groupAll') : t(`grp.${g}`)}
          </button>
        ))}
      </div>
      {d.batch ? <AudienceImportResult b={d.batch} onRemove={() => patch({ batch: null })} /> : null}
      <div className={styles.allRow}>
        <button type="button" className={styles.all} onClick={selectAll} data-testid="mk-wiz-all">
          <Icon name="ic-check" size={13} color={color.brand} strokeWidth={2} />
          {t('selectAll')}
        </button>
        <span className={w.grow} />
        <span className={styles.muted}>{t('showing', { n: meta.customers.length })}</span>
      </div>
      <div className={styles.table}>
        <div className={styles.thead}>
          <span />
          {C_COLS.map((k) => (
            <span key={k}>{t(`cCol.${k}`)}</span>
          ))}
          <span className={styles.grp}>{t('cCol.group')}</span>
        </div>
        <div className={styles.scroll}>
          {visible.map((c) => {
            const on = d.picked.includes(c.id);
            const tone = GROUP_TONE[c.group] ?? color.text4;
            return (
              <div key={c.id} className={cx(styles.row, on && styles.rowOn)} onClick={() => toggle(c.id)} data-cust={c.id}>
                <span className={cx(styles.check, on && styles.checkOn)}>
                  <Icon name="ic-check" size={11} color={color.white} strokeWidth={3} />
                </span>
                <div className={styles.who}>
                  <span className={styles.av} style={{ background: avColor(c.name) }}>
                    {c.name.replace(/^(Chị|Anh) /, '').charAt(0)}
                  </span>
                  <span className={styles.nm}>{c.name}</span>
                </div>
                <span className={styles.ph}>{c.phone}</span>
                <span className={styles.em}>{c.email}</span>
                <span className={styles.meta}>{c.label}</span>
                <span className={styles.grp} style={{ background: `${tone}16`, color: tone }}>
                  {c.group ? t(`grp.${c.group}` as never) : '—'}
                </span>
              </div>
            );
          })}
          {visible.length ? null : <div className={styles.empty}>{t('noCust')}</div>}
        </div>
      </div>
      {d.picked.length ? (
        <div className={styles.picked}>
          <span className={styles.pIc}>
            <Icon name="ic-users" size={15} color={color.sparkMint} strokeWidth={1.9} />
          </span>
          <div className={w.grow}>
            <div className={styles.pT}>{t('picked', { n: d.picked.length })}</div>
            <div className={styles.pS}>{t('pickedSub')}</div>
          </div>
          <button type="button" className={w.primary} onClick={() => patch({ step: 3 })}>
            {t('toContent')}
            <Icon name="ic-arrow" size={14} color={color.white} strokeWidth={2.2} />
          </button>
        </div>
      ) : null}
    </>
  );
}

export function StepSchedule({ meta, d, patch, audience }: { meta: MarketingMeta; d: WizardDraft; patch: Patch; audience: number }) {
  const t = useTranslations('marketing.wiz');
  const fmt = useFmt();
  const w = useWizardStyles().styles;
  const { styles, cx } = useComposeStyles();
  const accounts = meta.accounts.filter((a) => a.type === (d.channel === 'zalo' ? 'zalo_personal' : 'email'));
  const cap = accounts.find((a) => a.id === d.account_id)?.daily_cap ?? null;
  return (
    <>
      <div className={w.sec}>
        <div className={w.secT}>{t('s4')}</div>
        <div className={w.secS}>{t('s4sub')}</div>
      </div>
      <div className={styles.opts}>
        {SENDS.map(([k, ic, bg, fg]) => {
          const on = d.send === k;
          return (
            <div key={k} role="radio" aria-checked={on} tabIndex={0} className={cx(styles.opt, on && styles.optOn)} onClick={() => patch({ send: k })} data-testid={`mk-send-${k}`}>
              <span className={styles.optIc} style={{ background: on ? color.brand : bg }}>
                <Icon name={ic} size={16} color={on ? color.white : fg} strokeWidth={1.9} />
              </span>
              <div className={w.grow}>
                <div className={styles.optT}>{t(`send.${k}`)}</div>
                {k === 'now' ? <div className={styles.optS}>{t('send.nowSub')}</div> : null}
                {k === 'ai_time' ? <div className={styles.optS}>{t('send.aiSub')}</div> : null}
              </div>
              {k === 'schedule' ? (
                <input className={styles.at} type="datetime-local" value={d.at} onClick={(e) => e.stopPropagation()} onChange={(e) => patch({ at: e.target.value, send: 'schedule' })} aria-label={t('send.schedule')} />
              ) : null}
              {k === 'ai_time' ? <span className={styles.rec}>{t('send.rec')}</span> : null}
            </div>
          );
        })}
      </div>
      {d.channel === 'email' ? <MailSenderPicker meta={meta} value={d.sender || (d.account_id ? `acc:${d.account_id}` : '')} onChange={(v) => patch({ sender: v })} /> : null}
      <div className={w.field} hidden={d.channel === 'email'}>
        <div className={w.label}>{t('account')}</div>
        <select className={w.input} value={d.account_id} onChange={(e) => patch({ account_id: e.target.value })} aria-label={t('account')} data-testid="mk-wiz-account">
          {accounts.length ? null : <option value="">{t('noAccount')}</option>}
          {accounts.map((a) => (
            <option key={a.id} value={a.id} disabled={a.status !== 'connected'}>
              {a.status === 'connected' ? a.name : `${a.name} · ${t('accountOff')}`}
            </option>
          ))}
        </select>
        {cap ? <div className={styles.optS}>{t('capHint', { n: fmt.number(cap), days: Math.max(1, Math.ceil(audience / cap)) })}</div> : null}
      </div>
      <div className={styles.summary}>
        <div className={styles.sumT}>{t('summary')}</div>
        <div className={styles.sumG}>
          <div>
            <span>{t('sumCh')}</span>
            <div>{t(`ch.${d.channel}.name`)}</div>
          </div>
          <div>
            <span>{t('sumAud')}</span>
            <div data-testid="mk-wiz-aud">{fmt.number(audience)}</div>
          </div>
          <div>
            <span>{t('sumCredits')}</span>
            <div>{t('creditsNone')}</div>
          </div>
        </div>
      </div>
    </>
  );
}
