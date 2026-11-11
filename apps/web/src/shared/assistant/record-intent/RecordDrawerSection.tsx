// Phần "đang gắn bản ghi" trong drawer Trợ lý của module (TIP-023g §2): có phạm vi bản ghi → khung gắn bản ghi + nút "Bỏ gắn" (về Trợ lý
// theo màn); không có → không hiện gì (drawer giữ nội dung theo màn cũ). Đóng drawer không xoá phạm vi (mở lại vẫn đúng bản ghi).
'use client';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { RecordAssistantPanel, type RecordAssistantPanelProps } from './RecordAssistantPanel';
import { useRecordIntentStyles } from './record-intent.styles';
import { useRecordScope, useRecordScopes } from './store';
import type { RecordScope } from './types';

export function RecordDrawerSection(p: Omit<RecordAssistantPanelProps, 'scope'>) {
  const t = useTranslations('common.recordAi');
  const { styles } = useRecordIntentStyles();
  const scope = useRecordScope(p.module);
  if (!scope) return null;
  return (
    <div className={styles.wrap}>
      <RecordAssistantPanel {...p} scope={scope} />
      <div className={styles.row}>
        <button
          type="button"
          className={styles.chip}
          onClick={() => useRecordScopes.getState().clear(p.module)}
          data-testid={`${p.testId ?? 'rai'}-unbind`}
        >
          {t('unbind')}
        </button>
      </div>
    </div>
  );
}

/** Drawer đang gắn bản ghi? (để ẩn nội dung theo màn). */
export const useRecordBound = (module: string) => !!useRecordScope(module);

/**
 * Khung gắn bản ghi nhúng trong tab AI của drawer chứng từ (Đề nghị thanh toán / Sản phẩm — không có drawer Trợ lý riêng): mount = đặt
 * phạm vi bản ghi (state cục bộ, 0 lời gọi). Phạm vi sống qua đóng popover / đổi tab; đổi bản ghi → thế hệ mới.
 */
export function EmbeddedRecordAssistant(
  p: Omit<RecordAssistantPanelProps, 'scope'> & { scopeOf: Omit<RecordScope, 'generation'> },
) {
  const { scopeOf, ...rest } = p;
  const { module, entity, id, label, version } = scopeOf;
  useEffect(() => {
    useRecordScopes
      .getState()
      .open({ module, entity, id, label, ...(version !== undefined ? { version } : {}) });
  }, [module, entity, id, label, version]);
  const scope = useRecordScope(p.module);
  return <RecordAssistantPanel {...rest} scope={scope && scope.id === id ? scope : null} />;
}
