// Panel "Trợ lý AI · Hỗ trợ" — prototype L3364–3392 (tkAiSuggests L9182). Mock: không gọi LLM; "Tóm tắt quá hạn" lọc SLA quá hạn,
// "Phân loại & định tuyến" sắp xếp ưu tiên cao trước, "Mở Trợ lý AI đầy đủ" mở dock Trợ lý.
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { EntityDrawer, Icon, color, gradient, type IconName } from '@appchat/ui';
import { useShellStore } from '@/shared/shell/shell-store';
import { useMe } from '@/shared/shell/useShellData';
import { useTkAiStyles } from '../styles/ai.styles';
import { EMPTY_FILTER, useTicketsUi } from '../tickets-store';
import type { TicketsMeta } from '../types';

const LOOK: Record<string, [IconName, string]> = {
  overdue: ['ic-bell', color.dangerStrong],
  reply: ['ic-spark', color.violet],
  route: ['ic-flow', color.info],
  report: ['ic-chart', color.brandInk],
};

export function TicketsAiDrawer({ meta }: { meta: TicketsMeta }) {
  const t = useTranslations('tickets.aiPanel');
  const { styles } = useTkAiStyles();
  const ui = useTicketsUi();
  const setDock = useShellStore((s) => s.setDock);
  const me = useMe().data;
  const [result, setResult] = useState('');
  const [draft, setDraft] = useState('');
  const close = () => ui.set({ aiOpen: false });
  const run = (k: string, title: string) => {
    if (k === 'overdue') ui.setFilter({ ...EMPTY_FILTER, sla: 'breach' });
    if (k === 'route') ui.setFilter({ sort: 'priority' });
    setResult(t('picked', { t: title }));
  };
  const send = () => {
    if (!draft.trim()) return;
    setDraft('');
    setResult(t('ack'));
  };
  return (
    <EntityDrawer
      open={ui.aiOpen}
      onClose={close}
      title={t('title')}
      subtitle={t('sub')}
      icon="ic-spark"
      iconBg={gradient.ai}
      tinted
      closeLabel={t('close')}
      testId="tk-ai"
      footer={
        <div className={styles.foot}>
          <div className={styles.box}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder={t('ph')}
            />
            <button type="button" className={styles.send} onClick={send} aria-label={t('send')}>
              <Icon name="ic-send" size={16} color={color.white} strokeWidth={2} />
            </button>
          </div>
          <button type="button" className={styles.full} onClick={() => (close(), setDock(true))}>
            <Icon name="ic-spark" size={14} color={color.violetInk} />
            {t('full')}
          </button>
        </div>
      }
    >
      <div className={styles.body}>
        <div className={styles.hello}>
          <span className={styles.bot}>
            <Icon name="ic-spark" size={16} color={color.sparkMint} />
          </span>
          <div className={styles.bubble}>{t('hello', { name: me?.user.name.split(' ').at(-1) ?? '' })}</div>
        </div>
        <div className={styles.list}>
          {meta.ai.map(([k, title, desc]) => {
            const [ic, c] = LOOK[k] ?? LOOK.report!;
            return (
              <button key={k} type="button" className={styles.card} onClick={() => run(k, title)} data-testid={`tk-ai-${k}`}>
                <div className={styles.cardH}>
                  <span className={styles.cardIc} style={{ background: `${c}18` }}>
                    <Icon name={ic} size={15} color={c} />
                  </span>
                  {title}
                </div>
                <div className={styles.cardD}>{desc}</div>
              </button>
            );
          })}
        </div>
        {result ? <div className={styles.result}>{result}</div> : null}
      </div>
    </EntityDrawer>
  );
}
