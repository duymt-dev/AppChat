import { Suspense } from 'react';
import { ResetPasswordScreen } from '@/features/auth';

export default function Page() {
  return (
    <Suspense>
      <ResetPasswordScreen />
    </Suspense>
  );
}
