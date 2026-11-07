import { PublicQuoteScreen } from '@/features/quotes';

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PublicQuoteScreen token={token} />;
}
