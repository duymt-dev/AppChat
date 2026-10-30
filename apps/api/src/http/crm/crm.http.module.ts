// Controller HTTP của domain `crm` nằm trong thư mục này. Stub TIP-001; TIP 015 thêm controller.
import { Module } from '@nestjs/common';
import { CrmModule } from '@appchat/core';

@Module({ imports: [CrmModule] })
export class CrmHttpModule {}
