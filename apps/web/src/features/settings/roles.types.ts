// Vai trò & nhóm (TIP-042) — tách khỏi types.ts (trần 400 dòng). Khớp `settingsRolesSchema` / `teamSchema` của @appchat/shared.
import type { DataScope, PermissionKey, ScopeModule, SettingsRolesDto, TeamDto } from '@appchat/shared';

export type RoleRow = SettingsRolesDto['roles'][number];
export type RolesData = SettingsRolesDto;
export type Team = TeamDto;

/** Bản nháp của trình sửa vai trò tuỳ biến: tạo mới (trắng / nhân bản) hoặc sửa `key` + `version` (CAS). */
export interface RoleDraft {
  key?: string;
  version?: number;
  name: string;
  /** Nhân bản từ vai trò này (chỉ khi tạo; xoá khi người dùng chỉnh quyền → gửi tập quyền tường minh). */
  cloneFrom?: string;
  /** Nhãn "dựa trên" — tên vai trò nguồn (khoá hệ thống hoặc tên tuỳ biến), giữ để hiển thị. */
  basedOn?: { key: string; name: string };
  permissions: PermissionKey[];
  scope: Record<ScopeModule, DataScope>;
  /** Quyền bị bỏ khi nhân bản (riêng Chủ sở hữu / uỷ quyền D35) — hiện nhãn cho người dùng. */
  dropped: PermissionKey[];
}

/** Bản nháp nhóm: tạo (name + thành viên + trưởng nhóm, một team.create) · cấu hình (tên / trưởng nhóm — team.update) · thành viên
 * (thay tập — team.set_members). Hai thao tác sửa tách như hai nút "Cấu hình" / "Thành viên" của prototype. */
export interface TeamDraft {
  mode: 'create' | 'config' | 'members';
  id?: string;
  version?: number;
  name: string;
  lead: string | null;
  members: string[];
}
