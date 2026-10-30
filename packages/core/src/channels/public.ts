// API công khai của domain channels cho apps/api (controller) + domain khác (Inbox TIP-016: hàng đợi gửi, kết quả gửi, tin vào).
export { ChannelsReadService, healthOf, fmtFrt, type AgentNames } from './services/read.service';
export { ChannelAccounts, settingsOf, type AccountSettings } from './services/accounts.service';
export { ChannelControl, CHANNEL_INBOUND_QUEUE, CHANNEL_LOGIN_QUEUE, leaseKey, type LoginJob } from './services/control';
export { ChannelSendQueue, registerSendResultSink, unregisterSendResultSink, type SendJob, type SendResult } from './services/send-queue';
export { CHANNEL_REGISTRY, channelRegistryFor } from './channels.module';
export { CHANNELS_RUNTIME } from './jobs/channels.jobs.module';
