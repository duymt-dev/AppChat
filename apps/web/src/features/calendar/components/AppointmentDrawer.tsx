// Drawer chi tiết lịch hẹn — prototype L4187–4231: đầu (trạng thái · dịch vụ · giờ), Khách hàng, KTV, Chi tiết dịch vụ, Ghi chú, Lịch sử, Tự động hoá.
// Chân theo trạng thái (Blueprint §3.4): Đổi giờ + Xác nhận (pending) · Khách đã đến (confirmed) · Hoàn thành (in_progress); ⋯ = Không đến / Huỷ.
// Hoàn thành: thuộc liệu trình → trừ 1 buổi; ngoài liệu trình → thẻ "Tạo đơn cho buổi này?" (chỉ gợi ý — COMMERCE 8b).
'use client';
import { useState } from 'react';
import { App } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ActionMenu, EntityDrawer, Icon, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useCan } from '@/shared/authz/useCan';
import { useFmt } from '@/shared/i18n/useFmt';
import { useCalDetailStyles } from '../styles/detail.styles';
import { useCalendarUi } from '../calendar-store';
import { apptQuery } from '../api';
import { STATUS_TONE } from '../status';
import { hmOf, minOf } from '../dates';
import type { Appointment, CalendarMeta } from '../types';
import { CustomFieldList } from '@/shared/custom-fields';

const SP = ' ';
const initialOf = (name: string) => name.split(SP).at(-1)?.charAt(0) ?? SP;

function Footer({ a }: { a: Appointment }) {
  const t = useTranslations('calendar.detail');
  const { message } = App.useApp();
  const { styles, cx } = useCalDetailStyles();
  const ui = useCalendarUi();
  const can = useCan('booking.manage');
  const [menu, setMenu] = useState(false);
  const confirm = useAction('appointment.confirm');
  const checkIn = useAction('appointment.check_in');
  const noShow = useAction('appointment.mark_no_show');
  const complete = useAction<{ package: { used: number; total: number } | null; suggest_order: boolean }>(
    'appointment.complete',
  );
  if (!can || a.status === 'done' || a.status === 'no_show' || a.status === 'cancelled') return null;
  const finish = async () => {
    const r = await complete.run({ appointment_id: a.id });
    if (!r) return;
    if (r.result.package) void message.success(t('pkgDone', r.result.package));
    if (r.result.suggest_order) ui.set({ suggestFor: a.id });
  };
  const open = a.status === 'pending' || a.status === 'confirmed';
  const primary =
    a.status === 'pending'
      ? { label: t('confirm'), run: () => void confirm.run({ appointment_id: a.id }), id: 'cal-confirm' }
      : a.status === 'confirmed'
        ? { label: t('checkIn'), run: () => void checkIn.run({ appointment_id: a.id }), id: 'cal-checkin' }
        : { label: t('complete'), run: () => void finish(), id: 'cal-complete' };
  return (
    <div className={styles.foot}>
      {open ? (
        <button
          type="button"
          className={styles.act}
          onClick={() => ui.set({ form: { reschedule: a.id } })}
          data-testid="cal-reschedule"
        >
          <Icon name="ic-doc" size={14} color={color.text3} />
          {t('reschedule')}
        </button>
      ) : null}
      <button type="button" className={cx(styles.act, styles.actPrimary)} onClick={primary.run} data-testid={primary.id}>
        <Icon name="ic-check" size={14} color={color.white} strokeWidth={1.9} />
        {primary.label}
      </button>
      {open ? (
        <ActionMenu
          open={menu}
          onToggle={() => setMenu(!menu)}
          onClose={() => setMenu(false)}
          label={t('more')}
          testId="cal-more"
          items={[
            {
              key: 'noshow',
              label: t('noShow'),
              icon: 'ic-clock',
              onClick: () => (setMenu(false), void noShow.run({ appointment_id: a.id })),
            },
            {
              key: 'cancel',
              label: t('cancel'),
              icon: 'ic-x',
              danger: true,
              onClick: () => (setMenu(false), ui.set({ cancelFor: a.id })),
            },
          ]}
        />
      ) : null}
    </div>
  );
}

function Header({ a, meta }: { a: Appointment; meta: CalendarMeta }) {
  const t = useTranslations('calendar');
  const { styles } = useCalDetailStyles();
  const sv = meta.services.find((s) => s.id === a.service_id)!;
  const [fg, bg] = STATUS_TONE[a.status];
  return (
    <div className={styles.head}>
      <div className={styles.stRow}>
        <span className={styles.st} style={{ color: fg, background: bg }} data-testid="cal-status">
          {t(`status.${a.status}`)}
        </span>
      </div>
      <div className={styles.svc}>
        <span className={styles.dot} style={{ background: sv.color }} />
        <div className={styles.svcN}>{sv.name}</div>
      </div>
      <div className={styles.time} data-testid="cal-time">
        {t('detail.time', {
          time: `${hmOf(a.start_at)}`,
          dur: t('list.dur', { n: minOf(a.end_at) - minOf(a.start_at) }),
        })}
      </div>
    </div>
  );
}

export function AppointmentDrawer({ meta }: { meta: CalendarMeta }) {
  const t = useTranslations('calendar');
  const fmt = useFmt();
  const router = useRouter();
  const { styles } = useCalDetailStyles();
  const ui = useCalendarUi();
  const a = useQuery({ ...apptQuery(ui.detail ?? ''), enabled: !!ui.detail }).data;
  const sv = a ? meta.services.find((s) => s.id === a.service_id) : undefined;
  const st = a ? meta.staff.find((s) => s.id === a.staff_id) : undefined;
  const close = () => ui.set({ detail: null, suggestFor: null });
  const confirmAt = a?.reminders.find((r) => r.kind === 'confirm')?.at;
  return (
    <EntityDrawer
      open={!!ui.detail}
      onClose={close}
      title={a?.code ?? ''}
      closeLabel={t('detail.close')}
      testId="cal-drawer"
      header={a ? <Header a={a} meta={meta} /> : null}
      footer={a ? <Footer a={a} /> : null}
    >
      {a && sv && st ? (
        <div className={styles.body}>
          {ui.suggestFor === a.id ? (
            <div className={styles.suggest} data-testid="cal-suggest">
              <b>{t('detail.suggest')}</b>
              {t('detail.suggestHint')}
              <div>
                <button type="button" className={styles.sugBtn} onClick={() => router.push('/orders')}>
                  {t('detail.suggestBtn')}
                </button>
              </div>
            </div>
          ) : null}
          <div className={styles.sec}>{t('detail.customer')}</div>
          <div className={styles.cust}>
            <span className={styles.custAv}>{initialOf(a.contact_name)}</span>
            <div className={styles.grow}>
              <div className={styles.custN}>{a.contact_name}</div>
              <div className={styles.phone}>{a.phone}</div>
            </div>
            <button
              type="button"
              className={styles.iconBtn}
              title={t('detail.chat')}
              aria-label={t('detail.chat')}
              onClick={() => router.push('/inbox')}
            >
              <Icon name="ic-inbox" size={14} color={color.text3} />
            </button>
            {a.phone ? (
              <a className={styles.iconBtn} href={`tel:${a.phone.replace(/\s/g, '')}`} title={t('detail.call')} aria-label={t('detail.call')}>
                <Icon name="ic-phone" size={14} color={color.text3} />
              </a>
            ) : null}
          </div>
          <div className={styles.secRow}>
            <span>{t('detail.staff')}</span>
            <span className={styles.grow} />
            {a.status === 'pending' || a.status === 'confirmed' ? (
              <button type="button" className={styles.link} onClick={() => ui.set({ form: { reschedule: a.id } })}>
                {t('detail.change')}
              </button>
            ) : null}
          </div>
          <div className={styles.staff}>
            <span className={styles.staffAv} style={{ background: st.color }}>
              {st.initial}
            </span>
            <div>
              <div className={styles.staffN}>{st.name}</div>
              <div className={styles.staffR}>{st.role}</div>
            </div>
          </div>
          <div className={styles.sec}>{t('detail.service')}</div>
          <div className={styles.grid}>
            <div>
              <div className={styles.gL}>{t('detail.duration')}</div>
              <div className={styles.gV}>{t('list.dur', { n: minOf(a.end_at) - minOf(a.start_at) })}</div>
            </div>
            <div>
              <div className={styles.gL}>{t('detail.price')}</div>
              <div className={styles.gV}>{fmt.money(sv.price)}</div>
            </div>
            <div>
              <div className={styles.gL}>{t('detail.buffer')}</div>
              <div className={styles.gV}>{t('detail.bufferV', { n: sv.buffer })}</div>
            </div>
            <div>
              <div className={styles.gL}>{t('detail.room')}</div>
              <div className={styles.gV}>{st.room}</div>
            </div>
          </div>
          <div className={styles.sec}>{t('detail.note')}</div>
          <div className={styles.note}>
            {a.status === 'cancelled'
              ? t('detail.cancelled', { reason: a.cancel_reason })
              : a.note || t('detail.noNote')}
          </div>
          <div className={styles.sec}>{t('detail.history')}</div>
          <div className={styles.list}>
            {meta.history.map((h) => (
              <div key={h.at} className={styles.hist}>
                <span>{fmt.date(h.at)}</span>
                <span>{h.service}</span>
                <span className={styles.tag}>{t('detail.doneTag')}</span>
              </div>
            ))}
          </div>
          <div className={styles.sec}>{t('detail.auto')}</div>
          <div className={styles.list}>
            {confirmAt ? (
              <div className={styles.auto}>
                <span className={styles.autoDot} style={{ background: color.successStrong }} />
                {t('detail.autoConfirm', { at: fmt.time(confirmAt) })}
              </div>
            ) : null}
            <div className={styles.auto}>
              <span className={styles.autoDot} style={{ background: color.amberDeep }} />
              {t('detail.autoRemind', { at: fmt.date(a.start_at).slice(0, 5) })}
            </div>
            <div className={styles.auto}>
              <span className={styles.autoDot} style={{ background: color.violet }} />
              {t('detail.autoNps')}
            </div>
          </div>
          {a.package ? (
            <div className={styles.pkg} data-testid="cal-package">
              {t('detail.packageV', a.package)}
            </div>
          ) : null}
          <CustomFieldList entity="appointment" values={a.custom} />
        </div>
      ) : null}
    </EntityDrawer>
  );
}
