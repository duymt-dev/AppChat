// Tải nguồn kho tri thức (TIP-020b): GET /v1/kb/sources/:id/download qua `transport.blob` — tệp / văn bản → tải về đúng tên (object URL
// thu hồi sau khi bấm); nguồn URL → mở tab (chỉ http/https, server đã kiểm); nguồn catalog → sang trang sản phẩm. Không toast "đã tải" khi
// chưa có blob; 403 / 404 / lỗi mạng → thông báo lỗi.
'use client';
import { useState } from 'react';
import { App } from 'antd';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ApiRequestError, kbSourceLinkSchema } from '@appchat/shared';
import { transport } from '@/shared/api/client';

const REVOKE_MS = 60_000;
const JSON_TYPE = 'application/json';
const PRODUCTS = '/products';

export function useKbDownload() {
  const t = useTranslations('settings.rag');
  const { message } = App.useApp();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const download = async (id: string, name: string) => {
    setBusy(id);
    try {
      const blob = await transport.blob(`/kb/sources/${id}/download`);
      if (blob.type.startsWith(JSON_TYPE)) {
        const link = kbSourceLinkSchema.parse(((await new Response(blob).json()) as { data: unknown }).data);
        if (link.kind === 'url') window.open(link.url, '_blank', 'noopener,noreferrer');
        else {
          // Nguồn catalog là bản sao của sản phẩm — sửa / xem ở màn Sản phẩm.
          void message.info(t('dlCatalog'));
          router.push(PRODUCTS);
        }
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), REVOKE_MS);
    } catch (e) {
      const status = e instanceof ApiRequestError ? e.status : 0;
      void message.error(t(status === 403 ? 'dlForbidden' : status === 404 ? 'dlMissing' : 'dlFail'));
    } finally {
      setBusy(null);
    }
  };
  return { download, busy };
}
