import { Suspense } from 'react';
import { AgentBuilderScreen } from '@/features/agents';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense>
      <AgentBuilderScreen agentId={id} />
    </Suspense>
  );
}
