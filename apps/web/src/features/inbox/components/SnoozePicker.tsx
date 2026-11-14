// Chọn mốc tạm ẩn hội thoại (TIP-014c): +1h / +3h / "Sáng mai" 08:00 ngày làm việc kế (business-time) / "Tuỳ chọn ngày giờ".
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  DEFAULT_WORKING_DAYS,
  nextMorningSnoozeUtc,
  utcToWall,
  wallToUtc,
  type BusinessCalendar,
} from '@appchat/shared';
import { useRowStyles } from '../styles/row.styles';

const OPTS = ['1h', '3h', 'tomorrow', 'custom'] as const;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

interface Props {
  timeZone: string;
  calendar?: BusinessCalendar;
  now?: () => Date;
  onPick: (snoozedUntilIso: string) => void;
}

export function SnoozePicker({ timeZone, calendar, now = () => new Date(), onPick }: Props) {
  const t = useTranslations('inbox.list');
  const { styles } = useRowStyles();
  const cal: BusinessCalendar = calendar ?? { timeZone, days: DEFAULT_WORKING_DAYS, enabled: true };
  const [customOpen, setCustomOpen] = useState(false);
  const [date, setDate] = useState(() => utcToWall(new Date(now().getTime() + DAY_MS), cal.timeZone).date);
  const [time, setTime] = useState('09:00');
  const [error, setError] = useState<string | null>(null);

  const pickPreset = (opt: (typeof OPTS)[number]) => {
    setError(null);
    if (opt === 'custom') {
      setCustomOpen((v) => !v);
      return;
    }
    const cur = now();
    if (opt === '1h') return onPick(new Date(cur.getTime() + HOUR_MS).toISOString());
    if (opt === '3h') return onPick(new Date(cur.getTime() + 3 * HOUR_MS).toISOString());
    onPick(nextMorningSnoozeUtc(cur, cal).toISOString());
  };

  const applyCustom = () => {
    const cur = now();
    if (!date || !time) return void setError(t('snoozePastError'));
    const target = wallToUtc(date, time, cal.timeZone);
    if (!Number.isFinite(target.getTime()) || target.getTime() <= cur.getTime()) {
      return void setError(t('snoozePastError'));
    }
    setError(null);
    onPick(target.toISOString());
  };

  return (
    <div className={styles.subList}>
      {OPTS.map((k) => (
        <button key={k} type="button" className={styles.item} onClick={() => pickPreset(k)} data-testid={`snooze-opt-${k}`}>
          <span className={styles.dot} />
          <span className={styles.grow}>{t(`snoozeOpts.${k}` as never)}</span>
        </button>
      ))}
      {customOpen ? (
        <div className={styles.snoozeCustom}>
          <label className={styles.snoozeField}>
            <span className={styles.snoozeLabel}>{t('snoozeDate')}</span>
            <input
              type="date"
              className={styles.snoozeInput}
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setError(null);
              }}
              data-testid="snooze-custom-date"
            />
          </label>
          <label className={styles.snoozeField}>
            <span className={styles.snoozeLabel}>{t('snoozeTime')}</span>
            <input
              type="time"
              className={styles.snoozeInput}
              value={time}
              onChange={(e) => {
                setTime(e.target.value);
                setError(null);
              }}
              data-testid="snooze-custom-time"
            />
          </label>
          {error ? (
            <div className={styles.snoozeError} data-testid="snooze-custom-error">
              {error}
            </div>
          ) : null}
          <button type="button" className={styles.doneBtn} onClick={applyCustom} data-testid="snooze-custom-apply">
            {t('snoozeApply')}
          </button>
        </div>
      ) : null}
    </div>
  );
}
