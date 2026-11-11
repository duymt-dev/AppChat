// Kho tạm có giới hạn của mock đầu vào Trợ lý (TIP-023f §5.1): bytes tệp đã "tải lên" (purpose attachment) + artifact theo bản nháp.
// Chỉ trong bộ nhớ phiên trình duyệt, tối đa 20 tệp × 2 MB giữ bytes (thừa thì chỉ giữ metadata) — mô phỏng hợp đồng, KHÔNG chứng minh
// khả năng parser / model (HTTP mới chạy parser thật).
import type { InputArtifactDto, InputLocator } from '@appchat/shared';

const MAX_FILES = 20;
const MAX_BYTES = 2 * 1024 * 1024;

export interface MockUpload {
  name: string;
  size: number;
  mime: string;
  text: string | null;
}

export interface MockArtifact extends InputArtifactDto {
  draft_nonce: string;
  file_id: string;
  /** Số lần hỏi trạng thái — mock trả `preparing` lần đầu rồi kết quả (như worker xử lý sau). */
  polls: number;
  parts: { locator: InputLocator; text?: string; image_ref?: string }[];
}

export const inputUploads = new Map<string, MockUpload>();
export const inputArtifacts = new Map<string, MockArtifact>();

export function keepUpload(id: string, u: MockUpload) {
  if (inputUploads.size >= MAX_FILES) inputUploads.delete(inputUploads.keys().next().value!);
  inputUploads.set(id, u.text !== null && u.size > MAX_BYTES ? { ...u, text: null } : u);
}

export const resetAssistantInput = () => {
  inputUploads.clear();
  inputArtifacts.clear();
};
