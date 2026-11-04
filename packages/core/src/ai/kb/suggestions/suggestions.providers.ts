// Provider hàng chờ học từ hội thoại (TIP-043) — ai.module chỉ trải mảng này (facade), logic nằm trong thư mục suggestions/.
import { KbSuggestionApproveHandler, KbSuggestionProposeHandler, KbSuggestionRejectHandler } from './suggestion.handlers';

export const KB_SUGGESTION_PROVIDERS = [KbSuggestionProposeHandler, KbSuggestionApproveHandler, KbSuggestionRejectHandler];
