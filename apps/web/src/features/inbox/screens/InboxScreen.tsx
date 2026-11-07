// Hộp thư (orchestrator) — prototype L1505–2226: tab trên · rail thư mục · danh sách · khung chat · hồ sơ 360° / thông tin nhóm · modal.
// < md: một cột — danh sách hoặc khung chat (nút ‹ quay lại).
'use client';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Empty } from 'antd';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { useInboxStyles } from '../styles/inbox.styles';
import { useInboxUi } from '../inbox-store';
import { accountsQuery, channelsQuery, countParams, countsQuery } from '../api';
import { useConversations } from '../hooks/useConversations';
import { useConversationRoom } from '../hooks/useConversationRoom';
import { ChatPanel } from '../components/ChatPanel';
import { ConnectChannelModal } from '../components/ConnectChannelModal';
import { ConversationList } from '../components/ConversationList';
import { FolderRail } from '../components/FolderRail';
import { ForwardModal } from '../components/ForwardModal';
import { CreateGroupModal } from '../components/CreateGroupModal';
import { GroupInfoPanel } from '../components/GroupInfoPanel';
import { InboxAiModal } from '../components/InboxAiModal';
import { Panel360 } from '../components/Panel360';
import { TopTabs } from '../components/TopTabs';
import { useInboxUiCommands } from '../ui-commands';
import { useAssistantContext } from '../hooks/useAssistantContext';

export function InboxScreen() {
  useInboxUiCommands();
  useAssistantContext();
  const t = useTranslations('inbox');
  const { styles, cx } = useInboxStyles();
  const ui = useInboxUi();
  const { list, convs, conv, params } = useConversations();
  useConversationRoom(conv?.id);
  const counts = useQuery(countsQuery(countParams(params))).data;
  const channels = useQuery(channelsQuery()).data;
  const accounts = useQuery(accountsQuery()).data ?? [];
  const unread = counts?.mailbox.find(([k]) => k === 'unread')?.[2] ?? convs.reduce((n, c) => n + c.unread, 0);
  const customer = conv ? (conv.kind === 'group' ? conv.title : conv.title.split(' — ')[0]!) : '';

  return (
    <div className={styles.root} data-testid="inbox">
      <TopTabs counts={counts} />
      <div className={styles.body}>
        {ui.folderRail && counts ? <FolderRail counts={counts} channels={channels} /> : null}
        <PageStates state={stateOf(list)} onRetry={() => void list.refetch()}>
          <ConversationList
            conversations={convs}
            total={counts?.mailbox.find(([k]) => k === 'all')?.[2] ?? convs.length}
            hasMore={list.hasNextPage}
            onMore={() => void list.fetchNextPage()}
            channels={channels}
            counts={counts}
            accounts={accounts}
            unreadTotal={unread}
            filterKey={JSON.stringify(params)}
            className={cx(ui.mobileChat && conv && styles.hideMobile)}
          />
          {conv ? (
            <>
              <ChatPanel key={conv.id} conv={conv} channel={channels?.[conv.channel]} className={cx(!ui.mobileChat && styles.hideMobile)} />
              {ui.show360 ? conv.kind === 'group' ? <GroupInfoPanel conv={conv} /> : conv.contact_id ? <Panel360 contactId={conv.contact_id} /> : null : null}
            </>
          ) : (
            <div className={cx(styles.empty, styles.hideMobile)} data-testid="inbox-empty">
              <Empty description={t('emptyChat')} />
            </div>
          )}
        </PageStates>
      </div>
      {ui.modal === 'connect' ? <ConnectChannelModal /> : null}
      {ui.modal === 'ai' ? <InboxAiModal customer={customer} /> : null}
      {ui.modal === 'forward' ? <ForwardModal /> : null}
      {ui.modal === 'group' ? <CreateGroupModal /> : null}
    </div>
  );
}
