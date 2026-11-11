// Chế độ "Danh sách" — prototype bkGroups L3915–3943 / L11123: nhóm theo ngày, dòng lịch hẹn + dòng FOLLOW-UP (sọc tím) xen theo giờ.
'use client';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useFmt } from '@/shared/i18n/useFmt';
import { useCalViewStyles } from '../styles/views.styles';
import { useCalendarUi } from '../calendar-store';
import { useRecordScopes } from '@/shared/assistant/record-intent/store';
import { PAY_TONE, STATUS_TONE } from '../status';
import { hmOf, minOf } from '../dates';
import type { Appointment, CalendarMeta, FollowUp } from '../types';

/** Ô avatar của AI Agent (prototype ownerAv L11152). */
const AI_AV = 'AI';

function AiCell({
  hint,
  name,
  entity,
  id,
}: {
  hint: string;
  name: string;
  entity: 'appointment' | 'follow_up';
  id: string;
}) {
  const t = useTranslations('calendar.list');
  const { styles } = useCalViewStyles();
  const set = useCalendarUi((s) => s.set);
  return (
    <div className={styles.ai} onClick={(e) => e.stopPropagation()}>
      <span className={styles.aiT} title={hint}>{`✦ ${hint}`}</span>
      <button
        type="button"
        className={styles.aiPeek}
        title={t('aiPeek')}
        aria-label={t('aiPeek')}
        onClick={() => {
          useRecordScopes.getState().open({ module: 'calendar', entity, id, label: name });
          set({ aiOpen: true });
        }}
      >
        <Icon name="ic-spark" size={12} color={color.violet} />
      </button>
    </div>
  );
}

function ApptRow({ a, meta }: { a: Appointment; meta: CalendarMeta }) {
  const t = useTranslations('calendar');
  const { styles, cx } = useCalViewStyles();
  const set = useCalendarUi((s) => s.set);
  const sv = meta.services.find((s) => s.id === a.service_id)!;
  const st = meta.staff.find((s) => s.id === a.staff_id)!;
  const [fg, bg] = STATUS_TONE[a.status];
  const pay = a.package ? 'package' : a.pay;
  return (
    <div className={styles.row} onClick={() => set({ detail: a.id })} data-appt={a.id}>
      <div>
        <div className={styles.time}>{hmOf(a.start_at)}</div>
        <div className={styles.sub}>{t('list.dur', { n: minOf(a.end_at) - minOf(a.start_at) })}</div>
      </div>
      <div className={styles.min0}>
        <div className={styles.svc}>
          <span className={styles.sDot} style={{ background: sv.color }} />
          <span className={styles.name}>{sv.name}</span>
        </div>
        <div className={styles.sub}>{a.phone ? `${a.contact_name} · ${a.phone}` : a.contact_name}</div>
      </div>
      <div className={styles.who}>
        <span className={styles.av} style={{ background: st.color }}>
          {st.initial}
        </span>
        <div className={styles.min0}>
          <div className={styles.whoN}>{st.name}</div>
          <div className={styles.whoS}>{st.role}</div>
        </div>
      </div>
      <div>
        <div className={styles.chL}>{t('list.channel')}</div>
        <div className={styles.chV}>{t(`source.${a.source}` as never)}</div>
      </div>
      <div>
        <span className={cx(styles.st)} style={{ color: fg, background: bg }} data-testid="cal-row-status">
          {t(`status.${a.status}`)}
        </span>
      </div>
      <AiCell hint={t('list.hint', { name: st.name })} name={a.contact_name} entity="appointment" id={a.id} />
      <div>
        <span className={styles.pay} style={{ color: PAY_TONE[pay] }}>
          {t(`pay.${pay}` as never)}
        </span>
      </div>
    </div>
  );
}

function FollowRow({ f }: { f: FollowUp }) {
  const t = useTranslations('calendar');
  const { styles, cx } = useCalViewStyles();
  const done = useAction('follow_up.complete');
  const ai = f.owner === 'agent';
  const owner = ai ? t('list.aiOwner') : f.owner;
  return (
    <div className={cx(styles.row, styles.fu)} data-follow={f.id}>
      <div>
        <div className={styles.time}>{hmOf(f.at)}</div>
        <div className={styles.fuTag}>{t('list.followUp')}</div>
      </div>
      <div className={styles.min0}>
        <div className={styles.name}>{f.note}</div>
        <div className={styles.sub}>{`${f.contact_name} · ${f.step}`}</div>
      </div>
      <div className={styles.who}>
        <span className={styles.av} style={{ background: ai ? color.brand : color.slateAvatar }}>
          {ai ? AI_AV : owner.charAt(0)}
        </span>
        <div className={styles.min0}>
          <div className={styles.whoN}>{owner}</div>
          <div className={styles.whoS}>{ai ? t('list.aiSub') : t('list.ownerSub')}</div>
        </div>
      </div>
      <div>
        <div className={styles.chL}>{t('list.careChannel')}</div>
        <div className={styles.chV}>{t(`source.${f.channel}` as never)}</div>
      </div>
      <div>
        <span
          className={styles.due}
          style={{ color: f.due === 'overdue' ? color.dangerStrong : color.amberDeep }}
        >
          {t(`list.due.${f.due}`)}
        </span>
      </div>
      <AiCell
        hint={ai ? t('list.hintAi') : t('list.hintFu', { name: owner })}
        name={f.contact_name}
        entity="follow_up"
        id={f.id}
      />
      <div>
        <button
          type="button"
          className={styles.doneBtn}
          onClick={() => void done.run({ follow_up_id: f.id })}
          data-testid="cal-fu-done"
        >
          {t('list.done')}
        </button>
      </div>
    </div>
  );
}

export function ListView({ rows, meta, day }: { rows: Appointment[]; meta: CalendarMeta; day: string }) {
  const t = useTranslations('calendar');
  const fmt = useFmt();
  const { styles } = useCalViewStyles();
  // Follow-up chỉ thuộc "hôm nay" của workspace; xen theo giờ (prototype đặt giữa danh sách lịch).
  const fus = day === meta.today ? meta.follow_ups : [];
  const items = [...rows.map((a) => ({ at: a.start_at, a })), ...fus.map((f) => ({ at: f.at, f }))].sort(
    (x, y) => x.at.localeCompare(y.at),
  );
  const label = day === meta.today ? t('list.today', { date: fmt.dateLong(day) }) : fmt.dateLong(day);
  return (
    <div className={styles.group} data-testid="cal-list">
      <div className={styles.groupH}>
        {label} <span>{t('list.count', { n: items.length })}</span>
      </div>
      <div className={styles.box}>
        {items.map((x) =>
          'a' in x && x.a ? (
            <ApptRow key={x.a.id} a={x.a} meta={meta} />
          ) : 'f' in x && x.f ? (
            <FollowRow key={x.f.id} f={x.f} />
          ) : null,
        )}
        {items.length ? null : <div className={styles.empty}>{t('empty')}</div>}
      </div>
    </div>
  );
}
