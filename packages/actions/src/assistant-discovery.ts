// Chuẩn bị kho mô tả action theo ngữ nghĩa (TIP-023e §1.4): assistant.use + bắt buộc ngữ cảnh Cowork đã xác nhận (chỉ nguồn
// `assistant` qua thẻ xem trước chuẩn — không agentGrantable, agent/tác vụ gọi KHÔNG được, vì đây là thao tác hạ tầng/chi phí
// chung của workspace, không phải việc nghiệp vụ giao cho agent). Bounded: tối đa DISCOVERY_MAX_ACTIONS mô tả một lần build
// (corpus.ts đã chặn ở buildCorpus, action chỉ phản chiếu lại số thật qua preview). Việc dựng kho chạy NỀN (build processor
// ROLE=ai pha sau) — hành động ở đây chỉ TẠO yêu cầu đã xác nhận (202 job_accepted), không tự chạy embedding ngay.
import { z } from 'zod';
import { defineAction } from './define';

export const assistantDiscoveryPrepare = defineAction({
  id: 'assistant.discovery_prepare',
  module: 'ai',
  title: 'actions.assistant.discovery_prepare.title',
  description:
    'Prepare (build) the semantic action-discovery index for the current workspace — a bounded background job over the action catalogue metadata (no customer data). Only needed when find_actions reports the index is building/not ready; normal keyword search still works without this. Confirm once; the actual embedding batches run in the background and reuse the existing Credit usage, not a fixed fee. Example: {}',
  input: z.object({}),
  output: z.object({ generation_id: z.string(), status: z.enum(['building', 'ready', 'failed', 'unknown']), expected_count: z.number().int() }),
  permission: 'assistant.use',
  risk: 'write',
  agentGrantable: false,
  invalidates: [],
});
