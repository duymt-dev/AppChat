import { UnsubscribeConfirm } from '@/features/marketing';

export default async function Page({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  return <UnsubscribeConfirm token={t ?? ''} />;
}
