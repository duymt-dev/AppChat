// Giờ mở cửa nhận lịch (TIP-033b §3.1–§3.2): 7 thứ (0 = Thứ Hai) mở / nghỉ + giờ, bước lưới slot, đệm mặc định, no-show có trừ buổi
// (COMMERCE §6 — mặc định không). Lỗi theo thứ hiển thị tại chỗ (cùng `dayErrors` với server); Lưu gửi if_version, 409 giữ nháp.
'use client';
import { useTranslations } from 'next-intl';
import { useSectionStyles } from '../../styles/section.styles';
import { useBookingStyles } from '../../styles/booking.styles';
import type { useBookingSettings } from '../../hooks/useBookingSettings';

const STEPS = [5, 10, 15, 20, 30, 60];

export function BusinessHoursForm({ f, readOnly }: { f: ReturnType<typeof useBookingSettings>; readOnly: boolean }) {
  const t = useTranslations('settings.booking');
  const s = useSectionStyles().styles;
  const { styles } = useBookingStyles();
  const d = f.draft;
  if (!d) return null;
  return (
    <div className={styles.box} data-testid="st-bk-hours">
      <div className={styles.title}>{t('hours')}</div>
      {d.days.map((day) => {
        const err = f.errors[`days.${day.weekday}`];
        return (
          <div key={day.weekday} className={styles.day} data-testid={`st-bk-day-${day.weekday}`}>
            <div className={styles.dayName}>{t(`wd.${day.weekday}`)}</div>
            <label className={styles.check}>
              <input type="checkbox" checked={day.open} disabled={readOnly} onChange={(e) => f.setDay(day.weekday, { open: e.target.checked })} data-testid={`st-bk-open-${day.weekday}`} />
              {day.open ? t('open') : t('closed')}
            </label>
            {day.open ? (
              <div>
                <div className={styles.times}>
                  <input className={s.input} type="time" value={day.start} disabled={readOnly} aria-label={t('from')} onChange={(e) => f.setDay(day.weekday, { start: e.target.value })} data-testid={`st-bk-start-${day.weekday}`} />
                  <span>{t('dash')}</span>
                  <input className={s.input} type="time" value={day.end} disabled={readOnly} aria-label={t('to')} onChange={(e) => f.setDay(day.weekday, { end: e.target.value })} data-testid={`st-bk-end-${day.weekday}`} />
                </div>
                {err ? <div className={styles.err}>{t(`err.${err}`)}</div> : null}
              </div>
            ) : (
              <div className={styles.sub}>{t('closedHint')}</div>
            )}
          </div>
        );
      })}
      <div className={styles.three}>
        <div>
          <div className={s.label}>{t('step')}</div>
          <select className={s.select} value={d.step} disabled={readOnly} onChange={(e) => f.patch({ step: Number(e.target.value) })} data-testid="st-bk-step">
            {STEPS.map((n) => (
              <option key={n} value={n}>
                {t('minutes', { n })}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className={s.label}>{t('buffer')}</div>
          <input className={s.input} inputMode="numeric" value={d.buffer} disabled={readOnly} onChange={(e) => f.patch({ buffer: Math.min(240, Number(e.target.value.replace(/\D/g, '') || 0)) })} data-testid="st-bk-buffer" />
        </div>
        <label className={styles.check}>
          <input type="checkbox" checked={d.noShow} disabled={readOnly} onChange={(e) => f.patch({ noShow: e.target.checked })} data-testid="st-bk-noshow" />
          {t('noShow')}
        </label>
      </div>
      <div className={styles.sub}>{t('futureNote')}</div>
      {readOnly ? null : (
        <div className={styles.foot}>
          <button type="button" className={s.ghost} disabled={!f.dirty || f.saving} onClick={f.reset} data-testid="st-bk-reset">
            {t('reset')}
          </button>
          <button type="button" className={s.primary} disabled={!f.dirty || f.saving || Object.keys(f.errors).length > 0} onClick={() => void f.submit()} data-testid="st-bk-save">
            {t('save')}
          </button>
        </div>
      )}
    </div>
  );
}
