import { Suspense } from 'react';
import { ContractsScreen } from '@/features/contracts';

export default function Page() {
  return (
    <Suspense>
      <ContractsScreen />
    </Suspense>
  );
}
