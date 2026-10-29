import { Suspense } from 'react';
import { OrdersScreen } from '@/features/orders';

export default function Page() {
  return (
    <Suspense>
      <OrdersScreen />
    </Suspense>
  );
}
