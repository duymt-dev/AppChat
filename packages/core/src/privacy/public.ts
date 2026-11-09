// API công khai của domain privacy cho apps/api + domain khác.
export { PrivacyModule } from './privacy.module';
export { privacyPreview, inventoryRevisionOf, assertNoOpenBlockers } from './services/preview';
export { acceptForget } from './services/operation';
export { privacyOperationStatus } from './services/report';
