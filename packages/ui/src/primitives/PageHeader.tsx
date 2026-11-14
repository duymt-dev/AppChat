// PageHeader + KpiStrip (Blueprint §7 primitive): tiêu đề 24px · phụ đề · hành động · thẻ số liệu — prototype L2453–2468 (dùng chung các màn danh sách).
'use client';
import type { ReactNode } from 'react';
import { createStyles } from 'antd-style';
import { Icon } from '../icons';
import type { IconName } from '../icons/paths';
import { color, font, radius } from '../tokens';

export interface KpiItem {
  key: string;
  label: string;
  value: string;
  color: string;
  icon: IconName;
}

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  kpis?: KpiItem[];
}

const useStyles = createStyles(({ css, responsive }) => ({
  head: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    ${responsive.md} {
      flex-wrap: wrap;
    }
  `,
  titles: css`
    ${responsive.md} {
      flex: 1;
      min-width: 0;
    }
  `,
  title: css`
    font-size: ${font.scale.s24}px;
    font-weight: ${font.weight.heavy};
    letter-spacing: -0.02em;
    color: ${color.text};
  `,
  sub: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text4};
    margin-top: 2px;
  `,
  spacer: css`
    flex: 1;
    ${responsive.md} {
      display: none;
    }
  `,
  kpis: css`
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
    ${responsive.md} {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
  `,
  kpi: css`
    flex: 1;
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    padding: 12px;
  `,
  kpiHead: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  `,
  kpiIcon: css`
    width: 30px;
    height: 30px;
    border-radius: ${radius.r8}px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  kpiLabel: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    font-weight: ${font.weight.semibold};
  `,
  kpiValue: css`
    font-size: ${font.scale.s24}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
    line-height: 1;
  `,
}));

export function PageHeader({ title, subtitle, actions, kpis }: PageHeaderProps) {
  const { styles } = useStyles();
  return (
    <>
      <div className={styles.head}>
        <div className={styles.titles}>
          <div className={styles.title}>{title}</div>
          {subtitle ? <div className={styles.sub}>{subtitle}</div> : null}
        </div>
        <span className={styles.spacer} />
        {actions}
      </div>
      {kpis ? (
        <div className={styles.kpis} data-testid="page-kpis">
          {kpis.map((k) => (
            <div key={k.key} className={styles.kpi}>
              <div className={styles.kpiHead}>
                {/* nền icon = màu KPI + alpha 0x18 (prototype `{{ k.c }}18`) — giá trị động */}
                <span className={styles.kpiIcon} style={{ background: `${k.color}18` }}>
                  <Icon name={k.icon} size={15} color={k.color} />
                </span>
                <span className={styles.kpiLabel}>{k.label}</span>
              </div>
              <div className={styles.kpiValue}>{k.value}</div>
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}
