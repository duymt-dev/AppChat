// Controller HTTP của domain `identity` nằm trong thư mục này. Stub TIP-001; TIP 004 thêm controller.
import { Module } from '@nestjs/common';
import { IdentityModule } from '@appchat/core';

@Module({ imports: [IdentityModule] })
export class IdentityHttpModule {}
