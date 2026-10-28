// Đọc Đề nghị thanh toán (Blueprint §4.4 invoices). Ghi qua useAction (invoice.*).
import { queryOptions } from '@tanstack/react-query';
import { transport } from '@/shared/api/client';
import type { Invoice, InvoicesMeta } from './types';

export const invoicesQuery = (q: string) =>
  queryOptions({
    queryKey: ['invoices', 'list', q],
    queryFn: () => transport.get<{ data: Invoice[] }>('/invoices', q ? { q } : {}),
    placeholderData: (prev) => prev,
  });

export const invoiceQuery = (id: string) =>
  queryOptions({
    queryKey: ['invoices', 'one', id],
    queryFn: () => transport.get<Invoice>(`/invoices/${id}`),
  });

export const invoicesMetaQuery = () =>
  queryOptions({
    queryKey: ['invoices', 'meta'],
    queryFn: () => transport.get<InvoicesMeta>('/invoices/meta'),
  });
