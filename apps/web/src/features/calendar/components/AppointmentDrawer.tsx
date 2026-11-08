// Drawer chi tiết lịch hẹn — prototype L4187–4231: đầu (trạng thái · dịch vụ · giờ), Khách hàng, KTV, Chi tiết dịch vụ, Ghi chú, Lịch sử, Tự động hoá.
// Đầu = AppointmentHeader; chân theo trạng thái = AppointmentFooter (gồm xác nhận lại lịch hết giữ chỗ — TIP-033b).
'use client';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { EntityDrawer, Icon, color } from '@appchat/ui';
import { useFmt } from '@/shared/i18n/useFmt';
import { useCalDetailStyles } from '../styles/detail.styles';
import { useCalendarUi } from '../calendar-store';
import { apptQuery } from '../api';
import { minOf } from '../dates';
import type { Appointment, CalendarMeta } from '../types';
import { CustomFieldList } from '@/shared/custom-fields';
import { AppointmentHeader } from './AppointmentHeader';
import { AppointmentFooter } from './AppointmentFooter';

const SP = ' ';
const initialOf = (name: string) => name.split(SP).at(-1)?.charAt(0) ?? SP;

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
      header={a ? <AppointmentHeader a={a} meta={meta} /> : null}
      footer={a ? <AppointmentFooter a={a} /> : null}
    >
      {a && sv && st ? (
        <div className={styles.body}>
          {ui.suggestFor === a.id ? (
            <div className={styles.suggest} data-testid="cal-suggest">
              <b>{t('detail.suggest')}</b>
              {t('detail.suggestHint')}
              <div>
                <button
                  type="button"
                  className={styles.sugBtn}
                  onClick={() => router.push(`/orders?from_appointment=${a.id}`)}
                  data-testid="cal-suggest-order"
                >
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
