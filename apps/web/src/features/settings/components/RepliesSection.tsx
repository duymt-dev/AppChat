// Mục Câu trả lời mẫu — prototype L6053–6077: ô tìm theo tên / shortcut (không dấu) + nút "Câu trả lời mẫu"; nhóm theo danh mục
// (đầu nhóm: icon lưới xanh, tên, "N mẫu"), hàng shortcut mono · tên · ⋯ Sửa mẫu / Xoá. Ghi qua canned_reply.* (xoá hoàn tác 24h).
'use client';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useCan } from '@/shared/authz/useCan';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { useSectionStyles } from '../styles/section.styles';
import { useTagsStyles } from '../styles/tags.styles';
import { useSettingsUi } from '../settings-store';
import { repliesQuery } from '../api';
import type { Reply } from '../types';
import { RowMenu } from './RowMenu';
import { ReplyModal } from './ReplyModal';

export const replyGroups = (rows: Reply[]) => {
  const cats: string[] = [];
  for (const r of rows) if (!cats.includes(r.category)) cats.push(r.category);
  return cats.map((g) => ({ g, items: rows.filter((r) => r.category === g) }));
};

function Item({ r, can }: { r: Reply; can: boolean }) {
  const t = useTranslations('settings.replies');
  const { styles } = useTagsStyles();
  const set = useSettingsUi((u) => u.set);
  const del = useAction('canned_reply.delete');
  return (
    <div className={styles.rRow} data-reply={r.id}>
      <code className={styles.sc}>{r.shortcut}</code>
      <div className={styles.rT}>{r.title}</div>
      <div className={styles.end}>
        {can ? (
          <RowMenu
            id={`reply:${r.id}`}
            items={[
              { key: 'edit', label: t('edit'), icon: 'ic-doc', onClick: () => set({ replyModal: { id: r.id } }) },
              { key: 'del', label: t('del'), icon: 'ic-trash', danger: true, onClick: () => void del.run({ reply_id: r.id }) },
            ]}
          />
        ) : null}
      </div>
    </div>
  );
}

export function RepliesSection() {
  const t = useTranslations('settings.replies');
  const s = useSectionStyles().styles;
  const { styles } = useTagsStyles();
  const ui = useSettingsUi();
  const can = useCan('inbox.manage');
  const q = useQuery(repliesQuery(ui.replyQ));
  const all = useQuery(repliesQuery(''));
  const groups = replyGroups(q.data ?? []);
  return (
    <>
      <div className={styles.bar}>
        <label className={`${s.search} ${styles.fill}`}>
          <Icon name="ic-search" size={14} color={color.text4} strokeWidth={1.9} />
          <input value={ui.replyQ} onChange={(e) => ui.set({ replyQ: e.target.value })} placeholder={t('search')} aria-label={t('search')} data-testid="st-reply-search" />
        </label>
        {can ? (
          <button type="button" className={`${s.primary} ${styles.newSm}`} onClick={() => ui.set({ replyModal: {} })} data-testid="st-reply-new">
            <Icon name="ic-plus" size={14} color={color.white} strokeWidth={2} />
            {t('new')}
          </button>
        ) : null}
      </div>
      <PageStates state={stateOf(q, (d: Reply[]) => d.length === 0)} onRetry={() => void q.refetch()}>
        <div data-testid="st-replies">
          {groups.map(({ g, items }) => (
            <div key={g} className={styles.group} data-group={g}>
              <div className={styles.gHead}>
                <Icon name="ic-grid" size={16} color={color.brand} />
                <div className={styles.gT}>{g}</div>
                <span className={styles.gN}>{t('count', { n: items.length })}</span>
              </div>
              {items.map((r) => (
                <Item key={r.id} r={r} can={can} />
              ))}
            </div>
          ))}
        </div>
      </PageStates>
      {ui.replyModal ? <ReplyModal id={ui.replyModal.id} rows={all.data ?? []} /> : null}
    </>
  );
}
