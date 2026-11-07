// Thẻ 2 "AI Agentic" — thẻ Trợ lý (nền tối) + 6 agent phòng ban, lưới 5 cột (prototype L1133; < 1280: 3, < 900: 2, < 560: 1).
'use client';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createStyles } from 'antd-style';
import { Icon, color, font, radius } from '@appchat/ui';
import type { AgentCard } from '../types';
import { SectionCard } from './SectionCard';

const useStyles = createStyles(({ css }) => ({
  head: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    font-family: ${font.mono};
  `,
  layer: css`
    flex: 1;
    font-weight: ${font.weight.bold};
    letter-spacing: 0.11em;
  `,
  grid: css`
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 12px;
    align-items: stretch;
    @media (max-width: 1280px) {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    @media (max-width: 900px) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    @media (max-width: 560px) {
      grid-template-columns: 1fr;
    }
  `,
  card: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-width: 0;
  `,
  dark: css`
    background: ${color.ink};
    border-color: ${color.ink};
  `,
  darkName: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.heavy};
    color: ${color.white};
    letter-spacing: -0.01em;
    margin: 8px 0 4px;
  `,
  darkDesc: css`
    font-size: ${font.scale.s13}px;
    color: ${color.inkMuted};
    line-height: 1.55;
  `,
  open: css`
    display: inline-flex;
    align-items: center;
    align-self: flex-start;
    height: 32px;
    padding: 0 12px;
    margin-top: 16px;
    border-radius: ${radius.r8}px;
    background: ${color.brand};
    color: ${color.white};
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    cursor: pointer;
    border: none;
    font-family: inherit;
  `,
  top: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  `,
  icon: css`
    width: 26px;
    height: 26px;
    border-radius: ${radius.r8}px;
    background: ${color.brandBg};
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  name: css`
    flex: 1;
    min-width: 0;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.heavy};
    color: ${color.ink};
    letter-spacing: -0.01em;
  `,
  status: css`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text3};
    font-family: ${font.mono};
    &::before {
      content: '';
      width: 6px;
      height: 6px;
      border-radius: ${radius.r4}px;
      background: ${color.brand};
    }
  `,
  busy: css`
    &::before {
      background: ${color.warnAmber};
    }
  `,
  desc: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    line-height: 1.55;
  `,
  foot: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid ${color.dividerFaint};
    font-size: ${font.scale.s12}px;
    font-family: ${font.mono};
    color: ${color.text4};
  `,
  auto: css`
    font-weight: ${font.weight.bold};
    color: ${color.okText};
  `,
  note: css`
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid ${color.divider};
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    line-height: 1.6;
    & b {
      color: ${color.brandInk};
    }
  `,
}));

export function AgentsSection({ agents }: { agents: AgentCard[] }) {
  const t = useTranslations('dashboard');
  const router = useRouter();
  const { styles, cx } = useStyles();
  return (
    <SectionCard index={2} accent={color.brand} title={t('sections.agents.title')} sub={t('sections.agents.sub')} testId="dash-agents">
      <div className={styles.head}>
        <span className={styles.layer}>{t('agentsLayer')}</span>
        <span>{t('domains', { n: agents.length })}</span>
      </div>
      <div className={styles.grid}>
        <div className={cx(styles.card, styles.dark)}>
          <div>
            <Icon name="ic-spark" size={18} strokeWidth={1.9} color={color.brand} />
            <div className={styles.darkName}>{t('assistantName')}</div>
            <div className={styles.darkDesc}>{t('assistantDesc')}</div>
          </div>
          <button type="button" className={styles.open} onClick={() => router.push('/assistant')}>
            {t('openAssistant')}
          </button>
        </div>
        {agents.map((a) => (
          <div key={a.name} className={styles.card}>
            <div>
              <div className={styles.top}>
                <div className={styles.icon}>
                  <Icon name={a.icon} size={14} strokeWidth={1.9} color={color.okText} />
                </div>
                <div className={styles.name}>{a.name}</div>
                <span className={cx(styles.status, a.status !== 'active' && styles.busy)}>{a.status}</span>
              </div>
              <div className={styles.desc}>{a.desc}</div>
            </div>
            <div className={styles.foot}>
              <span>{a.sessions}</span>
              <span className={styles.auto}>{a.auto}</span>
            </div>
          </div>
        ))}
      </div>
      <div className={styles.note}>{t.rich('agentsFoot', { b: (c) => <b>{c}</b> })}</div>
    </SectionCard>
  );
}
