// Trang chứng từ công khai (TIP-032b P2): `GET /public/documents/:token` (thông tin hiển thị) + `/pdf` (tệp đã gửi). Link hỏng / hết hạn → 410.
import { queryOptions } from '@tanstack/react-query';
import type { PublicDocumentView } from '@appchat/shared';
import { transport } from '@/shared/api/client';

export const publicDocumentQuery = (token: string) =>
  queryOptions({ queryKey: ['public-document', token], queryFn: () => transport.get<PublicDocumentView>(`/public/documents/${token}`), retry: false });

export const publicDocumentPdf = (token: string) => transport.blob(`/public/documents/${token}/pdf`);
