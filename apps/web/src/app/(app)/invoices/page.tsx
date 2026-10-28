import { Suspense } from 'react';
import { InvoicesScreen } from '@/features/invoices';

export default function Page() {
  return (
    <Suspense>
      <InvoicesScreen />
    </Suspense>
  );
}
