// Thẻ 1 "Kênh kết nối" — 4 nhóm chip trạng thái + nút "Kết nối" (prototype L1132).
// Nút "Kết nối" mở Cài đặt > Kênh / Kết nối (chỉ kênh / connector có manifest — D28).
'use client';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createStyles } from 'antd-style';
import { Icon, color, font, radius } from '@appchat/ui';
import { Can } from '@/shared/authz/Can';
import type { ConnectGroup } from '../types';
import { SectionCard } from './SectionCard';

const useStyles = createStyles(({ css, responsive }) => ({
  row: css`
    display: flex;
    gap: 24px;
    align-items: flex-start;
    ${responsive.md} {
      flex-direction: column;
      gap: 16px;
    }
  `,
  col: css`
    flex: 1;
    min-width: 0;
  `,
  eyebrow: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    letter-spacing: 0.11em;
    color: ${color.eyebrowMuted};
    font-family: ${font.mono};
    margin-bottom: 8px;
  `,
  chips: css`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  `,
  chip: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 30px;
    padding: 0 12px;
    border-radius: ${radius.pill}px;
    background: ${color.surface};
    border: 1px solid ${color.border};
    white-space: nowrap;
    max-width: 100%;
    min-width: 0;
    overflow: hidden;
  `,
  dot: css`
    width: 6px;
    height: 6px;
    border-radius: ${radius.r4}px;
    background: ${color.brand};
    flex-shrink: 0;
  `,
  dotWarn: css`
    background: ${color.warnAmber};
  `,
  name: css`
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
    color: ${color.ink};
  `,
  meta: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    font-family: ${font.mono};
  `,
  add: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 30px;
    padding: 0 12px;
    border-radius: ${radius.pill}px;
    background: ${color.surface};
    border: 1px dashed ${color.disabled};
    cursor: pointer;
    white-space: nowrap;
    font-family: inherit;
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    color: ${color.brandInk};
    ${responsive.md} {
      min-height: 44px;
    }
  `,
}));

const TARGET: Record<ConnectGroup['key'], string> = {
  in: '/settings/channels',
  out: '/settings/channels',
  erp: '/settings/integrations',
  data: '/settings/integrations',
};

export function ConnectSection({ groups }: { groups: ConnectGroup[] }) {
  const t = useTranslations('dashboard');
  const router = useRouter();
  const { styles, cx } = useStyles();
  return (
    <SectionCard index={1} accent={color.blue} title={t('sections.connect.title')} sub={t('sections.connect.sub')} testId="dash-connect">
      <div className={styles.row}>
        {groups.map((g) => (
          <div key={g.key} className={styles.col}>
            <div className={styles.eyebrow}>{t(`groups.${g.key}`)}</div>
            <div className={styles.chips}>
              {g.items.map((c) => (
                <div key={c.name} className={styles.chip}>
                  <span className={cx(styles.dot, c.warn && styles.dotWarn)} />
                  <span className={styles.name}>{c.name}</span>
                  <span className={styles.meta}>{c.meta}</span>
                </div>
              ))}
              <Can p={g.key === 'in' || g.key === 'out' ? 'channels.manage' : 'integrations.manage'}>
                <button type="button" className={styles.add} onClick={() => router.push(TARGET[g.key])}>
                  <Icon name="ic-plus" size={12} strokeWidth={2.4} color={color.brand} />
                  {t('connect')}
                </button>
              </Can>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
