// Controller HTTP của domain `notify` nằm trong thư mục này. Stub TIP-001; TIP 006 thêm controller.
import { Module } from '@nestjs/common';
import { NotifyModule } from '@appchat/core';

@Module({ imports: [NotifyModule] })
export class NotifyHttpModule {}
