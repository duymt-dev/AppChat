import { SettingsScreen } from '@/features/settings';

export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  return <SettingsScreen section={section} />;
}
