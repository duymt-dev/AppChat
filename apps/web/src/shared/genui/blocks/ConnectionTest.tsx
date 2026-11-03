// Nút "Kiểm tra kết nối" của form kết nối GenUI (TIP-023c G3 mục 10): gọi action thăm dò (read, không lưu) với giá trị đang nhập —
// kể cả ô bí mật, đi thẳng action (không vào store tin nhắn / model). Không quyền action thăm dò → ẩn nút. Kết quả chỉ là gợi ý; gửi
// form vẫn qua thẻ xác nhận.
'use client';
import { useState } from 'react';
import { Alert, Button } from 'antd';
import { useTranslations } from 'next-intl';
import { getAction } from '@appchat/actions';
import type { PermissionKey } from '@appchat/shared';
import { useAction } from '../../actions/useAction';
import { useCan } from '../../authz/useCan';
import { CONNECTION_PROBES, probeOutcome, type ProbeOutcome } from '../connection-probe';

export function ConnectionTest({ actionId, build }: { actionId: string; build: () => Record<string, unknown> }) {
  const t = useTranslations('common.genui.probe');
  const probe = CONNECTION_PROBES[actionId];
  const def = probe ? getAction(probe.action) : undefined;
  const allowed = useCan((def?.permission ?? 'integrations.manage') as PermissionKey);
  const { run, isPending } = useAction(probe?.action ?? 'integration.test');
  const [out, setOut] = useState<ProbeOutcome | null>(null);
  if (!probe || !def || !allowed) return null;

  const test = async () => {
    setOut(null);
    const r = await run(probe.input(build()), { silent: true });
    if (r) setOut(probeOutcome(r.result));
  };
  const known = ['failed.rejected', 'failed.timeout', 'unsupported.coming_soon', 'unsupported.no_test', 'not_connected'];
  const text = out?.ok ? t('ok') : (out?.message ?? (out?.reason && known.includes(out.reason) ? t(out.reason as never) : t('failed.rejected')));
  return (
    <>
      <Button onClick={() => void test()} loading={isPending} data-testid="genui-form-test">
        {t('button')}
      </Button>
      {out ? <Alert type={out.ok ? 'success' : 'warning'} showIcon title={text} data-testid="genui-form-test-result" /> : null}
    </>
  );
}
