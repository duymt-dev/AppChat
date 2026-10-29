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
import { ChannelsSection } from '../components/ChannelsSection';
import { IntegrationsSection } from '../components/IntegrationsSection';
import { WidgetSection } from '../components/WidgetSection';
import { TagsSection } from '../components/TagsSection';
import { RepliesSection } from '../components/RepliesSection';
import { FieldsSection } from '../components/FieldsSection';
import { resolveSection, type NavItem, type SectionKey } from '../registry';
import { useSettingsUiCommands } from '../ui-commands';

const SECTIONS: Partial<Record<SectionKey, ComponentType>> = {
  general: GeneralSection,
  locale: LocaleSection,
  members: MembersSection,
  roles: RolesSection,
  channels: ChannelsSection,
  integrations: IntegrationsSection,
  web_widget: WidgetSection,
  contacts_fields: FieldsSection,
  tags: TagsSection,
  replies: RepliesSection,
};

/** Mục có phụ đề dưới tiêu đề (prototype L5775). */
const WITH_SUB: SectionKey[] = ['roles', 'org_sla'];

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
