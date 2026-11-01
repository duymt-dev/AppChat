// Controller HTTP của domain `platform` nằm trong thư mục này. Stub TIP-001; TIP 040 thêm controller.
import { Module } from '@nestjs/common';
import { PlatformModule } from '@appchat/core';

@Module({ imports: [PlatformModule] })
export class PlatformHttpModule {}
