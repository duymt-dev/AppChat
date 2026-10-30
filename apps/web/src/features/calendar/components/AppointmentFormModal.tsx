// Modal "Tạo lịch hẹn" — prototype L3998–4027 (540px). Theo Blueprint §3.4 thay ô tự do bằng: Khách · Dịch vụ · Ngày + giờ bắt đầu chọn từ
// slot trống (appointment.find_slots; giờ kết thúc = thời lượng dịch vụ) · KTV · Ghi chú (thanh định dạng như prototype) · Nhắc lịch · Trạng thái.
// Cùng form dùng cho "Đổi giờ" (appointment.reschedule — giữ mã). Trùng giờ → CONFLICT → báo chọn giờ khác.
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ModalShell, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useCalFormStyles } from '../styles/form.styles';
import { useCalendarUi } from '../calendar-store';
import { apptQuery } from '../api';
import { REMINDERS, initialDraft, useApptForm } from '../hooks/useApptForm';
import type { Appointment, CalendarMeta } from '../types';
import { CustomFieldInputs, useCustomDraft } from '@/shared/custom-fields';

const KEYS = { reminders: 'reminders' } as const;
const TOOLS = [
  ['B', 'bold', '**'],
  ['I', 'italic', '_'],
  ['U', 'underline', '__'],
  ['•', 'ul', '\n• '],
  ['1.', 'ol', '\n1. '],
] as const;

export function AppointmentFormModal({ meta }: { meta: CalendarMeta }) {
  const form = useCalendarUi((s) => s.form);
  const prefill = useCalendarUi((s) => s.prefill);
  const reId = form && typeof form === 'object' ? form.reschedule : '';
  const re = useQuery({ ...apptQuery(reId), enabled: !!reId }).data;
  if (!form || (reId && !re)) return null;
  return <ApptForm key={reId || JSON.stringify(prefill)} meta={meta} re={re} prefill={prefill} />;
}

function ApptForm({ meta, re, prefill }: { meta: CalendarMeta; re?: Appointment; prefill: Record<string, unknown> | null }) {
  const t = useTranslations('calendar.form');
  const { styles, cx } = useCalFormStyles();
  const set = useCalendarUi((s) => s.set);
  const f = useApptForm(initialDraft(meta, prefill, re), meta, re?.id);
  const create = useAction<{ appointment_id: string }>('appointment.create');
  const move = useAction('appointment.reschedule');
  const [err, setErr] = useState('');
  const cf = useCustomDraft('appointment');
  const close = () => set({ form: null, prefill: null });
  const onError = (e: { error: { code: string } }) => {
    if (e.error.code !== 'CONFLICT') return false;
    setErr(t('conflict'));
    return true;
  };
  const save = async () => {
    if (!f.valid) return setErr(t('required'));
    if (re) {
      const r = await move.run({ appointment_id: re.id, date: f.d.date, start: f.d.start, staff_id: f.staff }, { onError });
      if (r) close();
      return;
    }
    const c = cf.collect('create');
    if (!c.ok) return;
    const r = await create.run(
      {
        contact_name: f.d.contact_name.trim(),
        ...(f.d.phone ? { phone: f.d.phone } : {}),
        service_id: f.d.service_id,
        staff_id: f.staff,
        date: f.d.date,
        start: f.d.start,
        status: f.d.status,
        reminder_min: f.d.reminder,
        ...(f.d.note.trim() ? { note: f.d.note.trim() } : {}),
        ...(c.custom ? { custom: c.custom } : {}),
      },
      { onError: (e) => onError(e) || cf.absorb(e.error.fields) },
    );
    if (r) set({ form: null, prefill: null, detail: r.result.appointment_id });
  };
  const staffOpts = meta.staff.filter((s) => !f.slot || f.slot.staff_ids.includes(s.id) || s.id === f.d.staff_id);
  return (
    <ModalShell
      open
      stacked
      onClose={close}
      width={540}
      dense
      title={
        <div>
          <div>{re ? t('titleRe', { code: re.code }) : t('title')}</div>
          <div className={styles.sub}>{re ? t('subRe') : t('sub')}</div>
        </div>
      }
      icon="ic-cal"
      iconColor={color.brandInk}
      iconBg={color.brandBg}
      closeLabel={t('close')}
      testId="cal-form"
      footer={
        <>
          <button type="button" className={styles.btn} onClick={close}>
            {t('cancel')}
          </button>
          <button type="button" className={cx(styles.btn, styles.primary)} onClick={() => void save()} data-testid="cal-save">
            {re ? t('saveRe') : t('save')}
          </button>
        </>
      }
    >
      <div className={styles.body}>
        {err ? (
          <div className={styles.err} data-testid="cal-form-err">
            {err}
          </div>
        ) : null}
        <div>
          <label className={styles.label}>{t('customer')}</label>
          <input
            className={styles.input}
            placeholder={t('customerPh')}
            value={f.d.contact_name}
            disabled={!!re}
            onChange={(e) => f.set('contact_name', e.target.value)}
            data-testid="cal-customer"
          />
        </div>
        <div>
          <label className={styles.label}>{t('service')}</label>
          <select
            className={styles.select}
            value={f.d.service_id}
            disabled={!!re}
            onChange={(e) => f.set('service_id', e.target.value)}
            data-testid="cal-service"
          >
            {meta.services.map((s) => (
              <option key={s.id} value={s.id}>
                {`${s.name} · ${s.duration}′`}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.three}>
          <div>
            <label className={styles.label}>{t('date')}</label>
            <input
              type="date"
              className={styles.input}
              value={f.d.date}
              min={meta.today}
              onChange={(e) => f.set('date', e.target.value)}
              data-testid="cal-date"
            />
          </div>
          <div>
            <label className={styles.label}>{t('start')}</label>
            <select
              className={styles.select}
              value={f.d.start}
              onChange={(e) => f.set('start', e.target.value)}
              data-testid="cal-start"
            >
              <option value="">{f.slots.length ? t('slotPh') : t('noSlot')}</option>
              {f.slots.map((s) => (
                <option key={s.start} value={s.start}>
                  {s.start}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={styles.label}>{t('end')}</label>
            <input className={styles.input} value={f.slot?.end ?? ''} disabled data-testid="cal-end" />
          </div>
        </div>
        <div>
          <label className={styles.label}>{t('staff')}</label>
          <select
            className={styles.select}
            value={f.d.staff_id}
            onChange={(e) => f.set('staff_id', e.target.value)}
            data-testid="cal-staff"
          >
            <option value="">{t('anyStaff')}</option>
            {staffOpts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        {re ? null : (
          <>
            <div>
              <label className={styles.label}>{t('note')}</label>
              <div className={styles.rt}>
                <div className={styles.rtBar}>
                  {TOOLS.map(([l, k, mark]) => (
                    <button
                      key={k}
                      type="button"
                      title={t(`tools.${k}`)}
                      aria-label={t(`tools.${k}`)}
                      onClick={() => f.set('note', f.d.note + mark)}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                <textarea
                  className={styles.rtArea}
                  value={f.d.note}
                  onChange={(e) => f.set('note', e.target.value)}
                  data-testid="cal-note"
                />
              </div>
            </div>
            <div className={styles.two}>
              <div>
                <label className={styles.label}>{t('reminder')}</label>
                <select
                  className={styles.select}
                  value={f.d.reminder}
                  onChange={(e) => f.set('reminder', Number(e.target.value))}
                >
                  {(t.raw(KEYS.reminders) as string[]).map((l, i) => (
                    <option key={l} value={REMINDERS[i]}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={styles.label}>{t('status')}</label>
                <select
                  className={styles.select}
                  value={f.d.status}
                  onChange={(e) => f.set('status', e.target.value as 'pending' | 'confirmed')}
                  data-testid="cal-st"
                >
                  <StatusOptions />
                </select>
              </div>
            </div>
          </>
        )}
      </div>
      {re ? null : <CustomFieldInputs draft={cf} />}
    </ModalShell>
  );
}

function StatusOptions() {
  const t = useTranslations('calendar.status');
  return (
    <>
      <option value="pending">{t('pending')}</option>
      <option value="confirmed">{t('confirmed')}</option>
    </>
  );
}
