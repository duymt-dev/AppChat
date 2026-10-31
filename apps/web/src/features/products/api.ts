// Đọc Sản phẩm (Blueprint §4.4 catalog). Ghi qua useAction (product.* / category.* / stock.adjust).
import { queryOptions } from '@tanstack/react-query';
import { transport } from '@/shared/api/client';
import type { Product, ProductActivity, ProductFilter, ProductsMeta } from './types';
import type { PageState, Paged } from '@/shared/list/paged';

export const productsQuery = (f: ProductFilter, pg?: PageState) =>
  queryOptions({
    queryKey: ['catalog', 'products', f, pg],
    queryFn: () =>
      transport.get<Paged<Product>>('/products', { category: f.category, ...(f.q ? { q: f.q } : {}), ...pg }),
    placeholderData: (prev) => prev,
  });

export const productQuery = (id: string) =>
  queryOptions({
    queryKey: ['catalog', 'product', id],
    queryFn: () => transport.get<Product>(`/products/${id}`),
  });

export const productsMetaQuery = () =>
  queryOptions({
    queryKey: ['catalog', 'meta'],
    queryFn: () => transport.get<ProductsMeta>('/products/meta'),
  });

export const productActivityQuery = (id: string) =>
  queryOptions({
    queryKey: ['catalog', 'activity', id],
    queryFn: () => transport.get<ProductActivity[]>(`/products/${id}/activity`),
  });
