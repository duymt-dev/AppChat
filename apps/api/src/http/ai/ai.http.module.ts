// Controller HTTP của domain `ai` nằm trong thư mục này. Stub TIP-001; TIP 019–023, 035, 043 thêm controller.
import { Module } from '@nestjs/common';
import { AiModule } from '@appchat/core';

@Module({ imports: [AiModule] })
export class AiHttpModule {}
