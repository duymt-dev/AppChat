// Controller HTTP của domain `authz` nằm trong thư mục này. Stub TIP-001; TIP 005 thêm controller.
import { Module } from '@nestjs/common';
import { AuthzModule } from '@appchat/core';

@Module({ imports: [AuthzModule] })
export class AuthzHttpModule {}
