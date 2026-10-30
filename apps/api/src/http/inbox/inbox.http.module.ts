// Controller HTTP của domain `inbox` nằm trong thư mục này. Stub TIP-001; TIP 016 thêm controller.
import { Module } from '@nestjs/common';
import { InboxModule } from '@appchat/core';

@Module({ imports: [InboxModule] })
export class InboxHttpModule {}
