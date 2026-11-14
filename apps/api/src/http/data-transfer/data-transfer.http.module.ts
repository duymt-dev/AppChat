// Controller HTTP của domain `data-transfer` (TIP-038b): /v1/data-transfer/*. Gắn khi env đủ DB + Redis + JWT_SECRET — như các domain khác.
// Domain mới ngoài 19 domain cố định của TIP-001 — gắn ở `withActions` của app.module (manifest TIP-038b).
import { Module } from '@nestjs/common';
import { DataTransferModule } from '@appchat/core';
import { ActorModule } from '../kernel/actor.module';
import { DataTransferController } from './data-transfer.controller';

@Module({ imports: [DataTransferModule, ActorModule], controllers: [DataTransferController] })
export class DataTransferHttpModule {}
