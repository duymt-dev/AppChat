// Mục Vai trò & phân quyền — prototype L5992–6028. P0 chỉ đọc (D27): danh sách 5 vai trò hệ thống (thanh màu, tên, mô tả, số người,
// nhãn "Hệ thống") + ma trận quyền (nhóm × 5 vai trò, ✓ / —) lấy từ ROLE_DEFS. "Tạo vai trò" / sửa / nhân bản để P1 → nút khoá kèm ghi chú.
'use client';
import { Tooltip } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { useSectionStyles } from '../styles/section.styles';
import { useRolesStyles } from '../styles/roles.styles';
import { rolesQuery } from '../api';
import { PERM_GROUPS } from '../perm-groups';

const DASH = '—';

export function RolesSection() {
  const t = useTranslations('settings.roles');
  const tr = useTranslations('settings.roleName');
  const s = useSectionStyles().styles;
  const { styles, cx } = useRolesStyles();
  const q = useQuery(rolesQuery());
  return (
    <PageStates state={stateOf(q)} onRetry={() => void q.refetch()}>
      {q.data ? (
        <>
          <div className={styles.tools}>
            <span className={s.grow} />
            <Tooltip title={t('p1')}>
              <button type="button" className={s.primary} disabled data-testid="st-role-new">
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
                  <span className={styles.name}>{tr(r.key)}</span>
                  {r.key === 'owner' ? <span className={styles.sys}>{t('onlyOne')}</span> : null}
                </div>
                <div className={styles.desc}>{t(`desc.${r.key}`)}</div>
                <span className={styles.cnt}>{t('people', { n: r.count })}</span>
                <span className={styles.tag}>{t('system')}</span>
                <Tooltip title={t('p1')}>
                  <span className={styles.lock} aria-label={t('p1')}>
                    <Icon name="ic-shield" size={14} color={color.text4} />
                  </span>
                </Tooltip>
              </div>
            ))}
          </div>
          <div className={styles.mHead}>
            <div className={styles.mT}>{t('matrix')}</div>
            <div className={styles.mS}>{t('matrixD')}</div>
          </div>
          <div className={styles.scroll}>
            <div className={s.cardFlush} data-testid="st-matrix">
              <div className={cx(styles.mRow, styles.mTh)}>
                <span>{t('perm')}</span>
                {q.data.roles.map((r) => (
                  <span key={r.key} className={styles.c}>
                    {tr(r.key).toUpperCase()}
                  </span>
                ))}
              </div>
              {PERM_GROUPS.map((g) => (
                <div key={g.key}>
                  <div className={styles.group}>{t(`group.${g.key}`)}</div>
                  {g.perms.map((p) => (
                    <div key={p} className={styles.mRow} data-perm={p}>
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
        </>
      ) : null}
    </PageStates>
  );
}
