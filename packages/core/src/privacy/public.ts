// API công khai của domain privacy cho apps/api + domain khác.
export { PrivacyModule } from './privacy.module';
export { privacyPreview, inventoryRevisionOf, assertNoOpenBlockers } from './services/preview';
export { acceptForget } from './services/operation';
export { privacyOperationStatus } from './services/report';
export { cleanupStep, PRIVACY_CLEANUP_ACTOR, PRIVACY_CLEANUP_BATCH, type CleanupStepOutcome } from './services/cleanup';
export { reviewResolve, reviewResolvePreview } from './services/review';
export { tombstoneIdentities, allTombstoned, issueRecreationPermit, type RecreationIdentifier } from './services/recreation';
export { reserveJournal, acknowledgeJournal, decodeCapsule, type JournalCapsule, type ReservedJournal } from './services/journal';
