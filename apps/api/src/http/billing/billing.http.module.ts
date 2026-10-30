// Controller HTTP của domain `billing` nằm trong thư mục này. Stub TIP-001; TIP 009, 010 thêm controller.
import { Module } from '@nestjs/common';
import { BillingModule } from '@appchat/core';

@Module({ imports: [BillingModule] })
export class BillingHttpModule {}
