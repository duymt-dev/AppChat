import { PublicDocumentScreen } from '@/features/public-documents';

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PublicDocumentScreen token={token} />;
}
