// Mục Thiết lập SLA — prototype L7375–7419, P0 chỉ chính sách mặc định (Blueprint §7.2; sla_policy.is_default không xoá được): bảng một dòng
// (FRT / TTR · AI vs người, sửa qua hộp "Sửa chính sách"), giờ làm việc của con người (bật / nghỉ từng ngày, dừng đồng hồ ngoài giờ),
// quy tắc leo thang (bật / tắt), thẻ AI dự báo rủi ro SLA. Ghi: sla.update_default, working_hours.update. "Tạo chính sách" khoá (P1).
'use client';
import { useState } from 'react';
import { Tooltip } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { useSlaStyles } from '../styles/sla.styles';
import { slaQuery } from '../api';
import type { SlaData, SlaDay } from '../types';
import { Switch } from './Switch';
import { SlaPolicyModal } from './SlaPolicyModal';

export const fmtMins = (m: number, now: string) => {
  if (m === 0) return now;
  if (m < 60) return `${m}'`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h${r}'` : `${h}h`;
};
const DASH = '—';
const EN = ' – ';

function Body({ d }: { d: SlaData }) {
  const t = useTranslations('settings.sla');
  const { styles, cx } = useSlaStyles();
  const upd = useAction('sla.update_default');
  const hours = useAction('working_hours.update');
  const [edit, setEdit] = useState(false);
  const p = d.policy;
  const m = (x: number) => fmtMins(x, t('now'));
  const putDays = (days: SlaDay[], pause = d.pause_sla) => void hours.run({ days, pause_sla: pause }, { silent: true });
  return (
    <>
      <div className={styles.bar}>
        <span className={styles.grow} />
        <Tooltip title={t('newSoon')}>
          <span>
            <button type="button" className={styles.newBtn} disabled data-testid="st-sla-new">
              <Icon name="ic-plus" size={14} color={color.white} strokeWidth={2} />
              {t('new')}
            </button>
          </span>
        </Tooltip>
      </div>
      <div className={styles.table} data-testid="st-sla">
        <div className={styles.th}>
          <span>{t('col.policy')}</span>
          <span>{t('col.scope')}</span>
          <span>{t('col.tier')}</span>
          <span className={styles.c}>{t('col.frtAi')}</span>
          <span className={styles.c}>{t('col.frt')}</span>
          <span className={styles.c}>{t('col.ttrAi')}</span>
          <span className={styles.c}>{t('col.ttr')}</span>
          <span className={styles.c}>{t('col.on')}</span>
          <span />
        </div>
        <div className={styles.tr} data-sla="default">
          <div className={styles.pol}>
            <span className={styles.bar4} style={{ background: p.color }} />
            <div className={styles.min}>
              <div className={styles.pName}>{t('defaultName')}</div>
              <div className={styles.pType}>{t('defaultType')}</div>
            </div>
          </div>
          <span className={styles.scope}>{t('allChannels')}</span>
          <span>
            <span className={styles.tier}>{t('allTiers')}</span>
          </span>
          <span className={cx(styles.c, styles.ai)}>{m(p.frt_ai)}</span>
          <span className={cx(styles.c, styles.hum)}>{m(p.frt_human)}</span>
          <span className={cx(styles.c, styles.aiL)}>{m(p.ttr_ai)}</span>
          <span className={cx(styles.c, styles.humL)}>{m(p.ttr_human)}</span>
          <span className={styles.cFlex}>
            <Tooltip title={t('alwaysOn')}>
              <span>
                <Switch on disabled onChange={() => undefined} label={t('col.on')} />
              </span>
            </Tooltip>
          </span>
          <button type="button" className={styles.edit} onClick={() => setEdit(true)} aria-label={t('edit')} data-testid="st-sla-edit">
            <Icon name="ic-edit" size={15} color="currentColor" />
          </button>
        </div>
      </div>
      <div className={styles.two}>
        <div>
          <div className={styles.secHead}>
            <div className={styles.secT}>{t('hoursT')}</div>
            <span className={styles.grow} />
            <span className={styles.tz}>
              <Icon name="ic-globe" size={13} color={color.text4} />
              {d.tz}
            </span>
          </div>
          <div className={styles.aiNote}>
            <span className={styles.aiNoteIc}>
              <Icon name="ic-spark" size={16} color={color.violet} />
            </span>
            <div className={styles.grow}>
              <div className={styles.aiNoteT}>{t.rich('aiT', { b: (c) => <b>{c}</b> })}</div>
              <div className={styles.aiNoteS}>{t('aiS')}</div>
            </div>
            <span className={styles.aiBadge}>{t('aiOn')}</span>
          </div>
          <div className={styles.card} data-testid="st-sla-hours">
            {d.days.map((x, i) => (
              <div key={x.day} className={cx(styles.day, !x.on && styles.dayOff)} data-day={x.day}>
                <span className={x.on ? styles.dotOn : styles.dotOff} />
                <span className={styles.dName}>{t(`day.${x.day}`)}</span>
                <span className={styles.dHours}>{x.on ? x.from + EN + x.to : DASH + EN + DASH}</span>
                <span className={styles.grow} />
                <button
                  type="button"
                  className={styles.dToggle}
                  onClick={() => putDays(d.days.map((y, j) => (j === i ? { ...y, on: !y.on } : y)))}
                  data-testid={`st-sla-day-${x.day}`}
                >
                  {t(x.on ? 'open' : 'closed')}
                </button>
              </div>
            ))}
            <div className={styles.pause}>
              <div className={styles.grow}>
                <div className={styles.pT}>{t('pause')}</div>
                <div className={styles.pS}>{t('pauseD')}</div>
              </div>
              <Switch on={d.pause_sla} onChange={(v) => putDays(d.days, v)} label={t('pause')} testId="st-sla-pause" />
            </div>
          </div>
        </div>
        <div>
          <div className={styles.secT}>{t('escT')}</div>
          <div className={styles.card} data-testid="st-sla-esc">
            {d.escalation.map((e) => (
              <div key={e.key} className={styles.esc}>
                <span className={styles.escDot} style={{ background: e.color }} />
                <div className={styles.grow}>
                  <div className={styles.escT}>{t(`esc.${e.key}`)}</div>
                  <div className={styles.escA}>{t(`escA.${e.key}`)}</div>
                </div>
                <Switch on={e.on} onChange={(v) => void upd.run({ escalation: { [e.key]: v } }, { silent: true })} label={t(`esc.${e.key}`)} testId={`st-sla-esc-${e.key}`} />
              </div>
            ))}
          </div>
          <div className={styles.risk}>
            <Icon name="ic-spark" size={17} color={color.slaRiskAccent} strokeWidth={1.9} />
            <div>
              <div className={styles.riskT}>{t('riskT')}</div>
              <div className={styles.riskS}>{t('riskS', { n: d.risk.at_risk, a: d.risk.ai, h: d.risk.human })}</div>
            </div>
          </div>
        </div>
      </div>
      {edit ? <SlaPolicyModal p={p} onClose={() => setEdit(false)} /> : null}
    </>
  );
}

export function SlaSection() {
  const q = useQuery(slaQuery());
  return (
    <PageStates state={stateOf(q)} onRetry={() => void q.refetch()}>
      {q.data ? <Body d={q.data} /> : null}
    </PageStates>
  );
}
