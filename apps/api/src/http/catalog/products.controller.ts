// Đọc Sản phẩm (Blueprint §4.4 catalog, TIP-027 — shape packages/shared/src/api/catalog.ts): /v1/products (D42 page + limit,
// `category` (tên) / `category_id` / `type` / `status` / `q` không dấu / `cf.*`), /products/meta, /products/:id,
// /products/:id/activity, /categories. Quyền `catalog.view` (không data scope); giá vốn theo `catalog.cost_view` trong service.
// Ghi qua action product.* / category.create / stock.adjust.
import { Controller, Get, Inject, Param, Query, Req } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { CatalogReadService, type ProductFilter } from '@appchat/core';
import { AppError } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';

const int = (v: string | undefined, field: string) => {
  if (v === undefined || v === '') return undefined;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) throw new AppError('VALIDATION_FAILED', 400, { [field]: 'invalid' });
  return n;
};

export function productFilterOf(q: Record<string, string | undefined>): ProductFilter {
  const custom = Object.fromEntries(Object.entries(q).filter(([k, x]) => k.startsWith('cf.') && x).map(([k, x]) => [k.slice(3), String(x).slice(0, 100)]));
  return { category: q.category?.slice(0, 60), categoryId: q.category_id, type: q.type, status: q.status, q: q.q?.slice(0, 100), custom };
}

@Controller()
export class ProductsController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(CatalogReadService) private readonly read: CatalogReadService,
  ) {}

  private async viewer(req: IncomingMessage) {
    const a = await this.actors.resolve(req);
    if (!a.authz.isOwner && !a.authz.permissions.has('catalog.view')) throw new AppError('FORBIDDEN', 403, { permission: 'catalog.view' });
    return a;
  }

  @Get('products')
  async list(@Req() req: IncomingMessage, @Query() q: Record<string, string | undefined>) {
    return this.read.list(await this.viewer(req), productFilterOf(q), int(q.page, 'page'), int(q.limit, 'limit'));
  }

  @Get('products/meta')
  async meta(@Req() req: IncomingMessage) {
    return { data: await this.read.meta(await this.viewer(req)) };
  }

  @Get('products/:id')
  async get(@Req() req: IncomingMessage, @Param('id') id: string) {
    return { data: await this.read.get(await this.viewer(req), id) };
  }

  @Get('products/:id/activity')
  async activity(@Req() req: IncomingMessage, @Param('id') id: string) {
    return { data: await this.read.activity(await this.viewer(req), id) };
  }

  @Get('categories')
  async categories(@Req() req: IncomingMessage) {
    return { data: await this.read.categories(await this.viewer(req)) };
  }
}
