import { DashboardScreen } from '@/features/dashboard';
import { MockFaultProbe } from '@/shared/dev/MockFault';

export default function Page() {
  return (
    <>
      {/* lỗi giả chỉ ở mock — E2E error boundary của nhóm (app) (TIP-001b AC2) */}
      <MockFaultProbe at="route:dashboard" />
      <DashboardScreen />
    </>
  );
}
