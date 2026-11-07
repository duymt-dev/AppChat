// Quản lý nhóm Zalo (TIP-025b §A.3–5): ảnh chụp nhà cung cấp (vai trò tài khoản, tổng / quan sát, đọc lúc nào) + làm mới; đổi tên + bật /
// tắt link (cần phiên bản nhóm hiện hành — lệch thì làm mới rồi sửa lại); thêm thành viên từ khách 1-1 cùng tài khoản (≤ 50); kết quả lệnh
// thật theo trạng thái (đang xử lý / xong / lỗi / chưa rõ — không tự gửi lại), thêm thành viên báo từng người. Người chỉ đọc không thấy
// nút quản lý. Không hiện URL link tham gia.
'use client';
import { useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { GROUP_ADD_MAX } from '@appchat/shared';
import { Icon, color } from '@appchat/ui';
import { useModalStyles } from '../styles/modal.styles';
import { groupCandidatesQuery, groupStateQuery } from '../group-api';
import type { useGroupActions } from '../hooks/useGroupActions';

export function GroupManageModal({ convId, title, actions, onClose }: { convId: string; title: string; actions: ReturnType<typeof useGroupActions>; onClose: () => void }) {
  const t = useTranslations('inbox.groupManage');
  const { styles, cx } = useModalStyles();
  const s = useQuery(groupStateQuery(convId)).data;
  const canManage = !!s?.can_manage;
  const cands = useInfiniteQuery(groupCandidatesQuery(convId, canManage && !!s?.supports.add_members));
  const rows = cands.data?.pages.flatMap((p) => p.data) ?? [];
  const [name, setName] = useState(title);
  const [picked, setPicked] = useState<string[]>([]);
  const p = s?.provider;
  const c = actions.command;
  const toggle = (id: string) => setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= GROUP_ADD_MAX ? cur : [...cur, id]));

  return (
    <div className={styles.veil} onClick={onClose} data-testid="group-manage">
      <div className={styles.box} role="dialog" aria-modal="true" aria-label={t('title')} onClick={(e) => e.stopPropagation()}>
        <div className={styles.head}>
          <div className={styles.grow}>
            <div className={styles.hintTitle}>{t('title')}</div>
          </div>
          <button type="button" className={styles.x} onClick={onClose} aria-label={t('close')}>
            <Icon name="ic-x" size={18} color={color.text3} />
          </button>
        </div>
        <div className={styles.aiScroll}>
          <div className={styles.cmds} data-testid="group-provider">
            <div className={styles.cmdLabel}>
              {p ? t('snapshot', { total: p.total ?? '?', observed: s?.observed_members ?? 0, role: t(`role.${p.account_role ?? 'unknown'}` as never) }) : t('noSnapshot', { observed: s?.observed_members ?? 0 })}
            </div>
            {p && !p.complete ? <div className={styles.cmdLabel}>{t('partial')}</div> : null}
            {s?.supports.refresh ? (
              <button type="button" className={cx(styles.cmd, styles.cmdRow)} disabled={actions.pending} onClick={() => void actions.refresh()} data-testid="group-refresh">
                <Icon name="ic-refresh" size={15} color={color.text3} />
                <span className={styles.cmdLabel}>{t('refresh')}</span>
              </button>
            ) : null}
          </div>
          {canManage && s?.supports.update && p?.version ? (
            <div className={styles.cmds}>
              <input className={styles.askInput} value={name} maxLength={100} onChange={(e) => setName(e.target.value)} aria-label={t('name')} data-testid="group-name" />
              <button type="button" className={cx(styles.cmd, styles.cmdRow)} disabled={actions.pending || !name.trim() || name.trim() === p.name} onClick={() => void actions.update({ name: name.trim() }, p.version!)} data-testid="group-rename">
                <span className={styles.cmdLabel}>{t('rename')}</span>
              </button>
              <button type="button" className={cx(styles.cmd, styles.cmdRow)} disabled={actions.pending} onClick={() => void actions.update({ invite_link_enabled: !p.link_enabled }, p.version!)} data-testid="group-link-toggle">
                <span className={styles.cmdLabel}>{t(p.link_enabled ? 'linkOff' : 'linkOn')}</span>
              </button>
            </div>
          ) : canManage && s?.supports.update ? (
            <div className={styles.cmdLabel}>{t('refreshFirst')}</div>
          ) : null}
          {canManage && s?.supports.add_members ? (
            <div className={styles.cmds}>
              <div className={styles.cmdLabel}>{t('addTitle', { n: picked.length, max: GROUP_ADD_MAX })}</div>
              {rows.map((r) => (
                <button key={r.conversation_id} type="button" className={cx(styles.cmd, styles.cmdRow)} onClick={() => toggle(r.conversation_id)} aria-pressed={picked.includes(r.conversation_id)} data-testid="group-candidate">
                  <Icon name={picked.includes(r.conversation_id) ? 'ic-check' : 'ic-users'} size={15} color={picked.includes(r.conversation_id) ? color.brand : color.text3} />
                  <span className={styles.cmdLabel}>{r.title}</span>
                </button>
              ))}
              {cands.hasNextPage ? (
                <button type="button" className={cx(styles.cmd, styles.cmdRow)} onClick={() => void cands.fetchNextPage()}>
                  <span className={styles.cmdLabel}>{t('more')}</span>
                </button>
              ) : null}
              <button type="button" className={cx(styles.cmd, styles.cmdRow)} disabled={actions.pending || !picked.length} onClick={() => void actions.addMembers(picked).then((ok) => ok && setPicked([]))} data-testid="group-add">
                <span className={styles.cmdLabel}>{t('add')}</span>
              </button>
            </div>
          ) : null}
          {c ? (
            <div className={styles.cmds} role="status" data-testid="group-command" data-state={c.state}>
              <div className={styles.cmdLabel}>{t(`state.${c.state}` as never)}</div>
              {c.members?.map((m) => (
                <div key={m.id} className={styles.cmdLabel} data-testid="group-command-member" data-status={m.status}>
                  {t(`member.${m.status}` as never)}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
