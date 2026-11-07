// Thanh thao tác hàng loạt của Hộp thư (TIP-025b §C.1, Q-019 / DC-250): hiện khi đã chọn ≥ 1 hội thoại — Gán (cần inbox.assign) · Gắn thẻ ·
// Đóng · Lưu trữ · Bỏ chọn. Một thao tác = một lệnh conversation.bulk_update (xem trước → xác nhận); kết quả từng hội thoại ở BulkResultPanel.
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { membersQuery } from '@/features/customers';
import { useCan } from '@/shared/authz/useCan';
import { useBulkStyles } from '../styles/bulk.styles';
import { tagsQuery } from '../api';
import type { InboxSelection } from '../hooks/useInboxSelection';
import type { BulkArgs } from '../hooks/useInboxBulk';

export interface ConversationBulkBarProps {
  selection: InboxSelection;
  visibleIds: string[];
  pending: boolean;
  onRun: (a: BulkArgs) => void;
}

export function ConversationBulkBar({ selection, visibleIds, pending, onRun }: ConversationBulkBarProps) {
  const t = useTranslations('inbox.bulk');
  const { styles } = useBulkStyles();
  const canAssign = useCan('inbox.assign');
  const [assignee, setAssignee] = useState('');
  const [tag, setTag] = useState('');
  const members = useQuery({ ...membersQuery(), enabled: canAssign && selection.active }).data ?? [];
  const tags = useQuery({ ...tagsQuery(), enabled: selection.active }).data ?? [];
  if (!selection.active) return null;
  const run = (a: Omit<BulkArgs, 'ids'>) => onRun({ ids: selection.ids, ...a });

  return (
    <div className={styles.bar} role="toolbar" aria-label={t('label')} data-testid="inbox-bulk-bar">
      <span className={styles.count} data-testid="inbox-bulk-count">
        {t('selected', { n: selection.count })}
      </span>
      <button type="button" className={styles.btn} onClick={() => selection.selectVisible(visibleIds)} data-testid="inbox-bulk-all">
        {t('selectVisible')}
      </button>
      {canAssign ? (
        <>
          <select className={styles.pick} value={assignee} onChange={(e) => setAssignee(e.target.value)} aria-label={t('assignTo')} data-testid="inbox-bulk-assignee">
            <option value="">{t('assignTo')}</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <button type="button" className={styles.btn} disabled={!assignee || pending} onClick={() => run({ op: 'assign', assignee })} data-testid="inbox-bulk-assign">
            <Icon name="ic-users" size={13} color={color.text3} />
            {t('assign')}
          </button>
        </>
      ) : null}
      <select className={styles.pick} value={tag} onChange={(e) => setTag(e.target.value)} aria-label={t('tagPick')} data-testid="inbox-bulk-tagpick">
        <option value="">{t('tagPick')}</option>
        {tags.map((g) => (
          <option key={g.id} value={g.name}>
            {g.emoji ? `${g.emoji} ${g.name}` : g.name}
          </option>
        ))}
      </select>
      <button type="button" className={styles.btn} disabled={!tag || pending} onClick={() => run({ op: 'tag', tag })} data-testid="inbox-bulk-tag">
        {t('tag')}
      </button>
      <button type="button" className={styles.btn} disabled={pending} onClick={() => run({ op: 'close' })} data-testid="inbox-bulk-close">
        {t('close')}
      </button>
      <button type="button" className={styles.btn} disabled={pending} onClick={() => run({ op: 'archive' })} data-testid="inbox-bulk-archive">
        {t('archive')}
      </button>
      <button type="button" className={styles.btn} onClick={selection.clear} aria-label={t('clear')} data-testid="inbox-bulk-clear">
        <Icon name="ic-x" size={13} color={color.text3} />
      </button>
    </div>
  );
}
