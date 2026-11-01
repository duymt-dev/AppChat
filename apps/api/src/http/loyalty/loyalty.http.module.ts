// Controller HTTP của domain `loyalty` nằm trong thư mục này. Stub TIP-001; TIP 036 thêm controller.
import { Module } from '@nestjs/common';
import { LoyaltyModule } from '@appchat/core';

@Module({ imports: [LoyaltyModule] })
export class LoyaltyHttpModule {}
