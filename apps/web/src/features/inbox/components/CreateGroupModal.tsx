// Modal "Tạo nhóm" (TIP-023b SPEC D): tên nhóm + chọn khách từ hội thoại 1-1 của CÙNG tài khoản Zalo (chỉ định danh đã biết — không nhập
// số điện thoại). Gửi xong chỉ báo "đang xử lý" theo trạng thái thật: queued / running → đang tạo; succeeded → mở nhóm; failed / unknown →
// báo rõ (unknown: có thể nhóm đã tạo phía Zalo — không tự tạo lại).
'use client';
import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useModalStyles } from '../styles/modal.styles';
import { useInboxUi } from '../inbox-store';
import { conversationsQuery } from '../api';
import { useCreateGroup } from '../hooks/useCreateGroup';

export function CreateGroupModal() {
  const t = useTranslations('inbox.createGroup');
  const { styles, cx } = useModalStyles();
  const ui = useInboxUi();
  const list = useInfiniteQuery(conversationsQuery());
  const g = useCreateGroup();
  const all = list.data?.pages.flatMap((p) => p.data) ?? [];
  const seed = all.find((c) => c.id === ui.groupFrom);
  const [name, setName] = useState('');
  const [picked, setPicked] = useState<string[]>(() => (ui.groupFrom ? [ui.groupFrom] : []));
  const close = () => ui.set({ modal: null, groupFrom: null });

  if (!ui.groupFrom) return null;
  const account = seed?.channel_account_id;
  const rows = all.filter((c) => c.kind === 'direct' && c.channel_account_id && c.channel_account_id === account);
  const toggle = (id: string) => setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const submit = () => {
    if (!account || !name.trim() || !picked.length) return;
    void g.submit({ channel_account_id: account, name: name.trim(), conversation_ids: picked });
  };
  const st = g.request?.status ?? (g.requestId ? 'queued' : null);

  return (
    <div className={styles.veil} onClick={close} data-testid="create-group-modal">
      <div className={styles.box} role="dialog" aria-modal="true" aria-label={t('title')} onClick={(e) => e.stopPropagation()}>
        <div className={styles.head}>
          <div className={styles.grow}>
            <div className={styles.hintTitle}>{t('title')}</div>
          </div>
          <button type="button" className={styles.x} onClick={close} aria-label={t('close')}>
            <Icon name="ic-x" size={18} color={color.text3} />
          </button>
        </div>
        <div className={styles.aiScroll}>
          {st ? (
            <div className={styles.cmds} data-testid="create-group-status" data-status={st}>
              <div className={styles.cmdLabel}>{t(`status.${st}` as never)}</div>
              {st === 'succeeded' && g.request?.conversation_id ? (
                <button type="button" className={cx(styles.cmd, styles.cmdRow)} onClick={() => { ui.select(g.request!.conversation_id!); close(); }}>
                  <span className={styles.cmdLabel}>{t('open')}</span>
                </button>
              ) : null}
            </div>
          ) : (
            <>
              <input className={styles.askInput} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('name')} aria-label={t('name')} maxLength={100} autoFocus />
              <div className={styles.cmdLabel}>{t('members', { count: picked.length })}</div>
              <div className={styles.cmds}>
                {rows.map((c) => (
                  <button key={c.id} type="button" className={cx(styles.cmd, styles.cmdRow)} onClick={() => toggle(c.id)} aria-pressed={picked.includes(c.id)} data-testid="create-group-member">
                    <Icon name={picked.includes(c.id) ? 'ic-check' : 'ic-users'} size={15} color={picked.includes(c.id) ? color.brand : color.text3} />
                    <span className={styles.cmdLabel}>{c.title}</span>
                  </button>
                ))}
              </div>
              <div className={styles.cmdLabel}>{t('notice')}</div>
              <button type="button" className={cx(styles.cmd, styles.cmdRow)} disabled={g.pending || !name.trim() || !picked.length} onClick={submit} data-testid="create-group-submit">
                <span className={styles.cmdLabel}>{t('submit')}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
