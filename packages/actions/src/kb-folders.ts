// Thư mục kho tri thức (Blueprint §3.4 `kb.folder.*`, rag §3 — TIP-020 tạo, TIP-020b sửa / xoá): tên trim 1–60, không trùng toàn kho
// (không dấu, không phân biệt hoa thường); visibility public | internal là mặc định cho nguồn MỚI thêm vào thư mục (nguồn cũ giữ snapshot);
// cây cha – con không vòng. Sửa / xoá CAS theo `version`; xoá chỉ thư mục rỗng (không nguồn kể cả thùng rác, không thư mục con).
import { z } from 'zod';
import { defineAction } from './define';

const visibility = z.enum(['public', 'internal']);

export const kbFolderCreate = defineAction({
  id: 'kb.folder.create',
  module: 'ai',
  title: 'actions.kb.folder.create.title',
  description: 'Create a knowledge base folder (visibility = default for sources added to it; internal = staff-only). Example: {"name":"Quy trình dịch vụ","visibility":"internal"}',
  input: z.object({ name: z.string().trim().min(1).max(60), visibility: visibility.optional(), parent_id: z.string().optional() }),
  output: z.object({ folder_id: z.string(), version: z.number().int().optional() }),
  permission: 'kb.manage',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['kb'],
});

export const kbFolderUpdate = defineAction({
  id: 'kb.folder.update',
  module: 'ai',
  title: 'actions.kb.folder.update.title',
  description:
    'Rename a knowledge base folder, change its default visibility for NEW sources (existing sources keep theirs) or move it under another folder (parent_id null = top level). Example: {"folder_id":"…","name":"Chính sách","visibility":"internal","if_version":2}',
  input: z.object({
    folder_id: z.string().min(1),
    name: z.string().trim().min(1).max(60).optional(),
    visibility: visibility.optional(),
    parent_id: z.string().nullable().optional(),
    if_version: z.number().int().positive().optional(),
  }),
  output: z.object({ folder_id: z.string(), version: z.number().int() }),
  permission: 'kb.manage',
  risk: 'write',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['kb'],
});

export const kbFolderDelete = defineAction({
  id: 'kb.folder.delete',
  module: 'ai',
  title: 'actions.kb.folder.delete.title',
  description: 'Delete an EMPTY knowledge base folder (no sources incl. trash, no sub-folders — otherwise HAS_DEPENDENCIES). Example: {"folder_id":"…","if_version":3}',
  input: z.object({ folder_id: z.string().min(1), if_version: z.number().int().positive().optional() }),
  output: z.object({ ok: z.boolean() }),
  permission: 'kb.manage',
  risk: 'delete',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['kb'],
});
