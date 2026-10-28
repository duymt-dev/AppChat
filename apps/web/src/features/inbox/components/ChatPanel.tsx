// Khung chat (mount lại theo key = conversation id để bản nháp / gợi ý reset): header · ghim · luồng tin · banner "Cần người" + bản nháp AI · thẻ gợi ý trả lời · ô soạn — prototype L1736–1902.
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useChatStyles } from '../styles/chat.styles';
import { useComposerStyles } from '../styles/composer.styles';
import { threadQuery } from '../api';
import { ChatHeader } from './ChatHeader';
import { Composer } from './Composer';
import { MessageBubble } from './MessageBubble';
import { AiDraftCard } from './AiDraftCard';
import { Rich } from './Rich';
import { useInboxUi } from '../inbox-store';
import type { ChannelMeta, Conversation } from '../types';

export function ChatPanel({ conv, channel, className }: { conv: Conversation; channel: ChannelMeta | undefined; className?: string }) {
  const t = useTranslations('inbox.chat');
  const { styles, cx } = useChatStyles();
  const { styles: cs } = useComposerStyles();
  const thread = useQuery(threadQuery(conv.id));
  const send = useAction('message.send');
  const handoff = useAction('conversation.handoff');
  const draft = useInboxUi((s) => s.draft);
  const setDraft = (v: string) => useInboxUi.getState().set({ draft: v });
  const [hideSuggest, setHideSuggest] = useState(false);
  const suggestion = thread.data?.suggestion;
  const plain = (s: string) => s.replace(/<\/?b>/g, '');

  return (
    <div className={cx(styles.col, className)} data-testid="chat-panel">
      <ChatHeader conv={conv} channel={channel} />
      <div className={styles.thread} data-testid="thread">
        {(thread.data?.data ?? []).map((m) => (
          <MessageBubble key={m.id} m={m} conv={conv} />
        ))}
        {conv.ai_state === 'handoff' ? (
          <AiDraftCard
            testId="handoff-banner"
            title={t('handoff.title')}
            badge={t('handoff.badge')}
            reason={conv.handoff_reason ?? ''}
            body={conv.ai_draft ?? ''}
            actions={
              <>
                <button type="button" className={cs.primary} onClick={() => void handoff.run({ conversation_id: conv.id })} data-testid="handoff-take">
                  <Icon name="ic-users" size={14} color={color.white} />
                  {t('handoff.take')}
                </button>
                {conv.ai_draft ? (
                  <button type="button" className={cs.ghost} onClick={() => setDraft(conv.ai_draft ?? '')}>
                    {t('handoff.useDraft')}
                  </button>
                ) : null}
              </>
            }
          />
        ) : suggestion && !hideSuggest ? (
          <AiDraftCard
            testId="ai-suggest"
            title={t('suggest.title')}
            badge={t('suggest.confidence', { pct: suggestion.confidence })}
            body={<Rich text={suggestion.text} />}
            actions={
              <>
                <button
                  type="button"
                  className={cs.primary}
                  onClick={async () => {
                    const r = await send.run({ conversation_id: conv.id, text: plain(suggestion.text) }, { silent: true });
                    if (r) setHideSuggest(true);
                  }}
                >
                  <Icon name="ic-send" size={14} color={color.white} />
                  {t('suggest.send')}
                </button>
                <button type="button" className={cs.ghost} onClick={() => (setDraft(plain(suggestion.text)), setHideSuggest(true))}>
                  {t('suggest.edit')}
                </button>
                <button type="button" className={cs.ghost} onClick={() => setHideSuggest(true)}>
                  {t('suggest.other')}
                </button>
              </>
            }
          />
        ) : null}
      </div>
      <Composer conv={conv} channel={channel} draft={draft} onDraft={setDraft} />
    </div>
  );
}
