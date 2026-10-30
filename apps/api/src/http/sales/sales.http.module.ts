// Controller HTTP của domain `sales` nằm trong thư mục này. Stub TIP-001; TIP 029, 031, 032 thêm controller.
import { Module } from '@nestjs/common';
import { SalesModule } from '@appchat/core';

@Module({ imports: [SalesModule] })
export class SalesHttpModule {}
