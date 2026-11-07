// Thẻ tác vụ tự chủ — prototype L1361–1366: icon, tên + trạng thái, công tắc, phòng ban / mức AI / kênh, chỉ số 24h, ngưỡng bàn giao.
'use client';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useCoworkStyles } from '../styles/cowork.styles';
import type { AiTask, AiTasksPayload } from '../types';

const SPARK = [42, 55, 48, 68, 60, 80, 72];

export interface TaskCardProps {
  task: AiTask;
  departments: AiTasksPayload['departments'];
  onOpen: () => void;
  onToggle?: () => void;
}

export function TaskCard({ task: a, departments, onOpen, onToggle }: TaskCardProps) {
  const t = useTranslations('assistant');
  const { styles } = useCoworkStyles();
  const dept = departments.find((d) => d.key === a.department) ?? departments[0]!;
  return (
    <div className={styles.task} onClick={onOpen} data-testid="cw-task" data-task={a.id}>
      <div className={styles.taskHead}>
        <span className={styles.taskIcon}>
          <Icon name="ic-bot" size={20} color={color.white} />
        </span>
        <div className={styles.grow}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className={styles.taskName}>{a.name}</div>
            <span className={styles.st} style={a.active ? { color: color.okStrong, background: color.brandBg } : { color: color.text4, background: color.pillBg }}>
              {t(`agentStatus.${a.active ? 'active' : 'paused'}`)}
            </span>
          </div>
          <div className={styles.taskRole}>{a.role}</div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={a.active}
          aria-label={t('cw.toggle', { name: a.name })}
          className={styles.sw}
          style={{ background: a.active ? color.brand : color.border }}
          disabled={!onToggle}
          onClick={(e) => {
            e.stopPropagation();
            onToggle?.();
          }}
        >
          <span style={{ left: a.active ? 20 : 2 }} />
        </button>
      </div>
      <div className={styles.tags}>
        <span className={styles.tag} style={{ color: dept.fg, background: dept.bg }}>
          {a.department}
        </span>
        <span className={styles.tag} style={{ color: color.text3, background: color.pillBg }}>
          {t('cw.tierTag', { tier: t(`tier.${a.model_tier}`) })}
        </span>
        {a.channels.map((c) => (
          <span key={c} className={styles.chan}>
            {c}
          </span>
        ))}
      </div>
      <div className={styles.metrics}>
        <div>
          <div className={styles.mLabel}>{t('cw.runs')}</div>
          <div className={styles.mVal}>{a.runs}</div>
        </div>
        <div>
          <div className={styles.mLabel}>{t('cw.success')}</div>
          <div className={styles.mVal} style={{ color: color.brand }}>
            {a.success}
          </div>
        </div>
        <div>
          <div className={styles.mLabel}>{t('cw.cost')}</div>
          <div className={styles.mVal}>{a.cost}</div>
        </div>
        <div className={styles.spark} aria-hidden="true">
          {SPARK.map((h, i) => (
            <span key={i} style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
      <div className={styles.conf}>
        <div className={styles.bar}>
          <span style={{ width: `${a.conf}%` }} />
        </div>
        <span className={styles.confLabel}>{t('cw.handoff', { n: a.conf })}</span>
      </div>
    </div>
  );
}
