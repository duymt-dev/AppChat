// Kiểu cục bộ của bản nháp đầu vào Trợ lý (TIP-023f §1.1, §4): tệp trong bản nháp đi local → uploading → preparing → ready | error;
// ảnh chụp chờ xem lại; phiên đọc giọng nói. Chỉ handle công khai (artifact_id + revision), không URL lưu trữ / nội dung parse.
import type { InputErrorReason, InputPhase } from '@appchat/shared';

export type DraftAttachmentStatus = 'uploading' | 'preparing' | 'ready' | 'error';

export interface DraftAttachment {
  key: string;
  name: string;
  size: number;
  mime: string;
  status: DraftAttachmentStatus;
  file_id?: string;
  artifact_id?: string;
  revision?: number;
  phase?: InputPhase;
  /** Lý do lỗi có giới hạn (server) hoặc `upload` (mạng / guard tải lên). */
  reason?: InputErrorReason | 'upload' | 'prepare';
}

/** Handle gửi kèm lượt — server kiểm lại chủ / ready / revision / nguồn. */
export interface InputHandle {
  artifact_id: string;
  revision: number;
}

export type CaptureState = { kind: 'idle' } | { kind: 'busy' } | { kind: 'review'; blob: Blob; url: string } | { kind: 'error'; reason: 'unsupported' | 'denied' | 'failed' };

export type DictationState =
  | { kind: 'idle' }
  | { kind: 'consent' }
  | { kind: 'listening'; interim: string }
  | { kind: 'review'; text: string }
  | { kind: 'error'; reason: 'unsupported' | 'denied' | 'no_speech' | 'network' | 'failed' };
