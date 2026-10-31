// Trợ lý AI (orchestrator) — prototype L1178–1311: màn chào (Chat / Cowork) → hội thoại có thẻ xác nhận / kết quả.
'use client';
import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMe } from '@/shared/shell/useShellData';
import { useCan } from '@/shared/authz/useCan';
import { PageStates } from '@/shared/states/PageStates';
import { useAssistantStyles } from '../styles/assistant.styles';
import { useAssistantUi } from '../assistant-store';
import { useAssistantChat } from '../hooks/useAssistantChat';
import { AssistantTopBar } from '../components/AssistantTopBar';
import { WelcomeView } from '../components/WelcomeView';
import { ChatThread } from '../components/ChatThread';
import { ComposerPopovers } from '../components/ComposerPopovers';
import { useAssistantUiCommands } from '../ui-commands';

export function AssistantScreen() {
  useAssistantUiCommands();
  const { styles } = useAssistantStyles();
  const { data: me } = useMe();
  const allowed = useCan('assistant.use');
  const ui = useAssistantUi();
  const chat = useAssistantChat();
  // Câu hỏi gửi từ Trợ lý thu nhỏ (`?ask=&from=`): gửi một lần với ngữ cảnh màn gốc, rồi bỏ tham số khỏi URL.
  const params = useSearchParams();
  const router = useRouter();
  const asked = useRef(false);
  const ask = params.get('ask');
  useEffect(() => {
    if (!ask || asked.current || !allowed) return;
    asked.current = true;
    void chat.send(ask, params.get('from') ?? undefined);
    router.replace('/assistant');
  }, [ask, allowed, chat, params, router]);
  const name = me?.user.name.split(' ').pop() ?? '';
  const inChat = ui.messages.length > 0;

  return (
    <div className={styles.root} data-testid="assistant">
      <AssistantTopBar onNewChat={inChat ? ui.reset : undefined} />
      <PageStates state={allowed ? 'ready' : 'no-permission'}>
        {inChat ? (
          <ChatThread onSend={() => void chat.send()} onDecide={(m, d) => void chat.decide(m, d)} onOpen={chat.openResult} />
        ) : (
          <WelcomeView name={name} onSend={(text) => void chat.send(text)} />
        )}
      </PageStates>
      <ComposerPopovers />
    </div>
  );
}
