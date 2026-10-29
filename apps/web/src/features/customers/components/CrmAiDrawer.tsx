// Drawer "Trợ lý AI · Khách hàng" — prototype L2938–2981. "Soạn ZNS" là mục OUT (prototype-parity §6) — không có.
// Mock: phân tích nhanh trả kết quả mẫu; "Mở Trợ lý AI đầy đủ" mở dock.
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { EntityDrawer, Icon, color, gradient, type IconName } from '@appchat/ui';
import { useMe } from '@/shared/shell/useShellData';
import { useShellStore } from '@/shared/shell/shell-store';
import { useAiStyles } from '../styles/ai.styles';
import { useCrmUi } from '../crm-store';
import { crmAiQuery } from '../api';

type Msg = { role: 'user' | 'ai'; text: string; act?: string | null; key?: string };

const QUICK: [key: string, icon: IconName, tone: string][] = [
  ['pipeline', 'ic-chart', color.blue],
  ['churn', 'ic-bell', color.dangerStrong],
  ['dedupe', 'ic-filter', color.dangerDeep],
];
const BULK: [key: string, icon: IconName, tone: string][] = [
  ['assign', 'ic-users', color.assignIcon],
  ['upsell', 'ic-gift', color.brandInk],
];

export function CrmAiDrawer() {
  const t = useTranslations('customers.crmAi');
  const { styles, cx } = useAiStyles();
  const ui = useCrmUi();
  const ai = useQuery(crmAiQuery()).data;
  const me = useMe().data;
  const setDock = useShellStore((s) => s.setDock);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState('');
  const close = () => ui.set({ modal: null });

  const run = (key: string) => {
    const r = ai?.runs[key];
    if (!r) return;
    setMsgs((m) => [...m, { role: 'user', text: t(`runs.${key}` as never) }, { role: 'ai', text: r.text, act: r.act, key }]);
  };
  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    setMsgs((m) => [...m, { role: 'user', text }, { role: 'ai', text: t('ack', { text }) }]);
  };
  const doAct = (act: string | null | undefined) => {
    if (act === 'kanban') ui.set({ layout: 'kanban', modal: null });
    else if (act === 'dedupe') ui.open('dedupe');
  };
  const list = (items: typeof QUICK) => (
    <div className={styles.list}>
      {items.map(([key, icon, tone]) => (
        <button key={key} type="button" className={styles.cmd} onClick={() => run(key)}>
          <Icon name={icon} size={15} color={tone} />
          {t(`runs.${key}` as never)}
        </button>
      ))}
    </div>
  );

  return (
    <EntityDrawer
      open={ui.modal === 'ai'}
      onClose={close}
      tinted
      iconBg={gradient.upgrade}
      title={t('title')}
      subtitle={t('sub')}
      closeLabel={t('close')}
      testId="crm-ai-drawer"
      footer={
        <div className={styles.foot}>
          <div className={styles.ask}>
            <input className={styles.input} value={draft} placeholder={t('ask')} aria-label={t('ask')} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
            <button type="button" className={styles.send} onClick={send} aria-label={t('send')}>
              <Icon name="ic-send" size={16} color={color.white} strokeWidth={2} />
            </button>
          </div>
          <button
            type="button"
            className={styles.full}
            onClick={() => {
              close();
              setDock(true);
            }}
          >
            <Icon name="ic-spark" size={14} color={color.violetInk} strokeWidth={1.9} />
            {t('full')}
          </button>
        </div>
      }
    >
      <div className={styles.body}>
        <div className={styles.bot}>
          <span className={styles.botAv}>
            <Icon name="ic-spark" size={16} color={color.sparkMint} strokeWidth={1.9} />
          </span>
          <div className={styles.botMsg}>{t('hello', { name: me?.user.name ?? '' })}</div>
        </div>
        {msgs.length ? (
          <div className={styles.msgs} data-testid="crm-ai-msgs">
            {msgs.map((m, i) =>
              m.role === 'user' ? (
                <div key={i} className={styles.user}>
                  {m.text}
                </div>
              ) : (
                <div key={i} className={styles.aiRow}>
                  <span className={styles.aiAv}>
                    <Icon name="ic-spark" size={15} color={color.sparkMint} strokeWidth={1.9} />
                  </span>
                  <div className={styles.aiMsg}>
                    {m.text}
                    {m.key ? (
                      <div>
                        <button type="button" className={styles.act} onClick={() => doAct(m.act)}>
                          <Icon name="ic-arrow" size={13} color={color.white} strokeWidth={2} />
                          {t(`acts.${m.key}` as never)}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ),
            )}
          </div>
        ) : null}
        <div className={styles.section}>{t('quick')}</div>
        {list(QUICK)}
        <div className={cx(styles.section, styles.sectionGap)}>{t('bulk')}</div>
        {list(BULK)}
      </div>
    </EntityDrawer>
  );
}
