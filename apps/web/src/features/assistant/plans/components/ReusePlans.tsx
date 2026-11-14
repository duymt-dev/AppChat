// Gợi ý dùng lại cách làm trước (TIP-023d §4, §6.1): chỉ cấu trúc chung của chính người dùng (server xếp hạng tất định); bấm → plan_reuse
// tạo bản nháp MỚI (không chạy gì) — lượt Cowork kế tiếp gửi kèm `plan_draft` để bắt đầu. Không gợi ý → không hiện gì.
'use client';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useAction } from '@/shared/actions/useAction';
import { usePlanStyles } from '../plan.styles';
import { reusableQuery } from '../api';

export function ReusePlans({ text, sessionId, onDraft }: { text: string; sessionId: string | undefined; onDraft: (d: { plan_id: string; revision: number }) => void }) {
  const t = useTranslations('assistant.plan');
  const { styles } = usePlanStyles();
  const q = useQuery({ ...reusableQuery(text), enabled: !!sessionId });
  const reuse = useAction<{ plan_id: string; revision: number }>('assistant.plan_reuse');
  const rows = q.data ?? [];
  if (!sessionId || !rows.length) return null;
  return (
    <div className={styles.reuse} data-testid="plan-reuse">
      <span className={styles.meta}>{t('reuseLead')}</span>
      {rows.map((c) => (
        <button
          key={c.id}
          type="button"
          className={styles.chip}
          disabled={reuse.isPending}
          data-testid="plan-reuse-item"
          onClick={async () => {
            const r = await reuse.run({ candidate_id: c.id, session_id: sessionId });
            if (r) onDraft({ plan_id: r.result.plan_id, revision: r.result.revision });
          }}
        >
          {t('reuseItem', { title: c.generic_title, n: c.step_count })}
        </button>
      ))}
    </div>
  );
}
