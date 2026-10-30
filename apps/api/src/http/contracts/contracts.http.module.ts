// Controller HTTP của domain `contracts` nằm trong thư mục này. Stub TIP-001; TIP 030 thêm controller.
import { Module } from '@nestjs/common';
import { ContractsModule } from '@appchat/core';

@Module({ imports: [ContractsModule] })
export class ContractsHttpModule {}
