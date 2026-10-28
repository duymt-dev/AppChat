// Thân 4 bước wizard — prototype L3683–3780. Bước 1: 2 kênh (Zalo cá nhân · Email — ngoại lệ §6 Kênh, chọn 1 kênh / chiến dịch).
// Bước 2: tìm · Upload Excel · nhóm · bảng khách. Bước 3: tên · tiêu đề (email) · AI soạn 3 giọng · trình soạn. Bước 4: Gửi ngay / Hẹn giờ / AI tối ưu.
'use client';
import { App } from 'antd';
import { useTranslations } from 'next-intl';
import { Icon, color, type IconName } from '@appchat/ui';
import { useWizardStyles } from '../styles/wizard.styles';
import { useStepStyles } from '../styles/steps.styles';
import { useComposeStyles } from '../styles/compose.styles';
import { CHANNEL_LOOK, GROUP_TONE, avColor } from '../status';
import type { MarketingMeta, MkChannel, SendMode } from '../types';
import type { WizardDraft } from '../hooks/useWizard';

type Patch = (p: Partial<WizardDraft>) => void;
const CHANNELS: MkChannel[] = ['zalo', 'email'];
const GROUPS = ['all', 'vip', 'returning', 'cart', 'new', 'cold'];
const C_COLS = ['name', 'phone', 'email', 'meta'] as const;
const TONES: [string, string][] = [
  ['friendly', color.successStrong],
  ['luxury', color.violet],
  ['urgent', color.dangerStrong],
];
const TOOLS: [string, string, string][] = [
  ['B', 'bold', '**'],
  ['I', 'italic', '_'],
  ['U', 'underline', '__'],
  ['•', 'ul', '\n• '],
  ['1.', 'ol', '\n1. '],
];
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
  visible: { c: MarketingMeta['customers'][number]; i: number }[];
  toggle: (i: number) => void;
  selectAll: () => void;
}

export function StepAudience({ meta, d, patch, visible, toggle, selectAll }: AudienceProps) {
  const t = useTranslations('marketing.wiz');
  const { message } = App.useApp();
  const w = useWizardStyles().styles;
  const { styles, cx } = useStepStyles();
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
        <button
          type="button"
          className={styles.upload}
          onClick={() => (patch({ uploaded: true }), void message.success(t('uploadDone')))}
          data-testid="mk-wiz-upload"
        >
          <Icon name="ic-dl" size={14} color={color.blue} />
          {t('upload')}
        </button>
      </div>
      <div className={styles.groups}>
        {GROUPS.map((g) => (
          <button key={g} type="button" className={cx(styles.group, d.group === g && styles.groupOn)} onClick={() => patch({ group: g })}>
            {g === 'all' ? t('groupAll') : (meta.segments.find((s) => s[0] === g)?.[1] ?? g)}
          </button>
        ))}
      </div>
      {d.uploaded ? (
        <div className={styles.done} data-testid="mk-wiz-uploaded">
          <span className={styles.doneIc}>
            <Icon name="ic-check" size={16} color={color.white} strokeWidth={1.9} />
          </span>
          <div className={w.grow}>
            <b>{t('uploadFile')}</b>
            <div className={styles.doneS}>{t('uploadSum')}</div>
          </div>
          <button type="button" className={styles.link} onClick={() => patch({ uploaded: false })}>
            {t('unload')}
          </button>
        </div>
      ) : null}
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
          {visible.map(({ c, i }) => {
            const on = d.picked.includes(i);
            const tone = GROUP_TONE[c[3]] ?? color.text4;
            return (
              <div key={c[1]} className={cx(styles.row, on && styles.rowOn)} onClick={() => toggle(i)} data-cust={i}>
                <span className={cx(styles.check, on && styles.checkOn)}>
                  <Icon name="ic-check" size={11} color={color.white} strokeWidth={3} />
                </span>
                <div className={styles.who}>
                  <span className={styles.av} style={{ background: avColor(c[0]) }}>
                    {c[0].replace(/^(Chị|Anh) /, '').charAt(0)}
                  </span>
                  <span className={styles.nm}>{c[0]}</span>
                </div>
                <span className={styles.ph}>{c[1]}</span>
                <span className={styles.em}>{c[2]}</span>
                <span className={styles.meta}>{c[4]}</span>
                <span className={styles.grp} style={{ background: `${tone}16`, color: tone }}>
                  {t(`grp.${c[3]}`)}
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

export function StepContent({ d, patch }: { d: WizardDraft; patch: Patch }) {
  const t = useTranslations('marketing.wiz');
  const { message } = App.useApp();
  const w = useWizardStyles().styles;
  const { styles } = useComposeStyles();
  const tone = (k: string) => {
    patch({ body: t.raw(`toneText.${k}`) as string });
    void message.success(t('toneDone', { l: t(`tones.${k}`) }));
  };
  return (
    <>
      <div className={w.sec}>
        <div className={w.secT}>{t('s3')}</div>
        <div className={w.secS}>{t.raw('s3sub') as string}</div>
      </div>
      <div className={w.field}>
        <div className={w.label}>{t('name')}</div>
        <input className={w.input} value={d.name} onChange={(e) => patch({ name: e.target.value })} placeholder={t('namePh')} data-testid="mk-wiz-name" />
      </div>
      {d.channel === 'email' ? (
        <div className={w.field}>
          <div className={w.label}>{t('subject')}</div>
          <input className={w.input} value={d.subject} onChange={(e) => patch({ subject: e.target.value })} data-testid="mk-wiz-subject" />
        </div>
      ) : null}
      <div className={styles.aiCard}>
        <div className={styles.aiH}>
          <span className={styles.aiIc}>
            <Icon name="ic-spark" size={14} color={color.white} strokeWidth={1.9} />
          </span>
          {t('aiCompose')}
          <span className={styles.aiS}>{t('aiComposeSub')}</span>
        </div>
        <div className={styles.tones}>
          {TONES.map(([k, c]) => (
            <button key={k} type="button" className={styles.tone} style={{ borderColor: `${c}44`, color: c }} onClick={() => tone(k)} data-testid={`mk-tone-${k}`}>
              <Icon name="ic-spark" size={13} color={c} strokeWidth={1.9} />
              {t(`tones.${k}`)}
            </button>
          ))}
        </div>
      </div>
      <div className={w.label}>{t('body')}</div>
      <div className={styles.editor}>
        <div className={styles.bar}>
          {TOOLS.map(([l, k, mark]) => (
            <button key={k} type="button" className={styles.tool} title={t(`tools.${k}`)} aria-label={t(`tools.${k}`)} onClick={() => patch({ body: d.body + mark })}>
              {l}
            </button>
          ))}
          <span className={w.grow} />
          <button type="button" className={styles.help} onClick={() => patch({ body: t.raw('aiHelpText') as string })}>
            <Icon name="ic-spark" size={12} color={color.violetInk} />
            {t('aiHelp')}
          </button>
        </div>
        <textarea className={styles.text} value={d.body} onChange={(e) => patch({ body: e.target.value })} aria-label={t('body')} data-testid="mk-wiz-body" />
      </div>
      <div className={styles.preview}>
        <Icon name="ic-spark" size={16} color={color.info} />
        <span>{t.rich('preview', { b: (c) => <b>{c}</b> })}</span>
      </div>
    </>
  );
}

export function StepSchedule({ d, patch, audience }: { d: WizardDraft; patch: Patch; audience: number }) {
  const t = useTranslations('marketing.wiz');
  const w = useWizardStyles().styles;
  const { styles, cx } = useComposeStyles();
  const credits = d.channel === 'email' ? Math.ceil(audience / 100) : 0;
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
      <div className={styles.summary}>
        <div className={styles.sumT}>{t('summary')}</div>
        <div className={styles.sumG}>
          <div>
            <span>{t('sumCh')}</span>
            <div>{t(`ch.${d.channel}.name`)}</div>
          </div>
          <div>
            <span>{t('sumAud')}</span>
            <div data-testid="mk-wiz-aud">{audience.toLocaleString('vi-VN')}</div>
          </div>
          <div>
            <span>{t('sumCredits')}</span>
            <div>{credits.toLocaleString('vi-VN')}</div>
          </div>
        </div>
      </div>
    </>
  );
}
