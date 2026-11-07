import { AppendixSignScreen } from '@/features/contracts';

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <AppendixSignScreen token={token} />;
}
