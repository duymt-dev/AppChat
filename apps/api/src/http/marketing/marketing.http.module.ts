// Controller HTTP của domain `marketing` nằm trong thư mục này. Stub TIP-001; TIP 037 thêm controller.
import { Module } from '@nestjs/common';
import { MarketingModule } from '@appchat/core';

@Module({ imports: [MarketingModule] })
export class MarketingHttpModule {}
