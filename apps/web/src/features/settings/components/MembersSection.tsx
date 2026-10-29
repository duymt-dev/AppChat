// Mục Thành viên — prototype L5861–5889: tìm, Lọc, Xuất CSV, Mời thành viên; banner AI đề xuất; bảng (thành viên · vai trò · phòng ban ·
// hoạt động cuối · trạng thái · ⋯ Sửa / Xoá); chân "N thành viên · tối đa M seat · Nâng cấp plan". Vai trò = 5 vai trò hệ thống (§3.5).
'use client';
import { App } from 'antd';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useCan } from '@/shared/authz/useCan';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { useSectionStyles } from '../styles/section.styles';
import { useMembersStyles } from '../styles/members.styles';
import { useSettingsUi } from '../settings-store';
import { membersQuery } from '../api';
import type { Member } from '../types';
import { MemberModal } from './MemberModal';

const BILLING = '/settings/billing';
const ROW_MENU = 'members';
const SEP = ' · ';
const INVITE = 'inv_';

function Row({ m }: { m: Member }) {
  const t = useTranslations('settings.members');
  const tr = useTranslations('settings.roleName');
  const s = useSectionStyles();
  const { styles, cx } = useMembersStyles();
  const ui = useSettingsUi();
  const canManage = useCan('members.manage');
  const remove = useAction('member.remove');
  const revoke = useAction('invite.revoke');
  const online = m.last === 'online';
  const invite = m.status === 'pending' && m.id.startsWith(INVITE);
  const open = ui.menuFor === `${ROW_MENU}:${m.id}`;
  return (
    <div className={cx(s.styles.tr, styles.grid)} data-member={m.id}>
      <span className={s.styles.box} />
      <div className={styles.who}>
        <span className={styles.avWrap}>
          <span className={styles.av} style={{ background: m.color }}>
            {m.name.trim().split(' ').slice(-1)[0]![0]}
          </span>
          {online ? <span className={styles.dot} /> : null}
        </span>
        <div className={s.styles.grow}>
          <div className={styles.name}>{m.name}</div>
          <div className={styles.email}>{m.email}</div>
        </div>
      </div>
      <span>
        <span className={styles.role} data-testid="st-member-role">
          {tr(m.role)}
        </span>
      </span>
      <span className={cx(styles.dept, styles.hideM)}>{m.dept}</span>
      <span className={cx(online ? styles.lastOn : styles.last, styles.hideM)}>{t(`last.${m.last}`)}</span>
      <span>
        <span className={styles[`st_${m.status}`]} data-testid="st-member-status">
          {m.status === 'active' ? <span className={styles.stDot} /> : null}
          {t(`status.${m.status}`)}
        </span>
      </span>
      <div className={s.styles.rel}>
        {canManage && m.role !== 'owner' ? (
          <>
            <button type="button" className={s.styles.more} aria-label={t('menu')} onClick={() => ui.set({ menuFor: open ? null : `${ROW_MENU}:${m.id}` })}>
              <Icon name="ic-menu" size={15} color={color.text4} />
            </button>
            {open ? (
              <div className={s.styles.menu} role="menu">
                <button
                  type="button"
                  role="menuitem"
                  className={s.styles.mItem}
                  onClick={() => ui.set({ menuFor: null, memberModal: { id: m.id, name: m.name, email: m.email, role: m.role as never } })}
                >
                  <Icon name="ic-doc" size={14} color={color.text3} />
                  {t('edit')}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={cx(s.styles.mItem, s.styles.mDanger)}
                  onClick={() => {
                    ui.set({ menuFor: null });
                    void (invite ? revoke.run({ invite_id: m.id }) : remove.run({ user_id: m.id }));
                  }}
                >
                  <Icon name="ic-trash" size={14} color={color.dangerStrong} />
                  {invite ? t('revoke') : t('remove')}
                </button>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

export function MembersSection() {
  const t = useTranslations('settings.members');
  const { message } = App.useApp();
  const router = useRouter();
  const s = useSectionStyles();
  const { styles, cx } = useMembersStyles();
  const ui = useSettingsUi();
  const canManage = useCan('members.manage');
  const q = useQuery(membersQuery(ui.memberQ));
  return (
    <>
      <div className={cx(s.styles.row, styles.bar)}>
        <div className={s.styles.search}>
          <Icon name="ic-search" size={14} color={color.text4} strokeWidth={1.9} />
          <input value={ui.memberQ} onChange={(e) => ui.set({ memberQ: e.target.value })} placeholder={t('search')} aria-label={t('search')} data-testid="st-member-search" />
        </div>
        <span className={s.styles.grow} />
        <button type="button" className={cx(s.styles.ghost, styles.hideM)} onClick={() => void message.info(t('filterSoon'))}>
          <Icon name="ic-filter" size={14} color={color.text3} />
          {t('filter')}
        </button>
        <button type="button" className={cx(s.styles.ghost, styles.hideM)} onClick={() => void message.success(t('exported'))}>
          <Icon name="ic-download" size={14} color={color.text3} />
          {t('export')}
        </button>
        {canManage ? (
          <button type="button" className={s.styles.primary} onClick={() => ui.set({ memberModal: { name: '', email: '', role: 'sales' } })} data-testid="st-invite">
            <Icon name="ic-plus" size={14} color={color.white} strokeWidth={2} />
            {t('invite')}
          </button>
        ) : null}
      </div>
      <div className={styles.ai}>
        <span className={styles.aiIc}>
          <Icon name="ic-spark" size={17} color={color.brand} />
        </span>
        <div className={s.styles.grow}>
          <div className={styles.aiT}>{t('aiT')}</div>
          <div className={styles.aiS}>{t('aiS')}</div>
        </div>
        <button type="button" className={styles.aiBtn} onClick={() => ui.set({ memberQ: '' })}>
          {t('aiBtn')}
        </button>
      </div>
      <PageStates state={stateOf(q)} onRetry={() => void q.refetch()}>
        {q.data ? (
          <div className={s.styles.cardFlush} data-testid="st-members">
            <div className={cx(s.styles.th, styles.grid)}>
              <span className={s.styles.box} />
              <span>{t('col.member')}</span>
              <span>{t('col.role')}</span>
              <span>{t('col.dept')}</span>
              <span>{t('col.last')}</span>
              <span>{t('col.status')}</span>
              <span />
            </div>
            {q.data.data.map((m) => (
              <Row key={m.id} m={m} />
            ))}
            <div className={s.styles.foot}>
              {t.rich('foot', { n: q.data.total, max: q.data.seat_limit, b: (c) => <b>{c}</b> })}
              {SEP}
              <button type="button" className={s.styles.link} onClick={() => router.push(BILLING)}>
                {t('upgrade')}
              </button>
            </div>
          </div>
        ) : null}
      </PageStates>
      <MemberModal />
    </>
  );
}
