// Mẫu chứng từ (Blueprint §3.4 sales · doc_template; D30; standards/documents/templates.md).
// Báo giá / hợp đồng / đề nghị thanh toán / phiếu thu; soạn rich hoặc tải DOCX (`POST /v1/files` purpose document → `file_id`) → AI
// nhận diện biến → người dùng gán biến → bảng kiểm pháp lý → lưu (TIP-028).
import { z } from 'zod';
import { defineAction } from './define';

const KIND = z.enum(['quote', 'contract', 'payment_request', 'receipt']);
const FIELD = z.object({ placeholder: z.string().min(1).max(80), variable: z.string().min(1).max(60) });

export const docTemplateCreate = defineAction({
  id: 'doc_template.create',
  module: 'documents',
  title: 'actions.doc_template.create.title',
  description:
    'Create a document template, rich text or uploaded DOCX with mapped variables. Example: {"kind":"contract","name":"HĐ dịch vụ spa","source":"docx","file_id":"0190…","fields":[{"placeholder":"BÊN B: ……","variable":"customer.name"}]}',
  input: z.object({
    kind: KIND,
    name: z.string().trim().min(1).max(120),
    source: z.enum(['rich', 'docx']),
    body: z.string().max(100_000).optional(),
    file_name: z.string().max(200).optional(),
    /** Tệp Word đã tải lên (purpose document) — bắt buộc khi source=docx. */
    file_id: z.string().optional(),
    fields: z.array(FIELD).max(200).optional(),
    is_default: z.boolean().optional(),
    /** Loại hợp đồng của mẫu (chỉ kind=contract; rỗng = mẫu chung mọi loại) — mặc định tách theo loại (TIP-030b). */
    contract_kind: z.enum(['service', 'sale', 'framework']).nullable().optional(),
  }),
  output: z.object({ template_id: z.string() }),
  permission: 'documents.manage',
  risk: 'config',
  agentGrantable: false,
  /** Hoàn tác 24h = xoá mềm mẫu khi CHƯA chứng từ nào dùng (TIP-028b); đã dùng → 409 HAS_DEPENDENCIES. */
  undo: { windowSec: 86_400 },
  invalidates: ['doc_templates'],
});

export const docTemplateUpdate = defineAction({
  id: 'doc_template.update',
  module: 'documents',
  title: 'actions.doc_template.update.title',
  description: 'Update a document template (name, body, variables, default flag). Example: {"template_id":"tpl_1","is_default":true}',
  input: z.object({
    template_id: z.string().min(1),
    name: z.string().trim().min(1).max(120).optional(),
    body: z.string().max(100_000).optional(),
    fields: z.array(FIELD).max(200).optional(),
    is_default: z.boolean().optional(),
    /** Đổi loại hợp đồng của mẫu (null = mẫu chung); mẫu đang là mặc định không đổi được nhóm (bỏ mặc định ở nhóm cũ trước). */
    contract_kind: z.enum(['service', 'sale', 'framework']).nullable().optional(),
    /** Phiên bản đang mở — lệch → STALE_VERSION 409 (concurrency §1). */
    if_version: z.number().int().positive().optional(),
  }),
  output: z.object({ template_id: z.string(), version: z.number().int() }),
  permission: 'documents.manage',
  risk: 'config',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['doc_templates'],
});

export const docTemplateDelete = defineAction({
  id: 'doc_template.delete',
  module: 'documents',
  title: 'actions.doc_template.delete.title',
  description: 'Delete a document template that is not the default of its kind. Example: {"template_id":"tpl_1"}',
  input: z.object({ template_id: z.string().min(1) }),
  output: z.object({ ok: z.boolean() }),
  permission: 'documents.manage',
  risk: 'delete',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['doc_templates'],
});

export const docTemplateDetectFields = defineAction({
  id: 'doc_template.detect_fields',
  module: 'documents',
  title: 'actions.doc_template.detect_fields.title',
  description: 'AI reads an uploaded DOCX and proposes placeholder → variable mappings plus a legal checklist. Example: {"kind":"contract","file_id":"0190…"}',
  input: z.object({ kind: KIND, file_id: z.string().min(1), file_name: z.string().max(200).optional() }),
  output: z.object({
    fields: z.array(FIELD.extend({ confidence: z.number().min(0).max(1) })),
    checklist: z.array(z.object({ key: z.string(), ok: z.boolean() })),
  }),
  permission: 'documents.manage',
  risk: 'read',
  agentGrantable: false,
  invalidates: [],
});
