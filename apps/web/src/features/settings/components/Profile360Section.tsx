// Cài đặt → Hồ sơ 360° (REQ-M05, ver2.1 #7, nhóm Ứng dụng; prototype L6397–6415): thẻ mô tả + "Xem như vai trò" + "+ Tạo mẫu mới",
// lưới 2 cột mẫu — chip tab, gán vai trò (5 vai trò hệ thống D27, mỗi vai trò đúng một mẫu), Chỉnh sửa bố cục · Nhân bản · Xoá.
// Ghi qua profile_layout.* (settings.manage).
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import type { SystemRole } from '@appchat/shared';
import { SYSTEM_ROLES } from '@appchat/shared';
import { Icon, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useCan } from '@/shared/authz/useCan';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { useProfileLayoutStyles } from '../styles/profile-layout.styles';
import { useProfileLayoutCommonStyles } from '../styles/profile-layout-common.styles';
import { useProfileLayoutUi } from '../profile-layout-store';
import { profileLayoutsQuery } from '../api';
import type { ProfileLayout, ProfileLayoutsData } from '../types';
import { ProfileLayoutEditor } from './ProfileLayoutEditor';

function TemplateCard({ tpl, active, roleAssignments, can }: { tpl: ProfileLayout; active: boolean; roleAssignments: Record<SystemRole, string>; can: boolean }) {
  const t = useTranslations('settings.profile360');
  const tr = useTranslations('settings.roleName');
  const { styles, cx } = useProfileLayoutStyles();
  const open = useProfileLayoutUi((s) => s.open);
  const duplicate = useAction<{ layout_id: string }>('profile_layout.duplicate');
  const del = useAction('profile_layout.delete');
  const assign = useAction('profile_layout.assign_role');

  return (
    <div className={cx(styles.card, active && styles.cardActive)} data-testid={`pl-card-${tpl.id}`}>
      <div className={styles.cardHead}>
        <span className={styles.name}>{tpl.name}</span>
        {active ? <span className={styles.activeBadge}>{t('active')}</span> : null}
      </div>
      <div>
        <div className={styles.colHint}>{t('col.tabs')}</div>
        <div className={styles.tabChips}>
          {tpl.tabs.filter((x) => x.enabled).map((x) => (
            <span key={x.key} className={cx(styles.tabChip, x.builtin ? styles.tabChipBuiltin : styles.tabChipCustom)}>
              {x.label}
            </span>
          ))}
        </div>
      </div>
      <div>
        <div className={styles.colHint}>{t('col.roles')}</div>
        <div className={styles.roleRow}>
          {SYSTEM_ROLES.map((r) => {
            const on = roleAssignments[r] === tpl.id;
            return (
              <button
                key={r}
                type="button"
                disabled={!can}
                className={cx(styles.roleChip, on && styles.roleChipOn)}
                onClick={() => void assign.run({ role: r, layout_id: tpl.id }, { silent: true })}
                data-testid={`pl-role-${tpl.id}-${r}`}
              >
                {tr(r)}
              </button>
            );
          })}
        </div>
      </div>
      {can ? (
        <div className={styles.cardActions}>
          <button type="button" className={cx(styles.actBtn, styles.actPrimary)} onClick={() => open(tpl.id)} data-testid={`pl-edit-${tpl.id}`}>
            {t('edit')}
          </button>
          <button type="button" className={styles.actBtn} onClick={() => void duplicate.run({ layout_id: tpl.id })} data-testid={`pl-dup-${tpl.id}`}>
            {t('dup')}
          </button>
          {!tpl.is_system ? (
            <button
              type="button"
              className={cx(styles.actBtn, styles.actDanger)}
              onClick={() => {
                if (!window.confirm(t('delConfirm', { name: tpl.name }))) return;
                void del.run({ layout_id: tpl.id });
              }}
              data-testid={`pl-del-${tpl.id}`}
            >
              {t('del')}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function Profile360Section() {
  const t = useTranslations('settings.profile360');
  const tr = useTranslations('settings.roleName');
  const { styles } = useProfileLayoutStyles();
  const { styles: c } = useProfileLayoutCommonStyles();
  const can = useCan('settings.manage');
  const create = useAction<{ layout_id: string }>('profile_layout.create');
  const q = useQuery(profileLayoutsQuery());
  const [viewAs, setViewAs] = useState<SystemRole>('owner');

  const onNew = async () => {
    const base = q.data?.layouts.find((l) => l.id === 'pl_default');
    if (!base) return;
    const res = await create.run({ name: t('new'), tabs: base.tabs }, { silent: true });
    if (res) useProfileLayoutUi.getState().open(res.result.layout_id);
  };

  return (
    <>
      <div className={styles.heroBar}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div className={styles.heroBarT}>{t('heroT')}</div>
          <div className={styles.heroBarS}>{t('heroS')}</div>
        </div>
        <div className={styles.viewAs}>
          <span className={styles.viewAsLabel}>{t('viewAs')}</span>
          <select
            className={c.select}
            value={viewAs}
            onChange={(e) => setViewAs(e.target.value as SystemRole)}
            aria-label={t('viewAs')}
            data-testid="pl-view-as"
          >
            {SYSTEM_ROLES.map((r) => (
              <option key={r} value={r}>
                {tr(r)}
              </option>
            ))}
          </select>
        </div>
        {can ? (
          <button type="button" className={c.primaryBtn} onClick={() => void onNew()} data-testid="pl-new">
            <Icon name="ic-plus" size={13} color={color.white} strokeWidth={2.2} />
            {t('new')}
          </button>
        ) : null}
      </div>
      <PageStates state={stateOf(q, (d: ProfileLayoutsData) => d.layouts.length === 0)} onRetry={() => void q.refetch()}>
        {q.data ? (
          <div className={styles.grid}>
            {q.data.layouts.map((tpl) => (
              <TemplateCard key={tpl.id} tpl={tpl} active={q.data!.role_assignments[viewAs] === tpl.id} roleAssignments={q.data!.role_assignments} can={can} />
            ))}
          </div>
        ) : null}
      </PageStates>
      <ProfileLayoutEditor />
    </>
  );
}
