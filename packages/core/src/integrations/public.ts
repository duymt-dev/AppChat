// API công khai của domain integrations cho apps/api (controller), domain khác (resolver theo port, queue gọi ra ngoài —
// TIP-010 / 031 / 032) và test. Một dòng re-export ở src/index.ts (facade).
export { ConnectionsService, connectionCtx } from './services/connections.service';
export { IntegrationResolver, type ResolvedConnection } from './services/resolver';
export { adapterOf, sandboxAllowed } from './services/adapter-selection';
export { IntegrationsReadService } from './services/read.service';
export { IntegrationWebhooks } from './services/webhook.service';
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
