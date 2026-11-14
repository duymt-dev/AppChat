// Mục Nhóm (TIP-042, members.manage) — prototype L6709–6745 phần thẻ phòng ban, rút về nhóm phẳng (PD-018): tìm + "Tạo nhóm", lưới thẻ
// (ô màu, tên, số thành viên, avatar ≤ 4 + "+N", trưởng nhóm), hai nút "Thành viên" / "Cấu hình". Không chi nhánh / khối / cây phòng ban
// (Phòng ban P3 — OUT), không xoá nhóm (Blueprint không có team.delete). Dữ liệu GET /teams, tên người từ /settings/members.
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { useSectionStyles } from '../styles/section.styles';
import { useTeamsStyles } from '../styles/teams.styles';
import { useSettingsUi } from '../settings-store';
import { membersQuery } from '../api';
import { teamsQuery } from '../api/teams';
import { foldVi } from '../text';
import type { Team } from '../roles.types';
import { TeamEditor } from './TeamEditor';

/** Màu ô nhóm theo thứ tự (prototype AC L11085). */
// Thứ tự màu icon theo 12 nhóm đầu của prototype (__teamData L11068–11073).
const TEAM_COLORS = [color.brand, color.blue, color.teamPink, color.codeBg, color.lyGold, color.purple, color.teal, color.cyan, color.teamSky, color.pink, color.amberText, color.dangerStrong];
const SHOWN = 4;

function TeamCard({ team, i, names }: { team: Team; i: number; names: Map<string, { name: string; color: string }> }) {
  const t = useTranslations('settings.teams');
  const { styles, cx } = useTeamsStyles();
  const set = useSettingsUi((x) => x.set);
  const extra = team.user_ids.length - SHOWN;
  const draft = { id: team.id, version: team.version, name: team.name, lead: team.lead_user_id, members: [...team.user_ids] };
  return (
    <div className={styles.card} data-team={team.id}>
      <div className={styles.head}>
        <span className={styles.ic} style={{ background: TEAM_COLORS[i % TEAM_COLORS.length] }}>
          <Icon name="ic-users" size={22} color={color.white} strokeWidth={1.9} />
        </span>
        <div className={styles.info}>
          <div className={styles.name}>{team.name}</div>
          <div className={styles.cnt}>{t('count', { n: team.user_ids.length })}</div>
        </div>
        <button type="button" className={styles.dots} onClick={() => set({ teamEditor: { ...draft, mode: 'config' } })} aria-label={t('more', { name: team.name })}>
          <Icon name="ic-more-h" size={15} color={color.text4} />
        </button>
      </div>
      <div className={styles.avs}>
        {team.user_ids.slice(0, SHOWN).map((u) => {
          const p = names.get(u);
          return (
            <span key={u} className={styles.av} style={{ background: p?.color ?? color.text4 }} title={p?.name}>
              {(p?.name ?? '?').trim().split(' ').slice(-1)[0]![0]}
            </span>
          );
        })}
        {extra > 0 ? <span className={cx(styles.av, styles.more)}>{t('extra', { n: extra })}</span> : null}
        {team.lead_user_id ? <span className={styles.lead}>{t('lead', { name: names.get(team.lead_user_id)?.name ?? '—' })}</span> : null}
      </div>
      <div className={styles.btns}>
        <button type="button" className={styles.chip} onClick={() => set({ teamEditor: { ...draft, mode: 'members' } })} data-testid="st-team-members">
          <Icon name="ic-users" size={15} color={color.text3} strokeWidth={1.8} />
          {t('members')}
        </button>
        <button type="button" className={styles.chip} onClick={() => set({ teamEditor: { ...draft, mode: 'config' } })} data-testid="st-team-config">
          <Icon name="ic-cog" size={15} color={color.text3} strokeWidth={1.8} />
          {t('config')}
        </button>
      </div>
    </div>
  );
}

export function TeamsSection() {
  const t = useTranslations('settings.teams');
  const s = useSectionStyles().styles;
  const { styles, cx } = useTeamsStyles();
  const set = useSettingsUi((x) => x.set);
  const [q, setQ] = useState('');
  const teams = useQuery(teamsQuery());
  const people = useQuery(membersQuery('')).data?.data ?? [];
  const names = new Map(people.map((m) => [m.id, { name: m.name, color: m.color }]));
  const k = foldVi(q.trim());
  const rows = (teams.data ?? []).filter((x) => !k || foldVi(x.name).includes(k));
  const state = stateOf(teams);
  return (
    <>
      <div className={styles.tools}>
        <div className={cx(s.search, styles.search)}>
          <Icon name="ic-search" size={15} color={color.text4} strokeWidth={1.9} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('search')} aria-label={t('search')} data-testid="st-team-search" />
        </div>
        <button type="button" className={cx(s.primary, styles.newBtn)} onClick={() => set({ teamEditor: { mode: 'create', name: '', lead: null, members: [] } })} data-testid="st-team-new">
          <Icon name="ic-plus" size={15} color={color.white} strokeWidth={2.2} />
          {t('create')}
        </button>
      </div>
      <PageStates
        state={state === 'ready' && !rows.length ? 'empty' : state}
        onRetry={() => void teams.refetch()}
        empty={<div className={styles.empty} data-testid="st-teams-empty">{q ? t('noMatch') : t('empty')}</div>}
      >
        <div className={styles.grid} data-testid="st-teams">
          {rows.map((team, i) => (
            <TeamCard key={team.id} team={team} i={i} names={names} />
          ))}
        </div>
      </PageStates>
      <TeamEditor />
    </>
  );
}
