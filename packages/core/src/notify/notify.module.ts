// Domain `notify` — notification, mailer. TIP-003 cài handler mẫu `notification.mark_read`; TIP-006 điền phần còn lại.
import { Module } from '@nestjs/common';
import { NotificationMarkReadHandler } from './actions/notification-mark-read.handler';

@Module({ providers: [NotificationMarkReadHandler] })
export class NotifyModule {}
