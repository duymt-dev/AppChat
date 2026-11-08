// Provider gộp / chống trùng khách (TIP-015e) — CrmModule gộp vào danh sách provider.
import { ContactDuplicateCandidatesHandler } from './candidates.handler';

export const MERGE_HANDLERS = [ContactDuplicateCandidatesHandler];
