// Mục Vai trò & phân quyền — prototype L5992–6028 (orchestrator). Danh sách vai trò hệ thống (chỉ đọc, D27) + vai trò tuỳ biến (TIP-042):
// thanh màu, tên (hệ thống theo i18n, tuỳ biến theo tên DB), mô tả, số người, nhãn Hệ thống / Tuỳ biến; ma trận quyền nhóm × vai trò.
// Người có roles.manage (Chủ sở hữu): "Tạo vai trò", nhân bản mọi vai trò, sửa vai trò tuỳ biến → RoleEditor. Không có quyền → khoá như cũ.
'use client';
import { Tooltip } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useCan } from '@/shared/authz/useCan';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { useSectionStyles } from '../styles/section.styles';
import { useRolesStyles } from '../styles/roles.styles';
import { rolesQuery } from '../api';
import { PERM_GROUPS } from '../perm-groups';
import { useSettingsUi } from '../settings-store';
import { blankDraft, cloneDraft, editDraft } from '../hooks/useRoleEditor';
import { useRoleLabel } from '../hooks/useRoleLabel';
import { RoleEditor } from './RoleEditor';

const DASH = '—';

export function RolesSection() {
  const t = useTranslations('settings.roles');
  const te = useTranslations('settings.roleEditor');
  const s = useSectionStyles().styles;
  const { styles, cx } = useRolesStyles();
  const q = useQuery(rolesQuery());
  const can = useCan('roles.manage');
  const label = useRoleLabel();
  const set = useSettingsUi((x) => x.set);
  const cols = { gridTemplateColumns: `1.6fr repeat(${q.data?.roles.length ?? 5}, 1fr)` };
  return (
    <PageStates state={stateOf(q)} onRetry={() => void q.refetch()}>
      {q.data ? (
        <>
          <div className={styles.tools}>
            <span className={s.grow} />
            <Tooltip title={can ? undefined : t('ownerOnly')}>
              <button type="button" className={s.primary} disabled={!can} onClick={() => set({ roleEditor: blankDraft() })} data-testid="st-role-new">
                <Icon name="ic-plus" size={14} color={color.white} strokeWidth={2} />
                {t('create')}
              </button>
            </Tooltip>
          </div>
          <div className={styles.list} data-testid="st-roles">
            {q.data.roles.map((r) => (
              <div key={r.key} className={styles.role} data-role={r.key}>
                <span className={styles.bar} style={{ background: r.color }} />
                <div className={styles.nameCol}>
                  <span className={styles.name}>{label(r.key)}</span>
                  {r.key === 'owner' ? <span className={styles.sys}>{t('onlyOne')}</span> : null}
                </div>
                <div className={styles.desc}>{r.is_system ? t(`desc.${r.key}`) : t('customDesc', { n: r.permissions.length })}</div>
                <span className={styles.cnt}>{t('people', { n: r.count })}</span>
                <span className={styles.tag}>{r.is_system ? t('system') : t('custom')}</span>
                {can ? (
                  <span className={styles.acts}>
                    {r.is_system ? null : (
                      <button type="button" className={styles.lock} onClick={() => set({ roleEditor: editDraft(r) })} aria-label={te('editOf', { name: r.name })} data-testid="st-role-edit">
                        <Icon name="ic-edit" size={14} color={color.text3} />
                      </button>
                    )}
                    <button
                      type="button"
                      className={styles.lock}
                      onClick={() => set({ roleEditor: cloneDraft(r, te('copyName', { name: label(r.key) })) })}
                      aria-label={te('cloneOfBtn', { name: label(r.key) })}
                      data-testid="st-role-clone"
                    >
                      <Icon name="ic-copy" size={14} color={color.text3} />
                    </button>
                  </span>
                ) : (
                  <Tooltip title={t('ownerOnly')}>
                    <span className={styles.lock} aria-label={t('ownerOnly')}>
                      <Icon name="ic-shield" size={14} color={color.text4} />
                    </span>
                  </Tooltip>
                )}
              </div>
            ))}
          </div>
          <div className={styles.mHead}>
            <div className={styles.mT}>{t('matrix')}</div>
            <div className={styles.mS}>{t('matrixD')}</div>
          </div>
          <div className={styles.scroll}>
            <div className={s.cardFlush} data-testid="st-matrix">
              <div className={cx(styles.mRow, styles.mTh)} style={cols}>
                <span>{t('perm')}</span>
                {q.data.roles.map((r) => (
                  <span key={r.key} className={styles.c}>
                    {label(r.key).toUpperCase()}
                  </span>
                ))}
              </div>
              {PERM_GROUPS.map((g) => (
                <div key={g.key}>
                  <div className={styles.group}>{t(`group.${g.key}`)}</div>
                  {g.perms.map((p) => (
                    <div key={p} className={styles.mRow} style={cols} data-perm={p}>
                      <span className={styles.pName}>{t(`perms.${p.replace('.', '_')}`)}</span>
                      {q.data.roles.map((r) => {
                        const yes = r.key === 'owner' || r.permissions.includes(p);
                        return (
                          <span key={r.key} className={styles.c} data-yes={yes ? '1' : '0'}>
                            {yes ? <Icon name="ic-check" size={16} color={color.closedGreen} strokeWidth={2.4} /> : <span className={styles.no}>{DASH}</span>}
                          </span>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <RoleEditor />
        </>
      ) : null}
    </PageStates>
  );
}
