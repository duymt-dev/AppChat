// Vai trò tuỳ biến + nhóm (Blueprint §3.4 authz P1, TIP-042, DC-298). Mọi ghi qua ActionExecutor; agentGrantable false (quyền chỉ người).
// - role.*: permission roles.manage (riêng Chủ sở hữu); key do server sinh `custom:<uuid>`, client không gửi key / is_system.
//   Vai trò hệ thống không sửa / xoá. Xoá = xoá mềm khi không còn thành viên / lời mời còn hạn tham chiếu (409 kèm số đếm).
// - team.*: permission members.manage; nhóm phẳng (không cây phòng ban — P3). Không có team.delete (Blueprint).
// - Undo: role.create (khi chưa được tham chiếu), role.update, team.update, team.set_members — 24h, CAS version; role.delete KHÔNG hoàn tác
//   (cấp lại phải tạo / gán rõ). team.create không hoàn tác.
import { z } from 'zod';
import { PERMISSIONS } from '@appchat/shared';
import { defineAction } from './define';

const roleName = z.string().trim().min(1).max(120);
const scopeValue = z.enum(['own', 'team', 'all', 'none']);
// Mảng tự do + kiểm ở handler (checkRoleDraft) để báo đúng quyền / module sai thay vì lỗi enum chung; trần = cả danh mục.
const permissionList = z.array(z.string().min(1).max(60)).max(PERMISSIONS.length);
const dataScope = z.record(z.string().min(1).max(30), scopeValue);
// Khoá vai trò: hệ thống (để báo 422 `system_role` rõ ràng) hoặc `custom:<uuid>`.
const roleKey = z.string().regex(/^([a-z]+|custom:[0-9a-f-]{36})$/);
const version = z.number().int().positive();
const userIds = z.array(z.string().uuid()).max(200);

export const roleCreate = defineAction({
  id: 'role.create',
  module: 'settings',
  title: 'actions.role.create.title',
  description:
    'Create a custom role — blank (permissions + data_scope for all six modules) or cloned from an existing role (clone_from_key). Owner-only permissions are never granted. Example: {"name":"Lễ tân","clone_from_key":"cs"}',
  input: z.object({
    name: roleName,
    clone_from_key: roleKey.optional(),
    permissions: permissionList.optional(),
    data_scope: dataScope.optional(),
  }),
  output: z.object({ key: z.string(), version: z.number().int(), dropped: z.array(z.string()).optional() }),
  permission: 'roles.manage',
  risk: 'config',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['roles', 'members', 'me'],
});

export const roleUpdate = defineAction({
  id: 'role.update',
  module: 'settings',
  title: 'actions.role.update.title',
  description:
    'Rename a custom role or change its permissions / data scope (system roles are read-only). Requires if_version. Example: {"role_key":"custom:0190f000-0000-7000-8000-0000000000c1","if_version":2,"permissions":["inbox.view","inbox.reply"]}',
  input: z.object({
    role_key: roleKey,
    if_version: version,
    name: roleName.optional(),
    permissions: permissionList.optional(),
    data_scope: dataScope.optional(),
  }),
  output: z.object({ key: z.string(), version: z.number().int() }),
  permission: 'roles.manage',
  risk: 'config',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['roles', 'members', 'me'],
});

export const roleDelete = defineAction({
  id: 'role.delete',
  module: 'settings',
  title: 'actions.role.delete.title',
  description:
    'Delete a custom role that no active member or pending invite uses (otherwise CONFLICT with counts — reassign first). Not undoable. Example: {"role_key":"custom:0190f000-0000-7000-8000-0000000000c1","if_version":3}',
  input: z.object({ role_key: roleKey, if_version: version }),
  output: z.object({ ok: z.boolean() }),
  permission: 'roles.manage',
  risk: 'delete',
  agentGrantable: false,
  invalidates: ['roles', 'members', 'me'],
});

export const teamCreate = defineAction({
  id: 'team.create',
  module: 'settings',
  title: 'actions.team.create.title',
  description: 'Create a flat team (data scope "team"); optional lead must also be a member. Example: {"name":"Nhóm Spa Q1","user_ids":["0190f000-0000-7000-8000-0000000000a1"],"lead_user_id":"0190f000-0000-7000-8000-0000000000a1"}',
  input: z.object({ name: roleName, user_ids: userIds.optional(), lead_user_id: z.string().uuid().optional() }),
  output: z.object({ team_id: z.string(), version: z.number().int() }),
  permission: 'members.manage',
  risk: 'config',
  agentGrantable: false,
  invalidates: ['teams', 'members', 'me'],
});

export const teamUpdate = defineAction({
  id: 'team.update',
  module: 'settings',
  title: 'actions.team.update.title',
  description: 'Rename a team or change its lead (lead must be a member; null clears). Requires if_version. Example: {"team_id":"0190f000-0000-7000-8000-0000000000b1","if_version":1,"lead_user_id":null}',
  input: z.object({ team_id: z.string().uuid(), if_version: version, name: roleName.optional(), lead_user_id: z.string().uuid().nullable().optional() }),
  output: z.object({ team_id: z.string(), version: z.number().int() }),
  permission: 'members.manage',
  risk: 'config',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['teams', 'members', 'me'],
});

export const teamSetMembers = defineAction({
  id: 'team.set_members',
  module: 'settings',
  title: 'actions.team.set_members.title',
  description:
    'Replace the whole member list of a team (active workspace members only; removing the lead requires changing / clearing the lead first). Requires if_version. Example: {"team_id":"0190f000-0000-7000-8000-0000000000b1","if_version":2,"user_ids":["0190f000-0000-7000-8000-0000000000a1","0190f000-0000-7000-8000-0000000000a2"]}',
  input: z.object({ team_id: z.string().uuid(), if_version: version, user_ids: userIds }),
  output: z.object({ team_id: z.string(), version: z.number().int() }),
  permission: 'members.manage',
  risk: 'config',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['teams', 'members', 'me'],
});
