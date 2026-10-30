// Controller HTTP của domain `integrations` nằm trong thư mục này. Stub TIP-001; TIP 012 thêm controller.
import { Module } from '@nestjs/common';
import { IntegrationsModule } from '@appchat/core';

@Module({ imports: [IntegrationsModule] })
export class IntegrationsHttpModule {}
