import { Suspense } from 'react';
import { AgentBuilderScreen } from '@/features/agents';

export default function Page() {
  return (
    <Suspense>
      <AgentBuilderScreen />
    </Suspense>
  );
}
