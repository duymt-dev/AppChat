// Khung giờ hoạt động của agent (TIP-022b A) — Builder › Phân luồng: chọn Luôn / Giờ hành chính (08:00–17:30 VN, cấu hình cũ) / Tuỳ chỉnh
// (lịch tuần có cấu trúc). `custom` cũ chưa có lịch → cảnh báo "cần cấu hình lịch" (vẫn chạy như cũ, chưa xuất bản mới được tới khi lưu lịch).
// Lịch áp sau khi lưu + xuất bản phiên bản; giờ hoạt động hiệu lực = giao với lịch tài khoản kênh.
'use client';
import { useTranslations } from 'next-intl';
import { emptySchedule } from '@appchat/shared';
import { WeeklyScheduleFields } from '@/shared/forms/WeeklyScheduleFields';
import { useBuilderStyles } from '../../styles/builder.styles';
import { useWeeklySchedule } from '@/shared/forms/useWeeklySchedule';
import type { AgentConfig, WorkingHours } from '../../types';

const HOURS: WorkingHours[] = ['always', 'office', 'custom'];

export function WeeklyScheduleEditor({ cfg, patch, legacy }: { cfg: AgentConfig; patch: (p: Partial<AgentConfig>) => void; legacy?: boolean }) {
  const t = useTranslations('agents.b');
  const { styles: bs } = useBuilderStyles();
  const sched = useWeeklySchedule(cfg.weekly_schedule, (v) => patch({ weekly_schedule: v }), () => window.confirm(t('schedule.overnight')));
  const needs = cfg.working_hours === 'custom' && !cfg.weekly_schedule;
  return (
    <div data-testid="agb-schedule">
      <div className={bs.label}>{t('hours')}</div>
      <select
        className={bs.field}
        value={cfg.working_hours}
        onChange={(e) => {
          const v = e.target.value as WorkingHours;
          patch({ working_hours: v, ...(v === 'custom' && !cfg.weekly_schedule ? { weekly_schedule: emptySchedule() } : {}) });
        }}
        aria-label={t('hours')}
        data-testid="agb-hours"
      >
        {HOURS.map((k) => (
          <option key={k} value={k}>
            {t(`hoursOpt.${k}`)}
          </option>
        ))}
      </select>
      {needs || legacy ? (
        <div className={bs.help} role="alert" data-testid="agb-schedule-warning">
          {t('schedule.needsConfig')}
        </div>
      ) : null}
      {cfg.working_hours === 'custom' && cfg.weekly_schedule ? (
        <>
          <div className={bs.help}>{t('schedule.hint')}</div>
          <WeeklyScheduleFields value={sched.value} errors={sched.errors} onTimezone={sched.onTimezone} onAdd={sched.onAdd} onRemove={sched.onRemove} onChange={sched.onChange} testId="agb-week" />
        </>
      ) : null}
    </div>
  );
}
