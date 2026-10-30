// Kiểu dữ liệu Khách hàng (Blueprint §2.2 contact, §4.4 crm; D32 phụ trách + đồng phụ trách).
import type { CustomValues } from '@appchat/shared';
import type { IconName } from '@appchat/ui';

export type StageKey = 'all' | 'lead' | 'potential' | 'consulting' | 'quote' | 'contract' | 'won';
export type ContactSource = 'zalo_personal' | 'email' | 'website' | 'manual' | 'referral';

export interface ContactRow {
  id: string;
  code: string;
  full_name: string;
  first_name: string;
  title: string;
  initials: string;
  avatar_hue: number;
  reg_date: string;
  reg_time: string;
  type: 'individual' | 'business' | 'household';
  group: 'vip' | 'loyal' | 'new' | 'potential';
  source: ContactSource;
  source_label: string;
  source_color: string;
  email: string;
  phone: string;
  zalo: string;
  city: string;
  district: string;
  status: 'active' | 'potential' | 'inactive';
  stage: Exclude<StageKey, 'all'>;
  owner_user_id: string;
  owner_name: string;
  owner_hue: number;
  ai: { kind: 'ai' | 'user' | 'wait'; label: string; hint: string };
  tags: string[];
  web_bg: number;
  my_access: 'owner' | 'collaborator' | 'watcher' | 'scope';
  collaborator_count: number;
  /** Trường tuỳ biến (D56). */
  custom?: CustomValues;
}

export interface CrmStats {
  stats: { key: string; value: string; color: string; icon: IconName }[];
  stages: { key: StageKey; color: string; count: number }[];
  tag_defs: { label: string; line: string; bg: string; fg: string }[];
}

export interface DupSide {
  name: string;
  email: string;
  phone: string;
  src: string;
}

export interface Duplicates {
  summary: { groups: number; records: number; auto: number };
  groups: { id: string; pct: number; by: string; a: DupSide; b: DupSide }[];
}

export interface Member {
  id: string;
  name: string;
  role: string;
}

export interface Collaborators {
  owner: { user_id: string; name: string };
  collaborators: { user_id: string; role: 'collaborator' | 'watcher'; name: string }[];
}

export interface AccessRequest {
  id: string;
  contact_id: string;
  contact_name?: string;
  requester_name: string;
  note?: string;
}

export interface CrmAi {
  runs: Record<string, { text: string; act: 'kanban' | 'dedupe' | null }>;
  peek: string[];
}
