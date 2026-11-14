// Topic mở rộng theo module (TIP-003b §1.5): mỗi nhóm đã tích hợp phải có schema có trần + ánh xạ aggregate riêng đã test — không có
// "catch-all extension" hay mặc định không-consumer. Danh sách này để test duyệt đủ từng nhóm; thêm module mới = thêm nhóm ở đây +
// AGGREGATE_RULES + EVENT_SCHEMAS (test bắt thiếu).
import { LOYALTY_EVENT_SCHEMAS } from '../../loyalty/events';
import { MARKETING_EVENT_SCHEMAS } from '../../marketing/events';
import { KB_SUGGESTION_EVENT_SCHEMAS } from '../../kb/suggestion-events';
import { KB_INDEX_EVENT_SCHEMAS } from '../../kb/index-events';
import { INSIGHTS_EVENT_SCHEMAS } from '../../insights/events';
import { ACTION_DISCOVERY_EVENT_SCHEMAS } from '../action-discovery';
import { ASSISTANT_INPUT_EVENT_SCHEMAS } from '../assistant-input';
import { DOCUMENT_RENDER_EVENT_SCHEMAS } from '../document-render';
import { TICKET_CATEGORY_EVENT_SCHEMAS } from '../../support/category-events';
import { BASELINE_EVENT_SCHEMAS } from './baseline';

export const EXTENSION_EVENT_GROUPS = {
  loyalty: LOYALTY_EVENT_SCHEMAS,
  marketing: MARKETING_EVENT_SCHEMAS,
  kb_suggestion: KB_SUGGESTION_EVENT_SCHEMAS,
  kb_index: KB_INDEX_EVENT_SCHEMAS,
  insights: INSIGHTS_EVENT_SCHEMAS,
  action_discovery: ACTION_DISCOVERY_EVENT_SCHEMAS,
  assistant_input: ASSISTANT_INPUT_EVENT_SCHEMAS,
  document_render: DOCUMENT_RENDER_EVENT_SCHEMAS,
  ticket_categories: TICKET_CATEGORY_EVENT_SCHEMAS,
  baseline: BASELINE_EVENT_SCHEMAS,
} as const;

export const extensionTopics = (): string[] => Object.values(EXTENSION_EVENT_GROUPS).flatMap((g) => Object.keys(g));
