// Controller HTTP của domain `contracts` (TIP-030): /v1/contracts*, trang ký công khai /v1/public/sign/:token. Chỉ gắn khi env đủ DB +
// Redis + JWT_SECRET (`register`) — như sales.
import { Module, type DynamicModule } from '@nestjs/common';
import { ContractsModule } from '@appchat/core';
import { ActorModule } from '../kernel/actor.module';
import { ContractFilesController } from './contract-files.controller';
import { ContractsController } from './contracts.controller';
import { PublicSignController } from './public-sign.controller';

@Module({ imports: [ContractsModule] })
export class ContractsHttpModule {
  static register(): DynamicModule {
    return { module: ContractsHttpModule, imports: [ContractsModule, ActorModule], controllers: [ContractsController, ContractFilesController, PublicSignController] };
  }
}
