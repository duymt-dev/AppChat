import { SignScreen } from '@/features/contracts';

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <SignScreen token={token} />;
}
