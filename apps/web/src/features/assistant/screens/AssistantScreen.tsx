// Trợ lý AI (orchestrator) — prototype L1178–1311: màn chào (Chat / Cowork) → hội thoại có thẻ xác nhận / kết quả.
'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
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
import { useOpenThread } from '../hooks/useOpenThread';
import { SessionBrowser } from '../components/SessionBrowser';
import { HistoryButton } from '../components/HistoryButton';

export function AssistantScreen() {
  useAssistantUiCommands();
  const { styles } = useAssistantStyles();
  const t = useTranslations('assistant');
  const { data: me } = useMe();
  const allowed = useCan('assistant.use');
  const ui = useAssistantUi();
  const chat = useAssistantChat();
  useOpenThread(allowed);
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
  const [history, setHistory] = useState(false);
  // Đổi workspace → bỏ hội thoại đang mở (không lẫn phiên giữa workspace).
  const ws = me?.current_workspace_id;
  const boundWs = useRef(ws);
  useEffect(() => {
    if (ws && boundWs.current && boundWs.current !== ws) useAssistantUi.getState().reset();
    boundWs.current = ws;
  }, [ws]);
  const name = me?.user.name.split(' ').pop() ?? '';
  const inChat = ui.messages.length > 0;

  return (
    <div className={styles.root} data-testid="assistant">
      <AssistantTopBar onNewChat={inChat ? ui.reset : undefined} right={allowed ? <HistoryButton onClick={() => setHistory(true)} /> : null} />
      <PageStates state={allowed ? 'ready' : 'no-permission'}>
        {inChat ? (
          <ChatThread onSend={() => void chat.send()} onDecide={(m, d) => void chat.decide(m, d)} onOpen={chat.openResult} onUi={chat.runUi} onExternal={() => void chat.send(t('genuiConnected'))} />
        ) : (
          <WelcomeView name={name} onSend={(text) => void chat.send(text)} />
        )}
      </PageStates>
      <ComposerPopovers />
      <SessionBrowser
        open={history}
        current={ui.sessionId}
        onClose={() => setHistory(false)}
        onOpen={(id) => {
          setHistory(false);
          router.push(`/assistant?thread=${encodeURIComponent(id)}`);
        }}
      />
    </div>
  );
}
