import { Suspense } from 'react';
import { AssistantScreen } from '@/features/assistant';

export default function Page() {
  return (
    <Suspense>
      <AssistantScreen />
    </Suspense>
  );
}
