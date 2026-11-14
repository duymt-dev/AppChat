// Thông tin nhóm Zalo — prototype L1904–1940: tiêu đề · avatar nhóm · 4 nút nhanh · thành viên · link mời; phần dưới ở GroupSections.
// TIP-025b §A: Tắt thông báo = lệnh tắt cho TÀI KHOẢN Zalo; Ghim = ghim hội thoại trong AppChat (conversation.pin); Thêm / Quản lý mở
// GroupManageModal. Nút chỉ hiện khi kênh hỗ trợ + có quyền; link tham gia chỉ báo bật / tắt, sao chép qua GroupLinkRow (§A.6).
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAction } from '@/shared/actions/useAction';
import { useTranslations } from 'next-intl';
import { Icon, color, type IconName } from '@appchat/ui';
import { usePanelStyles } from '../styles/panel.styles';
import { useGroupStyles } from '../styles/group.styles';
import { useInboxUi } from '../inbox-store';
import { groupQuery } from '../api';
import { GroupSections } from './GroupSections';
import { GroupManageModal } from './GroupManageModal';
import { GroupLinkRow } from './GroupLinkRow';
import { groupStateQuery } from '../group-api';
import { useGroupActions } from '../hooks/useGroupActions';
import type { Conversation } from '../types';

type Act = 'mute' | 'pin' | 'add' | 'manage';
const ACTS: [IconName, Act][] = [
  ['ic-bell', 'mute'],
  ['ic-pin', 'pin'],
  ['ic-user-plus', 'add'],
  ['ic-cog', 'manage'],
];

export function GroupInfoPanel({ conv }: { conv: Conversation }) {
  const t = useTranslations('inbox.group');
  const { styles: p, cx } = usePanelStyles();
  const { styles } = useGroupStyles();
  const ui = useInboxUi();
  const g = useQuery(groupQuery(conv.id)).data;
  const [membersOpen, setMembersOpen] = useState(false);
  const [manage, setManage] = useState(false);
  const st = useQuery(groupStateQuery(conv.id)).data;
  const ga = useGroupActions(conv.id);
  const pin = useAction('conversation.pin');
  const muted = !!st?.provider?.muted;
  const shown = (k: Act) => (k === 'pin' ? true : k === 'mute' ? !!st?.can_manage && !!st.supports.set_mute : !!st?.can_manage && (k === 'add' ? st.supports.add_members : true));
  const onAct = (k: Act) => {
    if (k === 'mute') void ga.setMute(!muted);
    else if (k === 'pin') void pin.run({ conversation_id: conv.id, pinned: !conv.pinned });
    else setManage(true);
  };

  return (
    <aside className={cx(p.panel, p.group)} data-testid="group-info">
      <div className={styles.top}>
        {t('title')}
        <button type="button" className={cx(p.close, styles.topClose)} onClick={ui.toggle360} aria-label={t('close')}>
          <Icon name="ic-x" size={18} color={color.text3} />
        </button>
      </div>
      <div className={styles.scroll}>
        <div className={styles.hero}>
          <div className={styles.avs}>
            {/* màu avatar theo hội thoại — giá trị động */}
            <div className={styles.av} style={{ left: 0, top: 0, background: conv.hue }}>
              {conv.initials}
            </div>
            <div className={cx(styles.av, styles.avMore)} style={{ right: 0, bottom: 0, background: conv.more_hue }}>
              {conv.more}
            </div>
          </div>
          <div className={styles.name}>
            {conv.title}
            <Icon name="ic-edit" size={14} color={color.groupSub} />
          </div>
          <div className={styles.acts}>
            {ACTS.filter(([, k]) => shown(k)).map(([ic, k]) => (
              <button key={k} type="button" className={styles.act} onClick={() => onAct(k)} aria-pressed={k === 'mute' ? muted : k === 'pin' ? !!conv.pinned : undefined} disabled={ga.pending && k === 'mute'} data-testid={`group-act-${k}`}>
                <span className={styles.actIcon}>
                  <Icon name={ic} size={17} color={color.groupInk} />
                </span>
                {t(`acts.${k === 'mute' && muted ? 'unmute' : k === 'pin' && conv.pinned ? 'unpin' : k}` as never)}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.gap} />
        <div className={styles.block}>
          <button type="button" className={styles.row} onClick={() => setMembersOpen((v) => !v)} aria-expanded={membersOpen} data-testid="group-members">
            <Icon name="ic-users" size={18} color={color.groupInk} />
            <div className={styles.grow}>
              <div className={styles.label}>{t('members', { n: g?.members_total ?? 0 })}</div>
              <div className={styles.sub}>{g?.members_hint}</div>
            </div>
          </button>
          {membersOpen
            ? g?.members.map(([n, ini, hue, role]) => (
                <div key={n} className={styles.member}>
                  <div className={styles.mav} style={{ background: hue }}>
                    {ini}
                  </div>
                  <div className={styles.grow}>
                    <div className={styles.label}>{n}</div>
                    <div className={styles.sub}>{role}</div>
                  </div>
                </div>
              ))
            : null}
          <GroupLinkRow convId={conv.id} state={st} onManage={() => setManage(true)} />
        </div>
        {g ? <GroupSections conv={conv} g={g} state={st} onPolicy={ga.setPolicy} /> : null}
        <div className={styles.endPad} />
      </div>
      {manage ? <GroupManageModal convId={conv.id} title={st?.provider?.name ?? conv.title} actions={ga} onClose={() => (setManage(false), ga.clearCommand())} /> : null}
    </aside>
  );
}
