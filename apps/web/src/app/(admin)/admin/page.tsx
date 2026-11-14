import { Suspense } from 'react';
import { AdminScreen } from '@/features/platform-admin';

export default function Page() {
  return (
    <Suspense>
      <AdminScreen />
    </Suspense>
  );
}
