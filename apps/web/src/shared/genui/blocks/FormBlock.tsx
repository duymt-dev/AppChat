// Khối `form` (standard §5): gắn đúng một action; ô dựng theo kiểu trong schema action, điền sẵn đã validate (sai → trống + cảnh báo).
// Ô bí mật dạng password, không điền sẵn, gửi thẳng action (vault ở lần xác nhận) rồi xoá. Gửi = intent server ký → thẻ xác nhận.
// Compact ≤ 4 ô + "Mở rộng"; không có intent (không quyền) → ẩn cả form.
'use client';
import { Alert, Button, Input, InputNumber, Select, Switch } from 'antd';
import { useTranslations } from 'next-intl';
import { GENUI_COMPACT } from '@appchat/shared';
import { useGenUi } from '../context';
import { useGenUiStyles } from '../genui.styles';
import { useGenUiIntent } from '../hooks/useGenUiIntent';
import { isSecret, kindAt, useSecretForm } from '../hooks/useSecretForm';
import type { BlockOf, BlockProps } from '../types';
import { ExpandMore } from './ExpandMore';

export function FormBlock({ block, path }: BlockProps<BlockOf<'form'>>) {
  const t = useTranslations('common.genui');
  const { styles } = useGenUiStyles();
  const { mode } = useGenUi();
  const { run, allowed, isPending } = useGenUiIntent(block.action_id, path);
  const f = useSecretForm(block.action_id, block.fields);
  if (!allowed) return null;
  const shown = mode === 'compact' ? block.fields.slice(0, GENUI_COMPACT.formFields) : block.fields;

  // Bí mật chỉ sống tới hết lần gửi (thành công, huỷ xác nhận hay lỗi đều xoá) — gửi lại phải nhập lại.
  const submit = async () => {
    try {
      await run(f.build(), { secretPaths: f.secretNames });
    } finally {
      f.clearSecrets();
    }
  };

  return (
    <form
      className={styles.section}
      data-testid="genui-form"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      {block.title ? <div className={styles.sectionTitle}>{block.title}</div> : null}
      {f.invalid.length ? <Alert type="warning" showIcon title={t('prefillInvalid')} /> : null}
      {shown.map((field) => {
        const label = field.label ?? field.name;
        if (isSecret(block.action_id, field))
          return (
            <label key={field.name} className={styles.stack} style={{ gap: 4 }}>
              <span className={styles.statLabel}>{label}</span>
              <Input.Password autoComplete="off" value={f.secretValue(field.name)} onChange={(e) => f.setSecret(field.name, e.target.value)} data-testid="genui-secret" data-field={field.name} />
              <span className={styles.empty}>{t('secretHint')}</span>
            </label>
          );
        const k = kindAt(block.action_id, field.name);
        const v = f.values[field.name];
        return (
          <label key={field.name} className={styles.stack} style={{ gap: 4 }}>
            <span className={styles.statLabel}>{label}</span>
            {k.kind === 'enum' ? (
              <Select value={v as string | undefined} options={k.options.map((o) => ({ value: o, label: o }))} onChange={(x) => f.set(field.name, x)} data-field={field.name} />
            ) : k.kind === 'number' ? (
              <InputNumber style={{ width: '100%' }} value={typeof v === 'number' ? v : undefined} onChange={(x) => f.set(field.name, x ?? undefined)} data-field={field.name} />
            ) : k.kind === 'boolean' ? (
              <Switch checked={v === true} onChange={(x) => f.set(field.name, x)} data-field={field.name} />
            ) : k.kind === 'textarea' ? (
              <Input.TextArea rows={3} value={typeof v === 'string' ? v : ''} onChange={(e) => f.set(field.name, e.target.value)} data-field={field.name} />
            ) : (
              <Input value={v === undefined || v === null ? '' : String(v)} onChange={(e) => f.set(field.name, e.target.value)} data-field={field.name} />
            )}
          </label>
        );
      })}
      <ExpandMore hidden={block.fields.length - shown.length} />
      <Button type="primary" htmlType="submit" loading={isPending} data-testid="genui-form-submit">
        {block.submit_label ?? t('submit')}
      </Button>
    </form>
  );
}
