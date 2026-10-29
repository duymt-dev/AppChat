// Thẻ bản nháp AI cuối luồng tin — prototype L1789–1795 ("AI gợi ý trả lời").
// Dùng chung cho banner "Cần người" (handoff — không có trong prototype): giữ nguyên khung, đổi icon chuông đỏ,
// tiêu đề = lý do chuyển người, nhãn "Cần người", nút "Nhận xử lý".
'use client';
import type { ReactNode } from 'react';
import { Icon, color } from '@appchat/ui';
import { useComposerStyles } from '../styles/composer.styles';

export interface AiDraftCardProps {
  title: string;
  badge: string;
  body: ReactNode;
  /** Lý do chuyển người — có thì thẻ ở dạng handoff. */
  reason?: string;
  actions: ReactNode;
  testId: string;
}

export function AiDraftCard({ title, badge, body, reason, actions, testId }: AiDraftCardProps) {
  const { styles, cx } = useComposerStyles();
  const handoff = reason !== undefined;
  return (
    <div className={styles.suggest} data-testid={testId}>
      <div className={styles.suggestHead}>
        <span className={cx(styles.suggestIcon, handoff && styles.suggestIconHandoff)}>
          <Icon name={handoff ? 'ic-bell' : 'ic-spark'} size={13} color={color.white} />
        </span>
        <span className={styles.suggestTitle} title={reason}>
          {handoff ? `${title}: ${reason}` : title}
        </span>
        <span className={cx(styles.conf, handoff && styles.confHandoff)}>{badge}</span>
      </div>
      <div className={styles.suggestBody}>
        <div className={styles.suggestText}>{body}</div>
        <div className={styles.actions}>{actions}</div>
      </div>
    </div>
  );
}
