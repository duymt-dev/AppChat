// Worker ROLE=jobs của Hộp thư (TIP-025b §H): việc dữ liệu (kind `conversation.bulk_update` > 50 hội thoại) qua DataJobsModule 045b +
// dọn cache bản dịch hết hạn mỗi giờ (TranslationCacheCleanup — chỉ tenant + Clock). Không nạp InboxJobsModule (ROLE=channels: nhận tin /
// phiên kênh) hay AiJobsModule (ROLE=ai) để tránh listener trùng.
import { Module } from '@nestjs/common';
import { DataJobsModule } from '../../kernel/jobs/data-jobs/data-jobs.module';
import { TranslationCacheCleanup } from '../../ai/jobs/translation-cache.cleanup';
import { registerInboxBulkKind } from './inbox-bulk.processor';

class InboxDataJobKinds {
  constructor() {
    registerInboxBulkKind();
  }
}

@Module({ imports: [DataJobsModule], providers: [InboxDataJobKinds, TranslationCacheCleanup] })
export class InboxUiJobsModule {}
