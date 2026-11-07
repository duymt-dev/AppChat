// Trợ lý AI · AI Agents (drawer 392px) — prototype L2421–2449: lời chào, 4 gợi ý, ô hỏi, "Mở Trợ lý AI đầy đủ".
// D29: mô tả agent → agent.draft_from_description → thẻ xác nhận "Tạo & xuất bản" (agent.create_and_publish) | "Mở trong builder".
// TIP-023c G2: gợi ý khác "Tạo agent" và ô hỏi (khi không ở chế độ mô tả) gửi lượt Trợ lý THẬT ngay trong drawer (surface drawer,
// cùng phiên module agents); "Mở Trợ lý AI đầy đủ" mở màn Trợ lý cùng phiên.
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { getAction } from '@appchat/actions';
import { Icon, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useMe } from '@/shared/shell/useShellData';
import { ScreenAssistantThread } from '@/shared/assistant/ScreenAssistantThread';
import { useScreenAssistant } from '@/shared/assistant/useScreenAssistant';
import { useSideStyles } from '../styles/side.styles';
import { useAgentsUi } from '../agents-store';
import type { AgentConfig, AgentsMeta } from '../types';

type Draft = AgentConfig;

export function AgentAiDrawer({ meta }: { meta: AgentsMeta }) {
  const t = useTranslations('agents');
  const tAll = useTranslations();
  const router = useRouter();
  const { styles } = useSideStyles();
  const ui = useAgentsUi();
  const { data: me } = useMe();
  const draftAct = useAction<{ draft: Draft }>('agent.draft_from_description');
  const publish = useAction<{ agent_id: string; version: number }>('agent.create_and_publish');
  const asst = useScreenAssistant('agents');
  const [text, setText] = useState('');
  const [describing, setDescribing] = useState(false);
  const [asked, setAsked] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [done, setDone] = useState<string | null>(null);
  if (!ui.aiOpen) return null;

  const close = () => {
    ui.set({ aiOpen: false });
    setText('');
    setDescribing(false);
    setAsked(null);
    setDraft(null);
    setDone(null);
  };
  const ask = async () => {
    const v = text.trim();
    if (!describing) {
      if (!v || asst.typing) return;
      setText('');
      return void asst.send(v);
    }
    if (v.length < 4) return;
    setAsked(v);
    setText('');
    setDone(null);
    const res = await draftAct.run({ description: v }, { silent: true });
    if (res) setDraft(res.result.draft);
  };
  const confirm = async () => {
    if (!draft) return;
    const res = await publish.run(draft);
    if (res) {
      setDone(draft.name);
      setDraft(null);
    }
  };
  const openBuilder = () => {
    if (!draft) return;
    ui.set({ handoff: draft, aiOpen: false });
    close();
    router.push('/agents/new?from=ai');
  };
  // Gợi ý khác "create" → gửi Trợ lý câu soạn sẵn (`ask` từ backend) ngay trong drawer (standard §10).
  const pick = (s: AgentsMeta['ai_suggests'][number]) => {
    if (s.key === 'create') setDescribing(true);
    else void asst.send(s.ask || s.title);
  };
  const name = me?.user.name.split(' ').pop() ?? '';
  const ch = (k: string) => t(`b.channel.${k}` as never);
  const tool = (id: string) => (getAction(id) ? tAll(getAction(id)!.title as never) : id);

  return (
    <>
      <div className={styles.veil} onClick={close} />
      <aside className={styles.panel} role="dialog" aria-modal="true" aria-label={t('ai.title')} data-testid="ag-ai-drawer">
        <div className={styles.head}>
          <span className={styles.logo}>
            <Icon name="ic-spark" size={17} color={color.white} strokeWidth={1.9} />
          </span>
          <div className={styles.grow}>
            <div className={styles.title}>{t('ai.title')}</div>
            <div className={styles.sub}>{t('ai.sub')}</div>
          </div>
          <button type="button" className={styles.x} onClick={close} aria-label={t('ai.close')}>
            <Icon name="ic-x" size={18} color={color.text3} strokeWidth={2} />
          </button>
        </div>
        <div className={styles.body}>
          <div className={styles.hello}>
            <span className={styles.bot}>
              <Icon name="ic-spark" size={16} color={color.sparkMint} strokeWidth={1.9} />
            </span>
            <div className={styles.bubble}>{t('ai.hello', { name })}</div>
          </div>
          {asked ? <div className={styles.me}>{asked}</div> : null}
          {done ? (
            <div className={styles.done} data-testid="ag-ai-done">
              {t('ai.done', { name: done })}
            </div>
          ) : null}
          {draft ? (
            <div className={styles.draft} data-testid="ag-ai-draft">
              <div className={styles.draftHead}>
                <Icon name="ic-spark" size={14} color={color.violetInk} strokeWidth={1.9} />
                {t('ai.draft')}
              </div>
              <div className={styles.draftLead}>{t('ai.draftLead')}</div>
              <div className={styles.kv}>
                <span className={styles.k}>{t('ai.fName')}</span>
                <span className={styles.v}>
                  {draft.emoji} {draft.name}
                </span>
                <span className={styles.k}>{t('ai.fRole')}</span>
                <span className={styles.v}>{t(`ai.role.${draft.role ?? 'custom'}`)}</span>
                <span className={styles.k}>{t('ai.fTier')}</span>
                <span className={styles.v}>{t(`tier.${draft.model_tier}`)}</span>
                <span className={styles.k}>{t('ai.fChannels')}</span>
                <span className={styles.v}>{draft.channels.map(ch).join(', ')}</span>
                <span className={styles.k}>{t('ai.fTools')}</span>
                <span className={styles.v}>{draft.tools.map(tool).join(', ')}</span>
                <span className={styles.k}>{t('ai.fThreshold')}</span>
                <span className={styles.v}>{t('ai.pct', { n: draft.threshold })}</span>
              </div>
              <div className={styles.draftActs}>
                <button type="button" className={styles.primary} onClick={() => void confirm()} disabled={publish.isPending} data-testid="ag-ai-publish">
                  <Icon name="ic-check" size={14} color={color.white} strokeWidth={2} />
                  {t('ai.publish')}
                </button>
                <button type="button" className={styles.ghost} onClick={openBuilder} data-testid="ag-ai-builder">
                  {t('ai.openBuilder')}
                </button>
              </div>
            </div>
          ) : null}
          <ScreenAssistantThread msgs={asst.msgs} typing={asst.typing} onDecide={(m, d) => void asst.decide(m, d)} onUi={asst.runUi} testId="ag-ai-msgs" />
          {!asked && !asst.msgs.length ? (
            <div className={styles.list}>
              {meta.ai_suggests.map((s) => (
                <button key={s.key} type="button" className={styles.sug} onClick={() => pick(s)} data-testid="ag-ai-sug">
                  <div className={styles.sugHead}>
                    <span className={styles.sugIcon} style={{ background: `${s.color}18` }}>
                      <Icon name="ic-spark" size={15} color={s.color} />
                    </span>
                    <span className={styles.sugTitle}>{s.title}</span>
                  </div>
                  <div className={styles.sugDesc}>{s.desc}</div>
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <div className={styles.foot}>
          <div className={styles.inputRow}>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void ask()}
              placeholder={describing ? t('ai.describePh') : t('ai.ph')}
              aria-label={t('ai.describe')}
              autoFocus={describing}
              data-testid="ag-ai-input"
            />
            <button type="button" className={styles.send} onClick={() => void ask()} disabled={text.trim().length < (describing ? 4 : 1)} aria-label={t('ai.send')} data-testid="ag-ai-send">
              <Icon name="ic-send" size={16} color={color.white} strokeWidth={2} />
            </button>
          </div>
          <button
            type="button"
            className={styles.full}
            onClick={() => {
              close();
              asst.openFull();
            }}
            data-testid="ag-ai-full"
          >
            <Icon name="ic-spark" size={14} color={color.violetInk} strokeWidth={1.9} />
            {t('ai.full')}
          </button>
        </div>
      </aside>
    </>
  );
}
