// Khách hàng (Blueprint §3.4 crm, D32 phụ trách + đồng phụ trách). Prototype L2451–2984.
import { z } from 'zod';
import { customValuesSchema } from '@appchat/shared';
import { defineAction } from './define';

const contactId = z.string().min(1);
const userId = z.string().min(1);
const stage = z.enum(['lead', 'potential', 'consulting', 'quote', 'contract', 'won', 'lost']);

const contactFields = z.object({
  full_name: z.string().trim().min(1).max(120),
  title: z.string().max(80).optional(),
  type: z.enum(['individual', 'business', 'household']).optional(),
  group: z.enum(['vip', 'loyal', 'new', 'potential']).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional().or(z.literal('')),
  zalo: z.string().max(30).optional(),
  city: z.string().max(60).optional(),
  district: z.string().max(60).optional(),
  source: z.enum(['zalo_personal', 'email', 'website', 'manual', 'referral']).optional(),
  status: z.enum(['active', 'potential', 'inactive']).optional(),
  owner_user_id: userId.optional(),
  note: z.string().max(2000).optional(),
  /** Trường tuỳ biến (D56) — validate theo định nghĩa ở Executor. */
  custom: customValuesSchema.optional(),
});

export const contactCreate = defineAction({
  id: 'contact.create',
  module: 'crm',
  title: 'actions.contact.create.title',
  description:
    'Create a contact. Fails with CONTACT_OWNED (409) when the phone / email already belongs to a contact owned by someone else. Example: {"full_name":"Nguyễn Thị Lan","phone":"+84 909 123 456"}',
  input: contactFields.refine((v) => !!(v.phone || v.email), { message: 'phone_or_email', path: ['phone'] }),
  output: z.object({ contact_id: z.string(), code: z.string() }),
  permission: 'crm.edit',
  risk: 'write',
  agentGrantable: true,
  undo: { windowSec: 86_400 },
  invalidates: ['crm'],
  uiTarget: (o) => ({ type: 'open', entity: 'contact', id: o.contact_id, view: 'drawer' }),
});

export const contactUpdate = defineAction({
  id: 'contact.update',
  module: 'crm',
  title: 'actions.contact.update.title',
  description: 'Update contact fields. Example: {"contact_id":"ct_lan","patch":{"title":"Chủ shop","city":"TP.HCM"}}',
  input: z.object({ contact_id: contactId, patch: contactFields.partial() }),
  output: z.object({ contact_id: z.string() }),
  permission: 'crm.edit',
  risk: 'write',
  agentGrantable: true,
  undo: { windowSec: 86_400 },
  invalidates: ['crm', 'inbox'],
});

export const contactSetStage = defineAction({
  id: 'contact.set_stage',
  module: 'crm',
  title: 'actions.contact.set_stage.title',
  description: 'Move a contact to a pipeline stage. Example: {"contact_id":"ct_lan","stage":"quote"}',
  input: z.object({ contact_id: contactId, stage }),
  output: z.object({ stage: z.string() }),
  permission: 'crm.edit',
  risk: 'write',
  agentGrantable: true,
  undo: { windowSec: 86_400 },
  invalidates: ['crm'],
});

export const contactTag = defineAction({
  id: 'contact.tag',
  module: 'crm',
  title: 'actions.contact.tag.title',
  description: 'Add or remove a tag on a contact. Example: {"contact_id":"ct_lan","tag":"VIP","op":"add"}',
  input: z.object({ contact_id: contactId, tag: z.string().min(1).max(40), op: z.enum(['add', 'remove']) }),
  output: z.object({ tags: z.array(z.string()) }),
  permission: 'crm.edit',
  risk: 'write',
  agentGrantable: true,
  undo: { windowSec: 86_400 },
  invalidates: ['crm'],
});

export const contactDelete = defineAction({
  id: 'contact.delete',
  module: 'crm',
  title: 'actions.contact.delete.title',
  description: 'Soft-delete a contact (restorable for 30 days). Example: {"contact_id":"kh_1002"}',
  input: z.object({ contact_id: contactId }),
  output: z.object({ deleted: z.boolean() }),
  permission: 'crm.delete',
  risk: 'delete',
  agentGrantable: false,
  undo: { windowSec: 2_592_000 },
  invalidates: ['crm'],
});

export const contactMerge = defineAction({
  id: 'contact.merge',
  module: 'crm',
  title: 'actions.contact.merge.title',
  description: 'Merge duplicate groups into their primary record. Example: {"group_ids":["dg1"]}',
  input: z.object({ group_ids: z.array(z.string().min(1)).min(1).max(50) }),
  output: z.object({ merged: z.number().int() }),
  permission: 'crm.edit',
  risk: 'write',
  bulk: true,
  agentGrantable: false,
  undo: { windowSec: 604_800 },
  invalidates: ['crm'],
});

export const contactAddCollaborator = defineAction({
  id: 'contact.add_collaborator',
  module: 'crm',
  title: 'actions.contact.add_collaborator.title',
  description: 'Add a co-owner (collaborator) or watcher to a contact. Allowed for the contact owner or crm.reassign. Example: {"contact_id":"ct_lan","user_id":"u_minh","role":"collaborator"}',
  input: z.object({ contact_id: contactId, user_id: userId, role: z.enum(['collaborator', 'watcher']) }),
  output: z.object({ collaborators: z.number().int() }),
  permission: 'crm.edit',
  risk: 'write',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['crm'],
});

export const contactRemoveCollaborator = defineAction({
  id: 'contact.remove_collaborator',
  module: 'crm',
  title: 'actions.contact.remove_collaborator.title',
  description: 'Remove a collaborator / watcher from a contact. Example: {"contact_id":"ct_lan","user_id":"u_minh"}',
  input: z.object({ contact_id: contactId, user_id: userId }),
  output: z.object({ collaborators: z.number().int() }),
  permission: 'crm.edit',
  risk: 'write',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['crm'],
});

export const contactTransferOwner = defineAction({
  id: 'contact.transfer_owner',
  module: 'crm',
  title: 'actions.contact.transfer_owner.title',
  description:
    'Transfer the primary owner of a contact (managers only); optionally move open conversations, quotes and appointments. Agents may only propose (approval). Example: {"contact_id":"ct_lan","to_user_id":"u_minh","move":{"conversations":true,"quotes":true,"appointments":false}}',
  input: z.object({
    contact_id: contactId,
    to_user_id: userId,
    move: z.object({ conversations: z.boolean(), quotes: z.boolean(), appointments: z.boolean() }),
    note: z.string().max(500).optional(),
  }),
  output: z.object({ owner_user_id: z.string(), moved: z.object({ conversations: z.number(), quotes: z.number(), appointments: z.number() }) }),
  permission: 'crm.reassign',
  risk: 'write',
  agentGrantable: true,
  undo: { windowSec: 86_400 },
  invalidates: ['crm', 'inbox'],
});

export const contactRequestAccess = defineAction({
  id: 'contact.request_access',
  module: 'crm',
  title: 'actions.contact.request_access.title',
  description: 'Ask the owner of an already-owned contact to share it (become collaborator). Example: {"contact_id":"ct_lan","note":"Khách nhắn em qua Zalo"}',
  input: z.object({ contact_id: contactId, note: z.string().max(500).optional() }),
  output: z.object({ request_id: z.string(), status: z.literal('pending') }),
  permission: 'crm.view',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['crm'],
});

export const contactDecideAccess = defineAction({
  id: 'contact.decide_access',
  module: 'crm',
  title: 'actions.contact.decide_access.title',
  description: 'Approve or reject a pending share request (contact owner or crm.reassign). Example: {"request_id":"ar_1","decision":"approved"}',
  input: z.object({ request_id: z.string().min(1), decision: z.enum(['approved', 'rejected']) }),
  output: z.object({ status: z.string() }),
  permission: 'crm.edit',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['crm'],
});

const fieldType = z.enum(['text', 'number', 'currency', 'date', 'email', 'phone', 'picklist', 'multi', 'tier', 'tags', 'lookup', 'file', 'textarea']);
const fieldEntity = z.enum(['contact', 'product', 'quote', 'order', 'ticket', 'appointment']);
const place = z.enum(['list', 'kanban', 'form', 'filter', 'detail', 'export']);
/** Cấu hình nâng cao (Cài đặt › Trường dữ liệu — prototype L932–960): hiển thị tại, vai trò được xem (rỗng = mọi vai trò), điều kiện, AI tự cập nhật. */
const fieldExtras = {
  ai: z.boolean().optional(),
  visible_in: z.record(place, z.boolean()).optional(),
  roles: z.array(z.string().min(1)).max(5).optional(),
  condition: z.string().max(120).optional(),
};

export const customFieldDefine = defineAction({
  id: 'custom_field.define',
  module: 'crm',
  title: 'actions.custom_field.define.title',
  description: 'Define a custom field on an entity. Example: {"entity":"contact","label":"Size áo","type":"picklist","options":"S/M/L"}',
  input: z.object({
    entity: fieldEntity,
    label: z.string().trim().min(1).max(60),
    type: fieldType,
    options: z.string().max(300).optional(),
    group: z.string().max(60).optional(),
    required: z.boolean().optional(),
    ...fieldExtras,
  }),
  output: z.object({ key: z.string() }),
  permission: 'crm.fields_manage',
  risk: 'config',
  agentGrantable: false,
  invalidates: ['crm'],
});

export const customFieldUpdate = defineAction({
  id: 'custom_field.update',
  module: 'crm',
  title: 'actions.custom_field.update.title',
  description:
    'Update custom fields (flags, label, options, placement, roles) and optionally their order. Example: {"entity":"contact","fields":[{"key":"size","required":false,"visible":true}]}',
  input: z.object({
    entity: fieldEntity,
    fields: z
      .array(
        z.object({
          key: z.string().min(1),
          required: z.boolean().optional(),
          visible: z.boolean().optional(),
          label: z.string().trim().min(1).max(60).optional(),
          type: fieldType.optional(),
          options: z.string().max(300).optional(),
          ...fieldExtras,
        }),
      )
      .default([]),
    /** Thứ tự mới (đủ key của entity) — "Lên trên / Xuống dưới". */
    order: z.array(z.string().min(1)).optional(),
  }),
  output: z.object({ updated: z.number().int() }),
  permission: 'crm.fields_manage',
  risk: 'config',
  agentGrantable: false,
  invalidates: ['crm'],
});

export const contactSendEmail = defineAction({
  id: 'contact.send_email',
  module: 'crm',
  title: 'actions.contact.send_email.title',
  description:
    'Send a standalone email to a contact (not tied to an existing conversation) — REQ-F11 Hồ sơ 360°. Example: {"contact_id":"ct_lan","from":"cskh@huongsen.vn","subject":"Theo dõi sau tư vấn","body":"Chào chị Lan,…"}',
  input: z.object({
    contact_id: contactId,
    from: z.string().email(),
    to: z.string().min(1),
    subject: z.string().trim().min(1).max(200),
    body: z.string().trim().min(1).max(5000),
  }),
  output: z.object({ ok: z.boolean() }),
  permission: 'inbox.reply',
  risk: 'send',
  agentGrantable: true,
  requiresConnector: 'email',
  invalidates: ['crm', 'inbox'],
});

export const customFieldDelete = defineAction({
  id: 'custom_field.delete',
  module: 'crm',
  title: 'actions.custom_field.delete.title',
  description: 'Delete a non-system custom field; stored values are kept 30 days. Example: {"entity":"contact","key":"size"}',
  input: z.object({ entity: fieldEntity, key: z.string().min(1) }),
  output: z.object({ ok: z.boolean() }),
  permission: 'crm.fields_manage',
  risk: 'delete',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['crm'],
});
