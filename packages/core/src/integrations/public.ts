// API công khai của domain integrations cho apps/api (controller), domain khác (resolver theo port, queue gọi ra ngoài —
// TIP-010 / 031 / 032) và test. Một dòng re-export ở src/index.ts (facade).
export { ConnectionsService, connectionCtx, rotated } from './services/connections.service';
export { queueProbe, probeOp, PROBE_OP } from './operations/probe';
export { MAIL_SEND_OP, MAIL_MAX_ATTEMPTS, mailSendOp, queueMailSend, registerMailDomain, unregisterMailDomain, type MailDomain } from './mail/dispatch';
export { mailTransports, type MailTransportOptions } from './mail/module';
export { purgeMailBindings } from './mail/purge';
export { captureBinding } from './mail/bindings';
export { BANK_PULL_OP, bankPullOp, activeFeed, type StageReceipts } from './operations/bank-pull';
export { registerCallOp, unregisterCallOp, executeCall, IntegrationOps, INTEGRATION_OPS_QUEUE, type CallOpSpec } from './operations/call-runner';
export { upsertCall, claimCall, finishCall, callIdem } from './operations/call-receipt';
export { providerHttp, PROVIDER_HOSTS } from './operations/provider-http';
export { ConnectionDetailReader } from './services/connection-detail';
export { healthOf as connectionHealthOf } from './services/connection-health';
export { sweepIntegrationOps } from './jobs/bank-sync.scheduler';
export { IntegrationResolver, type ResolvedConnection } from './services/resolver';
export { adapterOf, sandboxAllowed } from './services/adapter-selection';
export { IntegrationsReadService } from './services/read.service';
export { IntegrationWebhooks } from './services/webhook.service';
export { registerBankIngressSink, unregisterBankIngressSink, type BankIngressSink } from './services/bank-ingress-sink';
export {
  IntegrationCalls,
  INTEGRATIONS_QUEUE,
  CALL_ATTEMPTS,
  callKey,
  registerIntegrationOp,
  unregisterIntegrationOp,
  runIntegrationCall,
  type IntegrationCallJob,
  type IntegrationOpHandler,
} from './jobs/integration-call.processor';
