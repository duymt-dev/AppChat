// Controller HTTP của domain `support` nằm trong thư mục này. Stub TIP-001; TIP 034 thêm controller.
import { Module } from '@nestjs/common';
import { SupportModule } from '@appchat/core';

@Module({ imports: [SupportModule] })
export class SupportHttpModule {}
