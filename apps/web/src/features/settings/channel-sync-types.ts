// Kiểu đồng bộ kênh phía FE (TIP-014b D3) — shape theo packages/shared (`ChannelContactSyncDto`), FE không tự định nghĩa lại.
export type { ChannelContactSyncDto as ContactSync, ChannelHistoryRunDto as HistoryRun } from '@appchat/shared';
import type { ChannelContactSyncDto } from '@appchat/shared';

export type ContactSyncRow = ChannelContactSyncDto['rows'][number];
export type ContactSyncState = ChannelContactSyncDto['state'];

/** Lần đồng bộ còn đang chạy (FE hỏi lại trạng thái). */
export const syncRunning = (s: ContactSyncState | undefined) => s === 'queued' || s === 'running';

/** Số dòng chọn nhập tối đa mỗi lần (giới hạn lô `contact.import`). */
export const IMPORT_BATCH = 500;
