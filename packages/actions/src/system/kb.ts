// Action riêng của kho tri thức (TIP-003c §2, §4.6): chốt kết quả một lần nạp nguồn (đoạn + vector đã embed NGOÀI transaction) đúng lần
// nạp hiện hành (`ingest_seq`) — xoá / học lại / đổi learn làm ứng viên cũ thành no_effect. Đoạn, vector, tệp gốc chỉ ở phía server.
import { defineAction } from '../define';
import { systemInput, systemOutput } from './common';

export const kbSystemPublish = defineAction({
  id: 'kb.system_publish',
  module: 'ai',
  title: 'actions.kb.system_publish.title',
  description: 'Internal: publish the verified ingest result of a knowledge source for its current ingest generation (ready, failed or unlearned).',
  input: systemInput(['publish_ready', 'publish_failed', 'publish_unlearned']),
  output: systemOutput,
  permission: 'self',
  risk: 'write',
  agentGrantable: false,
  exposure: 'internal',
  invalidates: ['kb'],
});
