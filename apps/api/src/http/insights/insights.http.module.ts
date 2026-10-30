// Controller HTTP của domain `insights` nằm trong thư mục này. Stub TIP-001; TIP 038 thêm controller.
import { Module } from '@nestjs/common';
import { InsightsModule } from '@appchat/core';

@Module({ imports: [InsightsModule] })
export class InsightsHttpModule {}
