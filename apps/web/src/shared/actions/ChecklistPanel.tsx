'use client';
// Bảng kiểm pháp lý của chứng từ trong hộp xác nhận gửi / duyệt (TIP-028b, templates.md §6): mỗi mục đạt / chưa đạt + lý do (mẫu thiếu mục
// · dữ liệu trống, vd. MST bên bán chưa khai). Chỉ cảnh báo — các bên được tự thoả thuận, nút xác nhận không bị khoá (DC-444). Nhãn mục dùng
// chung với màn sửa mẫu (`actions.checklist.item.*`).
import { createStyles } from 'antd-style';
import { useTranslations } from 'next-intl';
import type { ChecklistItem } from '@appchat/actions';
import { Icon, color, font, radius } from '@appchat/ui';

const useStyles = createStyles(({ css }) => ({
  box: css`
    margin-top: 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    padding: 8px 12px;
  `,
  head: css`
    display: flex;
    justify-content: space-between;
    gap: 8px;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
    margin-bottom: 4px;
  `,
  sum: css`
    font-weight: ${font.weight.regular};
    color: ${color.text3};
  `,
  row: css`
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 4px 0;
    font-size: ${font.scale.s13}px;
    color: ${color.text2};
  `,
  hint: css`
    display: block;
    font-size: ${font.scale.s12}px;
    color: ${color.amberText};
  `,
  note: css`
    margin-top: 4px;
    font-size: ${font.scale.s12}px;
    color: ${color.text3};
  `,
}));

export function ChecklistPanel({ items }: { items: ChecklistItem[] }) {
  const t = useTranslations('actions.checklist');
  const { styles } = useStyles();
  const missing = items.filter((c) => !c.ok).length;
  const fieldOf = (v: string) => {
    const key = `field.${v.replace(/\./g, '_')}`;
    return t.has(key as never) ? t(key as never) : v;
  };
  const hintOf = (h: string) => (h.startsWith('empty:') ? t('hint.empty', { field: fieldOf(h.slice(6)) }) : t('hint.template'));
  return (
    <div className={styles.box} data-testid="confirm-checklist" role="group" aria-label={t('title')}>
      <div className={styles.head}>
        <span>{t('title')}</span>
        <span className={styles.sum}>{missing ? t('missing', { n: missing }) : t('allOk')}</span>
      </div>
      {items.map((c) => (
        <div key={c.code} className={styles.row} data-check={c.code} data-ok={c.ok}>
          <Icon name={c.ok ? 'ic-check' : 'ic-help'} size={14} color={c.ok ? color.brand : color.amberText} />
          <span>
            {t.has(`item.${c.code}` as never) ? t(`item.${c.code}` as never) : c.code}
            {!c.ok && c.hint ? <span className={styles.hint}>{hintOf(c.hint)}</span> : null}
          </span>
        </div>
      ))}
      {missing ? <div className={styles.note}>{t('note')}</div> : null}
    </div>
  );
}
