'use client';
// Ô giá trị có thể bị ẩn theo quyền trường (TIP-045b annex C): bị ẩn → nhãn "Không có quyền xem" (không bao giờ hiện 0 / rỗng thay thế).
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { isFieldHidden } from '@appchat/shared';

export interface FieldValueProps {
  row: { hidden_fields?: string[] } | null | undefined;
  field: string;
  children: ReactNode;
  className?: string;
}

export function FieldValue({ row, field, children, className }: FieldValueProps) {
  const t = useTranslations('common');
  if (!isFieldHidden(row, field)) return <>{children}</>;
  return (
    <span className={className} title={t('fieldHiddenHint')} data-testid={`field-hidden-${field}`}>
      {t('fieldHidden')}
    </span>
  );
}
