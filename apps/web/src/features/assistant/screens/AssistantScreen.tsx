// Trợ lý AI (orchestrator) — prototype L1178–1311: màn chào (Chat / Cowork) → hội thoại có thẻ xác nhận / kết quả.
'use client';
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

export function AssistantScreen() {
  const { styles } = useAssistantStyles();
  const { data: me } = useMe();
  const allowed = useCan('assistant.use');
  const ui = useAssistantUi();
  const chat = useAssistantChat();
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
