// Module kernel "Quên khách" (TIP-015c §2.2): chỉ export hợp đồng domain-neutral (types/registry/guard/provenance/identity-tokens/
// publication) — KHÔNG đăng ký adapter (đó là composition/privacy.module.ts), không import domain nào. Nest module rỗng (DI graph).
import { Module } from '@nestjs/common';

@Module({})
export class KernelPrivacyModule {}
