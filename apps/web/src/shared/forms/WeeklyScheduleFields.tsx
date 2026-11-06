// Ô nhập lịch tuần dùng chung (TIP-022b): Builder agent (Phân luồng › Khung giờ) + drawer Quản lý kênh (Trả lời tự động). Múi IANA + 7 ngày
// (Thứ Hai đầu tuần) × tối đa 4 khoảng "HH:mm–HH:mm"; khoảng qua đêm hỏi xác nhận rồi tách sang ngày sau (không đoán). Lỗi hiển thị theo
// mã validate chung với server (`validateSchedule`). Chỉ token, chữ qua i18n `common.schedule`.
'use client';
import { createStyles } from 'antd-style';
import { useTranslations } from 'next-intl';
import { MAX_INTERVALS_PER_DAY, type ScheduleError, type WeeklyScheduleDto } from '@appchat/shared';
import { color, font, layout, radius } from '@appchat/ui';

const ZONES = ['Asia/Ho_Chi_Minh', 'Asia/Bangkok', 'Asia/Singapore', 'Asia/Tokyo', 'UTC'];

const useStyles = createStyles(({ css, responsive }) => ({
  wrap: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  day: css`
    display: grid;
    grid-template-columns: 88px 1fr;
    gap: 8px;
    align-items: start;
    ${responsive.md} {
      grid-template-columns: 1fr;
    }
  `,
  dayName: css`
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text2};
    padding-top: 8px;
  `,
  list: css`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  `,
  iv: css`
    display: inline-flex;
    gap: 4px;
    align-items: center;
  `,
  time: css`
    height: 36px;
    padding: 0 8px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    background: ${color.surface};
    color: ${color.text};
    font-family: inherit;
    font-size: ${font.scale.s13}px;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  bad: css`
    border-color: ${color.danger};
  `,
  link: css`
    border: 0;
    background: transparent;
    color: ${color.brandInk};
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.semibold};
    cursor: pointer;
    padding: 4px;
    &:disabled {
      color: ${color.text4};
      cursor: not-allowed;
    }
  `,
  off: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    padding-top: 8px;
  `,
  err: css`
    font-size: ${font.scale.s12}px;
    color: ${color.danger};
  `,
}));

export interface WeeklyScheduleFieldsProps {
  value: WeeklyScheduleDto;
  errors: Record<string, ScheduleError>;
  onTimezone: (tz: string) => void;
  onAdd: (day: number) => void;
  onRemove: (day: number, idx: number) => void;
  onChange: (day: number, idx: number, key: 'from' | 'to', v: string) => void;
  disabled?: boolean;
  testId: string;
}

export function WeeklyScheduleFields({ value, errors, onTimezone, onAdd, onRemove, onChange, disabled, testId }: WeeklyScheduleFieldsProps) {
  const t = useTranslations('common.schedule');
  const { styles, cx } = useStyles();
  const errOf = (d: number, i?: number) => errors[i === undefined ? `days.${d}` : `days.${d}.${i}`];
  const zones = ZONES.includes(value.timezone) ? ZONES : [value.timezone, ...ZONES];
  return (
    <div className={styles.wrap} data-testid={testId}>
      <select className={styles.time} value={value.timezone} onChange={(e) => onTimezone(e.target.value)} disabled={disabled} aria-label={t('timezone')} data-testid={`${testId}-tz`}>
        {zones.map((z) => (
          <option key={z} value={z}>
            {z}
          </option>
        ))}
      </select>
      {errors.timezone ? <div className={styles.err}>{t('err.timezone')}</div> : null}
      {value.days.map((ivs, d) => (
        <div key={d} className={styles.day} data-testid={`${testId}-day-${d}`}>
          <div className={styles.dayName}>{t(`day.${d}` as never)}</div>
          <div className={styles.list}>
            {ivs.length ? null : <span className={styles.off}>{t('closed')}</span>}
            {ivs.map((iv, i) => (
              <span key={i} className={styles.iv}>
                <input type="time" className={cx(styles.time, errOf(d, i) && styles.bad)} value={iv.from} onChange={(e) => onChange(d, i, 'from', e.target.value)} disabled={disabled} aria-label={t('from')} data-testid={`${testId}-${d}-${i}-from`} />
                <span aria-hidden>{t('sep')}</span>
                <input type="time" className={cx(styles.time, errOf(d, i) && styles.bad)} value={iv.to === '24:00' ? '23:59' : iv.to} onChange={(e) => onChange(d, i, 'to', e.target.value === '23:59' ? '24:00' : e.target.value)} disabled={disabled} aria-label={t('to')} data-testid={`${testId}-${d}-${i}-to`} />
                <button type="button" className={styles.link} onClick={() => onRemove(d, i)} disabled={disabled} aria-label={t('remove')} data-testid={`${testId}-${d}-${i}-rm`}>
                  ✕
                </button>
                {errOf(d, i) ? <span className={styles.err}>{t(`err.${errOf(d, i)}` as never)}</span> : null}
              </span>
            ))}
            <button type="button" className={styles.link} onClick={() => onAdd(d)} disabled={disabled || ivs.length >= MAX_INTERVALS_PER_DAY} data-testid={`${testId}-${d}-add`}>
              {t('add')}
            </button>
            {errOf(d) ? <span className={styles.err}>{t(`err.${errOf(d)}` as never)}</span> : null}
          </div>
        </div>
      ))}
    </div>
  );
}
