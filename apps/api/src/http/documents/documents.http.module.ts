// Controller HTTP của domain `documents` (TIP-028): /v1/doc-templates, /v1/doc-templates/:id/preview. Chỉ gắn khi env đủ
// DB + Redis + JWT_SECRET (`register`) — như catalog.
import { Module, type DynamicModule } from '@nestjs/common';
import { DocumentsModule } from '@appchat/core';
import { ActorModule } from '../kernel/actor.module';
import { DocTemplatesController } from './doc-templates.controller';

@Module({ imports: [DocumentsModule] })
export class DocumentsHttpModule {
  static register(): DynamicModule {
    return { module: DocumentsHttpModule, imports: [DocumentsModule, ActorModule], controllers: [DocTemplatesController] };
  }
}
