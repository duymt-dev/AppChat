// Controller HTTP của domain `channels` nằm trong thư mục này. Stub TIP-001; TIP 014, 017, 018 thêm controller.
import { Module } from '@nestjs/common';
import { ChannelsModule } from '@appchat/core';

@Module({ imports: [ChannelsModule] })
export class ChannelsHttpModule {}
