// Kiểm thử tác nhân AI — prototype L2399–2417, logic agbTestSend L8252. Mỗi lượt gọi agent.test (dryRun, risk read): hành động chỉ xem trước.
// Tab "Mô phỏng kênh": chọn một kênh của agent → agent.test { channel } (system prompt mang kênh đang mô phỏng).
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useTestStyles } from '../../styles/test.styles';
import type { AgentConfig } from '../../types';

type Msg = { role: 'ai' | 'user'; text: string };
const TABS = ['testChat', 'testSim'] as const;
/** Agent chưa chọn kênh = mọi kênh → mô phỏng Web chat. */
const FALLBACK_CHANNELS = ['webchat'];

export function TestPanel({ cfg, agentId, seed }: { cfg: AgentConfig; agentId?: string; seed: string }) {
  const t = useTranslations('agents.b');
  const { styles, cx } = useTestStyles();
  const test = useAction<{ reply: string }>('agent.test');
  const [msgs, setMsgs] = useState<Msg[]>([{ role: 'ai', text: seed }]);
  const [draft, setDraft] = useState('');
  const [tab, setTab] = useState<(typeof TABS)[number]>('testChat');
  const simChannels = cfg.channels.length ? cfg.channels : FALLBACK_CHANNELS;
  const [channel, setChannel] = useState(simChannels[0]!);
  const sim = tab === 'testSim';
  const send = async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    setMsgs((m) => [...m, { role: 'user', text }]);
    const res = await test.run({ agent_id: agentId, config: { ...cfg, name: cfg.name.trim() || undefined }, text, ...(sim ? { channel } : {}) }, { silent: true });
    if (res) setMsgs((m) => [...m, { role: 'ai', text: res.result.reply }]);
  };

  return (
    <>
      <div className={styles.head}>
        <div className={styles.top}>
          <div className={styles.title}>{t('test')}</div>
          <button type="button" className={styles.reset} onClick={() => setMsgs([{ role: 'ai', text: seed }])} data-testid="agb-reset">
            <Icon name="ic-flow" size={13} color={color.text3} strokeWidth={1.8} />
            {t('reset')}
          </button>
        </div>
        <div className={styles.tabs} role="tablist">
          {TABS.map((k) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} className={cx(styles.tab, tab === k && styles.tabOn)} onClick={() => setTab(k)} data-testid={`agb-${k}`}>
              {t(k)}
            </button>
          ))}
        </div>
        {sim ? (
          <select className={styles.simSelect} value={channel} onChange={(e) => setChannel(e.target.value)} aria-label={t('simChannel')} data-testid="agb-sim-channel">
            {simChannels.map((k) => (
              <option key={k} value={k}>
                {t(`channel.${k}` as never)}
              </option>
            ))}
          </select>
        ) : null}
      </div>
      <div className={styles.thread} data-testid="agb-thread">
        {msgs.map((m, i) =>
          m.role === 'ai' ? (
            <div key={i} className={styles.ai}>
              <span className={styles.face}>{cfg.emoji}</span>
              <div className={styles.aiBubble} data-testid="agb-ai-msg">
                {m.text}
              </div>
            </div>
          ) : (
            <div key={i} className={styles.me}>
              {m.text}
            </div>
          ),
        )}
        {msgs.length > 1 ? <div className={styles.dry}>{t('dryRun')}</div> : null}
      </div>
      <div className={styles.foot}>
        <div className={styles.box}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void send();
              }
            }}
            placeholder={t('testPh')}
            aria-label={t('testPh')}
            data-testid="agb-test-input"
          />
          <button type="button" className={styles.send} onClick={() => void send()} aria-label={t('send')} data-testid="agb-test-send">
            <Icon name="ic-send" size={16} color={color.white} strokeWidth={2} />
          </button>
        </div>
      </div>
    </>
  );
}
