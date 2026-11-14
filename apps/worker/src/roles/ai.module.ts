// Worker ROLE=ai: JobsModule theo bảng hàng đợi Blueprint §1.3. Đăng ký sẵn ở TIP-001 — TIP sau KHÔNG sửa.
import { Module } from '@nestjs/common';
import { AiJobsModule } from '@appchat/core';

export const AI_JOBS = [AiJobsModule];

@Module({ imports: AI_JOBS })
export class AiRoleModule {}
