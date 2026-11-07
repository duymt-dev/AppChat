// Tệp tải lên (TIP-020): `POST /v1/files`, `GET /v1/files/:id`. FilesService + Storage ở KernelModule (global). Gắn khi env đủ DB + Redis + JWT.
import { Module, type DynamicModule } from '@nestjs/common';
import { ActorModule } from '../kernel/actor.module';
import { FilesController } from './files.controller';

@Module({})
export class FilesHttpModule {
  static register(): DynamicModule {
    return { module: FilesHttpModule, imports: [ActorModule], controllers: [FilesController] };
  }
}
