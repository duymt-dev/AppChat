// Worker ROLE=jobs của Hộp thư (TIP-025b §H): CHỈ việc dữ liệu (kind `conversation.bulk_update` > 50 hội thoại) qua DataJobsModule 045b —
// không nạp InboxJobsModule (ROLE=channels: nhận tin / phiên kênh) hay AiJobsModule (ROLE=ai) để tránh listener trùng. Dọn cache dịch
// (pha sau của TIP-025b) đăng ký ở đây.
import { Module } from '@nestjs/common';
import { DataJobsModule } from '../../kernel/jobs/data-jobs/data-jobs.module';
import { registerInboxBulkKind } from './inbox-bulk.processor';

class InboxDataJobKinds {
  constructor() {
    registerInboxBulkKind();
  }
}

@Module({ imports: [DataJobsModule], providers: [InboxDataJobKinds] })
export class InboxUiJobsModule {}
