// BullMQ processor của domain `documents` (chạy trong worker). Stub TIP-001; TIP 028 thêm processor.
import { Module } from '@nestjs/common';
import { DocumentsModule } from '../documents.module';

@Module({ imports: [DocumentsModule] })
export class DocumentsJobsModule {}
