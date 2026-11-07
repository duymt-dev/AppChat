// Layout /admin (TIP-040): KHÔNG AppShell / OnboardingGate / ô chọn workspace — ngữ cảnh nền tảng. AdminGuard hỏi /admin/session.
import type { ReactNode } from 'react';
import { AdminGuard } from '@/features/platform-admin';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminGuard>{children}</AdminGuard>;
}
