// Đọc Sản phẩm (Blueprint §4.4 catalog). Ghi qua useAction (product.* / category.* / stock.adjust).
import { queryOptions } from '@tanstack/react-query';
import { transport } from '@/shared/api/client';
import type { Product, ProductFilter, ProductsMeta } from './types';

export const productsQuery = (f: ProductFilter) =>
  queryOptions({
    queryKey: ['catalog', 'products', f],
    queryFn: () =>
      transport.get<{ data: Product[] }>('/products', { category: f.category, ...(f.q ? { q: f.q } : {}) }),
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
