// Cài đặt (orchestrator) — Blueprint §7.2 settings/[section]: SettingsShell + màn của mục theo registry. Thiếu quyền → no-permission.
'use client';
import type { ComponentType } from 'react';
import { useTranslations } from 'next-intl';
import { useCan } from '@/shared/authz/useCan';
import { PageStates } from '@/shared/states/PageStates';
import { SettingsShell } from '../components/SettingsShell';
import { GeneralSection } from '../components/GeneralSection';
import { LocaleSection } from '../components/LocaleSection';
import { MembersSection } from '../components/MembersSection';
import { RolesSection } from '../components/RolesSection';
import { TeamsSection } from '../components/TeamsSection';
import { ChannelsSection } from '../components/ChannelsSection';
import { IntegrationsSection } from '../components/IntegrationsSection';
import { WidgetSection } from '../components/WidgetSection';
import { TagsSection } from '../components/TagsSection';
import { RepliesSection } from '../components/RepliesSection';
import { Profile360Section } from '../components/Profile360Section';
import { FieldsSection } from '../components/FieldsSection';
import { AiModelsSection } from '../components/AiModelsSection';
import { RagSection } from '../components/RagSection';
import { GovSection } from '../components/GovSection';
import { AuditSection, AiAuditSection } from '../components/AuditSection';
import { SlaSection } from '../components/SlaSection';
import { NotifSection } from '../components/NotifSection';
import { BillingSection } from '../components/BillingSection';
import { WalletSection } from '../components/WalletSection';
import { ProfileSection } from '../components/ProfileSection';
import { DocTemplatesSection } from '../components/DocTemplatesSection';
import { SalesPolicySection } from '../components/SalesPolicySection';
import { resolveSection, type NavItem, type SectionKey } from '../registry';
import { useSettingsUiCommands } from '../ui-commands';

const SECTIONS: Partial<Record<SectionKey, ComponentType>> = {
  general: GeneralSection,
  locale: LocaleSection,
  members: MembersSection,
  roles: RolesSection,
  teams: TeamsSection,
  channels: ChannelsSection,
  integrations: IntegrationsSection,
  web_widget: WidgetSection,
  contacts_fields: FieldsSection,
  tags: TagsSection,
  replies: RepliesSection,
  profile_360: Profile360Section,
  ai_models: AiModelsSection,
  rag_data: RagSection,
  ai_gov: GovSection,
  ai_audit: AiAuditSection,
  audit: AuditSection,
  org_sla: SlaSection,
  notifications: NotifSection,
  billing: BillingSection,
  wallet: WalletSection,
  profile: ProfileSection,
  doc_templates: DocTemplatesSection,
  sales_policy: SalesPolicySection,
};

/** Mục có phụ đề dưới tiêu đề (prototype L5775). */
const WITH_SUB: SectionKey[] = ['roles', 'teams', 'org_sla'];

function Guarded({ item }: { item: NavItem }) {
  const allowed = useCan(item.perm ?? 'assistant.use');
  const Section = SECTIONS[item.key];
  if (item.perm && !allowed) return <PageStates state="no-permission">{null}</PageStates>;
  return Section ? <Section /> : null;
}

export function SettingsScreen({ section }: { section?: string }) {
  useSettingsUiCommands();
  const t = useTranslations('settings');
  const item = resolveSection(section);
  return (
    <SettingsShell active={item.key} sub={WITH_SUB.includes(item.key) ? t(`headSub.${item.key}`) : undefined}>
      <Guarded item={item} />
    </SettingsShell>
  );
}
