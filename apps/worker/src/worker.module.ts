// Chọn tập JobsModule theo ROLE (Blueprint §1.3): channels | ai | jobs | all (dev gộp một tiến trình).
import { Module, type DynamicModule } from '@nestjs/common';
import { ContactLifecycleModule, KernelModule, OutboxJobsModule, type Env } from '@appchat/core';
import { AiRoleModule } from './roles/ai.module';
import { ChannelsRoleModule } from './roles/channels.module';
import { JobsRoleModule } from './roles/jobs.module';

export type WorkerRole = Env['ROLE'];

const ROLE_MODULES = { channels: [ChannelsRoleModule], ai: [AiRoleModule], jobs: [JobsRoleModule] } as const;

export function roleModules(role: string) {
  if (role === 'all') return [ChannelsRoleModule, AiRoleModule, JobsRoleModule];
  if (role in ROLE_MODULES) return [...ROLE_MODULES[role as keyof typeof ROLE_MODULES]];
  throw new Error(`ROLE không hợp lệ: ${role}`);
}

@Module({})
export class WorkerModule {
  static forRole(role: string): DynamicModule {
    // Outbox relay là việc của kernel (events/outbox.md §2) — chạy ở ROLE=jobs (và all khi dev).
    const relay = role === 'jobs' || role === 'all' ? [OutboxJobsModule] : [];
    return { module: WorkerModule, imports: [KernelModule.forRoot(), ContactLifecycleModule, ...roleModules(role), ...relay] };
  }
}
