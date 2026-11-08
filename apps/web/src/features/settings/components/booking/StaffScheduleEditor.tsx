// Ca riêng của nhân sự — ba trạng thái mỗi thứ (TIP-033b §3.1): theo giờ mở cửa (không có dòng) · nghỉ (open=false) · giờ riêng (giao
// với giờ mở cửa). Giá trị là danh sách ngày tường minh; thứ "theo giờ mở cửa" không nằm trong danh sách.
'use client';
import { useTranslations } from 'next-intl';
import type { DayInput } from '@appchat/shared';
import { useSectionStyles } from '../../styles/section.styles';
import { useBookingStyles } from '../../styles/booking.styles';

type Mode = 'inherit' | 'closed' | 'custom';
const WEEK = [0, 1, 2, 3, 4, 5, 6];
const DEF_START = '08:00';
const DEF_END = '17:00';

export function StaffScheduleEditor({ value, onChange, errors }: { value: DayInput[]; onChange: (v: DayInput[]) => void; errors: Record<string, string> }) {
  const t = useTranslations('settings.booking');
  const s = useSectionStyles().styles;
  const { styles } = useBookingStyles();
  const of = (wd: number) => value.find((d) => d.weekday === wd);
  const modeOf = (wd: number): Mode => {
    const d = of(wd);
    return !d ? 'inherit' : d.open ? 'custom' : 'closed';
  };
  const put = (wd: number, d: DayInput | null) => onChange([...value.filter((x) => x.weekday !== wd), ...(d ? [d] : [])].sort((a, b) => a.weekday - b.weekday));
  const setMode = (wd: number, m: Mode) =>
    put(wd, m === 'inherit' ? null : { weekday: wd, open: m === 'custom', start: of(wd)?.start ?? DEF_START, end: of(wd)?.end ?? DEF_END });
  return (
    <div className={styles.stack} data-testid="st-bk-schedule">
      {WEEK.map((wd) => {
        const d = of(wd);
        const err = errors[`schedule.${wd}`];
        return (
          <div key={wd} className={styles.day}>
            <div className={styles.dayName}>{t(`wd.${wd}`)}</div>
            <select className={s.select} value={modeOf(wd)} onChange={(e) => setMode(wd, e.target.value as Mode)} aria-label={t(`wd.${wd}`)} data-testid={`st-bk-mode-${wd}`}>
              <option value="inherit">{t('mode.inherit')}</option>
              <option value="closed">{t('mode.closed')}</option>
              <option value="custom">{t('mode.custom')}</option>
            </select>
            {d?.open ? (
              <div>
                <div className={styles.times}>
                  <input className={s.input} type="time" value={d.start} aria-label={t('from')} onChange={(e) => put(wd, { ...d, start: e.target.value })} data-testid={`st-bk-sstart-${wd}`} />
                  <span>{t('dash')}</span>
                  <input className={s.input} type="time" value={d.end} aria-label={t('to')} onChange={(e) => put(wd, { ...d, end: e.target.value })} data-testid={`st-bk-send-${wd}`} />
                </div>
                {err ? <div className={styles.err}>{t(`err.${err}`)}</div> : null}
              </div>
            ) : (
              <div className={styles.sub}>{modeOf(wd) === 'closed' ? t('closedHint') : t('inheritHint')}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
