// Khung chat (mount lại theo key = conversation id để bản nháp / gợi ý reset): header · ghim · luồng tin · banner "Cần người" + bản nháp AI · thẻ gợi ý trả lời · ô soạn — prototype L1736–1902.
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useChatStyles } from '../styles/chat.styles';
import { useComposerStyles } from '../styles/composer.styles';
import { useThreadWindow } from '../hooks/useThreadWindow';
import { useAiDraftBinding } from '../hooks/useAiDraftBinding';
import { ChatHeader } from './ChatHeader';
import { Composer } from './Composer';
import { ThreadViewport } from './ThreadViewport';
import { InboxApprovals } from './InboxApprovals';
import { HandoffSummaryPanel } from './HandoffSummaryPanel';
import { AiDraftCard } from './AiDraftCard';
import { Rich } from './Rich';
import { ThreadSearchBar } from './ThreadSearchBar';
import { useInboxUi } from '../inbox-store';
import type { ChannelMeta, Conversation } from '../types';

export function ChatPanel({
  conv,
  channel,
  className,
}: {
  conv: Conversation;
  channel: ChannelMeta | undefined;
  className?: string;
}) {
  const t = useTranslations('inbox.chat');
  const { styles, cx } = useChatStyles();
  const { styles: cs } = useComposerStyles();
  const searchOpen = useInboxUi((s) => s.searchOpen);
  const w = useThreadWindow(conv.id);
  const send = useAction('message.send');
  const handoff = useAction('conversation.handoff');
  const draft = useInboxUi((s) => s.draft);
  const bind = useAiDraftBinding();
  const [hideSuggest, setHideSuggest] = useState(false);
  const suggestion = w.suggestion;
  const plain = (s: string) => s.replace(/<\/?b>/g, '');

  return (
    <div className={cx(styles.col, className)} data-testid="chat-panel">
      <ChatHeader conv={conv} channel={channel} />
      {searchOpen ? <ThreadSearchBar conv={conv} onJump={w.jumpTo} /> : null}
      <ThreadViewport conv={conv} w={w}>
        <InboxApprovals conversationId={conv.id} />
        {conv.ai_state === 'handoff' ? (
          <>
            <AiDraftCard
              testId="handoff-banner"
              title={t('handoff.title')}
              badge={t('handoff.badge')}
              reason={conv.handoff_reason ?? ''}
              body={conv.ai_draft ?? ''}
              actions={
                <>
                  <button
                    type="button"
                    className={cs.primary}
                    onClick={() => void handoff.run({ conversation_id: conv.id })}
                    data-testid="handoff-take"
                  >
                    <Icon name="ic-users" size={14} color={color.white} />
                    {t('handoff.take')}
                  </button>
                  {conv.ai_draft ? (
                    <button type="button" className={cs.ghost} onClick={() => bind.use(conv.ai_draft ?? '', conv.ai_draft_ref)} data-testid="handoff-use-draft">
                      {t('handoff.useDraft')}
                    </button>
                  ) : null}
                </>
              }
            />
            {conv.has_handoff_summary ? <HandoffSummaryPanel conversationId={conv.id} /> : null}
          </>
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
                    const r = await send.run(
                      bind.withRef({ conversation_id: conv.id, text: plain(suggestion.text) }, suggestion.ref ?? null),
                      { silent: true, onError: (e) => (bind.onError(e) ? (setHideSuggest(true), true) : false) },
                    );
                    if (r) setHideSuggest(true);
                  }}
                >
                  <Icon name="ic-send" size={14} color={color.white} />
                  {t('suggest.send')}
                </button>
                <button
                  type="button"
                  className={cs.ghost}
                  onClick={() => (bind.use(plain(suggestion.text), suggestion.ref), setHideSuggest(true))}
                >
                  {t('suggest.edit')}
                </button>
                <button type="button" className={cs.ghost} onClick={() => setHideSuggest(true)}>
                  {t('suggest.other')}
                </button>
              </>
            }
          />
        ) : null}
      </ThreadViewport>
      <Composer conv={conv} channel={channel} draft={draft} onDraft={bind.edit} />
    </div>
  );
}
