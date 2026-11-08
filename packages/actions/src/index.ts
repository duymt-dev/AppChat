import type { ActionDef } from './define';
import * as identity from './identity';
import * as onboarding from './onboarding';
import * as dashboard from './dashboard';
import * as insights from './insights';
import * as listExports from './list-exports';
import * as inbox from './inbox';
import * as inboxAliases from './inbox-aliases';
import * as inboxGroups from './inbox-groups';
import * as crm from './crm';
import * as ai from './ai';
import * as catalog from './catalog';
import * as catalogOperations from './catalog-operations';
import * as contactMemory from './contact-memory';
import * as quotes from './quotes';
import * as contracts from './contracts';
import * as contractFiles from './contract-files';
import * as contractDraft from './contract-draft';
import * as contractAppendix from './contract-appendix';
import * as commerceSettings from './commerce-settings';
import * as commerceDelivery from './commerce-delivery';
import * as orders from './orders';
import * as invoices from './invoices';
import * as payments from './payments';
import * as booking from './booking';
import * as bookingConfig from './booking-config';
import * as bookingUpdate from './booking-update';
import * as conversationGroups from './conversation-groups';
import * as groupResults from './group-results';
import * as channelOperations from './channel-operations';
import * as channelFriends from './channel-friends';
import * as support from './support';
import * as marketing from './marketing';
import * as marketingExtras from './marketing-extras';
import * as loyalty from './loyalty';
import * as loyaltySystem from './loyalty-system';
import * as loyaltyPayments from './loyalty-payments';
import * as settings from './settings';
import * as authz from './authz';
import * as leadRouting from './lead-routing';
import * as bankIngress from './bank-ingress';
import * as settingsApps from './settings-apps';
import * as settingsAi from './settings-ai';
import * as billingLifecycle from './billing-lifecycle';
import * as kbFolders from './kb-folders';
import * as kbSuggestions from './kb-suggestions';
import * as documents from './documents';
import * as platformAdmin from './platform-admin';
import * as adminConfig from './admin-config';
import * as adminWorkspaces from './admin-workspaces';
import * as workspaceLifecycle from './workspace-lifecycle';
import * as workspaceDanger from './workspace-danger';
import * as salesReads from './reads/sales';
import * as contractReads from './reads/contracts';
import * as crmReads from './reads/crm';
import * as supportReads from './reads/support';
import * as bookingReads from './reads/booking';
import * as inboxReads from './reads/inbox';
import * as aiReads from './reads/ai';
import * as identityReads from './reads/identity';
import * as channelReads from './reads/channels';
import * as documentReads from './reads/documents';
import * as assistantUi from './assistant-ui';
import * as integrationProbe from './integration-probe';
import * as integrationRuntime from './integration-runtime';
import * as contactNotes from './contact-notes';
import * as contactTransfer from './contact-transfer';
import * as contactLifecycle from './contact-lifecycle';
import * as contactMergeReads from './contact-merge';
import * as contactTasks from './contact-tasks';
import * as contactOpportunities from './contact-opportunities';
import * as dataJobs from './data-jobs';
import * as dataTransfer from './data-transfer';
import * as crmBulk from './crm-bulk';
import * as crmForms from './crm-forms';
import * as inboxTranslation from './inbox-translation';

export * from './define';
export * from './assistant-ui';
export * from './identity';
export * from './onboarding';
export * from './dashboard';
export * from './insights';
export * from './list-exports';
export * from './inbox';
export * from './inbox-aliases';
export * from './inbox-groups';
export * from './crm';
export * from './contact-lifecycle';
export * from './contact-merge';
export * from './ai';
export * from './catalog';
export * from './catalog-operations';
export * from './contact-memory';
export * from './quotes';
export * from './contracts';
export * from './contract-files';
export * from './contract-draft';
export * from './contract-appendix';
export * from './commerce-settings';
export * from './commerce-delivery';
export * from './orders';
export * from './invoices';
export * from './payments';
export * from './booking';
export * from './booking-config';
export * from './booking-update';
export * from './conversation-groups';
export * from './group-results';
export * from './channel-operations';
export * from './channel-friends';
export * from './support';
export * from './marketing';
export * from './marketing-extras';
export * from './loyalty';
export * from './loyalty-reasons';
export * from './loyalty-system';
export * from './loyalty-payments';
export * from './settings';
export * from './authz';
export * from './lead-routing';
export * from './bank-ingress';
export * from './settings-apps';
export * from './settings-ai';
export * from './billing-lifecycle';
export * from './kb-folders';
export * from './kb-suggestions';
export * from './documents';
export * from './platform-admin';
export * from './admin-config';
export * from './admin-workspaces';
export * from './workspace-lifecycle';
export * from './workspace-danger';
export * from './reads/sales';
export * from './reads/contracts';
export * from './reads/crm';
export * from './reads/support';
export * from './reads/booking';
export * from './reads/inbox';
export * from './reads/ai';
export * from './reads/identity';
export * from './reads/channels';
export * from './reads/documents';
export * from './integration-probe';
export * from './integration-runtime';
export * from './contact-notes';
export * from './contact-transfer';
export * from './contact-tasks';
export * from './contact-opportunities';
export * from './data-jobs';
export * from './data-transfer';
export * from './crm-bulk';
export * from './crm-forms';
export * from './inbox-translation';

/** Registry dùng chung web / core / ai. Domain mới: thêm file `<domain>.ts` rồi spread vào đây. */
// Mỗi file domain chỉ export ActionDef — schema dùng chung đặt trong file riêng, không export từ file domain.
export const registry: readonly ActionDef[] = [
  ...Object.values(identity),
  ...Object.values(onboarding),
  ...Object.values(dashboard),
  ...Object.values(insights),
  ...Object.values(listExports),
  ...Object.values(inbox),
  ...Object.values(inboxAliases),
  ...Object.values(inboxGroups),
  ...Object.values(crm),
  ...Object.values(ai),
  ...Object.values(catalog),
  ...Object.values(catalogOperations),
  ...Object.values(contactMemory),
  ...Object.values(quotes),
  ...Object.values(contracts),
  ...Object.values(contractFiles),
  ...Object.values(contractDraft),
  ...Object.values(contractAppendix),
  ...Object.values(commerceSettings),
  ...Object.values(commerceDelivery),
  ...Object.values(orders),
  ...Object.values(invoices),
  ...Object.values(payments),
  ...Object.values(booking),
  ...Object.values(bookingConfig),
  ...Object.values(bookingUpdate),
  ...Object.values(conversationGroups),
  ...Object.values(groupResults),
  ...Object.values(channelOperations),
  ...Object.values(channelFriends),
  ...Object.values(support),
  ...Object.values(marketing),
  ...Object.values(marketingExtras),
  ...Object.values(loyalty),
  ...Object.values(loyaltySystem),
  ...Object.values(loyaltyPayments),
  ...Object.values(settings),
  ...Object.values(authz),
  ...Object.values(leadRouting),
  ...Object.values(bankIngress),
  ...Object.values(settingsApps),
  ...Object.values(settingsAi),
  ...Object.values(billingLifecycle),
  ...Object.values(kbFolders),
  ...Object.values(kbSuggestions),
  ...Object.values(documents),
  ...Object.values(platformAdmin),
  ...Object.values(adminConfig),
  ...Object.values(adminWorkspaces),
  ...Object.values(workspaceLifecycle),
  ...Object.values(workspaceDanger),
  ...Object.values(dataJobs),
  ...Object.values(dataTransfer),
  ...Object.values(crmBulk),
  ...Object.values(crmForms),
  ...Object.values(inboxTranslation),
  // Action đọc bản ghi cho Trợ lý / agent (TIP-023b R2 · DC-224).
  ...Object.values(salesReads),
  ...Object.values(contractReads),
  ...Object.values(crmReads),
  ...Object.values(supportReads),
  ...Object.values(bookingReads),
  ...Object.values(inboxReads),
  ...Object.values(aiReads),
  ...Object.values(identityReads),
  ...Object.values(channelReads),
  ...Object.values(assistantUi),
  ...Object.values(documentReads),
  // TIP-023c G3 (DEF-012-1): metadata form + thăm dò connector, không đổi kết nối.
  ...Object.values(integrationProbe),
  ...Object.values(integrationRuntime),
  ...Object.values(contactNotes),
  ...Object.values(contactTransfer),
  ...Object.values(contactLifecycle),
  ...Object.values(contactMergeReads),
  ...Object.values(contactTasks),
  ...Object.values(contactOpportunities),
] as ActionDef[];

export const getAction = (id: string): ActionDef | undefined => registry.find((a) => a.id === id);
