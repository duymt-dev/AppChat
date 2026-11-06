// "Việc cần tôi" (TIP-038 pha 2, Blueprint §7 NeedsMe): việc thật trong scope người xem — chờ duyệt, AI chuyển người, ticket vượt SLA, lịch
// quá giờ, hợp đồng sắp hết hạn. Mỗi dòng mở đúng màn; gia hạn hợp đồng có nút nhờ Trợ lý soạn đề xuất (mở Trợ lý với câu hỏi — không tự gửi).
'use client';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Icon, color, type IconName } from '@appchat/ui';
import { SectionCard } from './SectionCard';
import { useWorkStyles } from './work.styles';
import type { WorkItem } from '../types';

const ICON: Record<WorkItem['type'], IconName> = {
  approval: 'ic-shield',
  handoff: 'ic-inbox',
  ticket_overdue: 'ic-ticket',
  appointment_overdue: 'ic-cal',
  contract_renewal: 'ic-doc',
};

export function MyWorkPanel({ items }: { items: WorkItem[] }) {
  const t = useTranslations('dashboard.work');
  const router = useRouter();
  const { styles, cx } = useWorkStyles();
  return (
    <SectionCard index={5} accent={color.warnAmber} title={t('title')} sub={t('sub')} testId="dash-my-work">
      {items.length === 0 ? <div className={styles.empty}>{t('empty')}</div> : null}
      <div className={styles.list}>
        {items.map((w) => (
          <div key={`${w.type}:${w.id}`} className={styles.row} data-work={w.type}>
            <span className={styles.icon}>
              <Icon name={ICON[w.type]} size={15} strokeWidth={1.9} color={color.okText} />
            </span>
            <div className={styles.grow}>
              <div className={styles.title}>{w.title}</div>
              <div className={styles.sub}>{w.sub}</div>
            </div>
            {w.ask ? (
              <button type="button" className={cx(styles.btn, styles.ask)} onClick={() => router.push(`/assistant?ask=${encodeURIComponent(w.ask!)}&from=${encodeURIComponent(w.route)}`)}>
                {t('askRenewal')}
              </button>
            ) : null}
            <button type="button" className={styles.btn} onClick={() => router.push(w.route)}>
              {t('open')}
            </button>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
