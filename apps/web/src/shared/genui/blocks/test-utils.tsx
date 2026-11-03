// Dựng một cây GenUI trong test: i18n vi thật (common.json), QueryClient, refs / intent / onUi giả. Chỉ dùng trong *.test.tsx.
import type { ReactNode } from 'react';
import { afterEach } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from 'antd';
import type { GenUiPart, UiBlock } from '@appchat/shared';
import common from '../../../../messages/vi/common.json';
import actions from '../../../../messages/vi/actions.json';
import errors from '../../../../messages/vi/errors.json';
import { GenUiRenderer, type GenUiRendererProps } from '../GenUiRenderer';
import type { GenUiMode } from '../types';

afterEach(cleanup);

export const RUN = '01900000-0000-7000-8000-000000000001';

export function part(root: UiBlock, refs: Record<string, unknown> = {}, intents?: Record<string, string>): GenUiPart {
  return { type: 'ui', tree: { version: 1, root }, run_id: RUN, refs, ...(intents ? { intents } : {}) };
}

export function wrap(children: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <NextIntlClientProvider locale="vi" timeZone="Asia/Ho_Chi_Minh" messages={{ common, actions, errors }}>
      <QueryClientProvider client={qc}>
        <App>{children}</App>
      </QueryClientProvider>
    </NextIntlClientProvider>
  );
}

export function renderUi(p: GenUiPart, mode: GenUiMode = 'full', extra: Partial<GenUiRendererProps> = {}) {
  const onUi = extra.onUi ?? (() => undefined);
  return render(wrap(<GenUiRenderer part={p} mode={mode} onUi={onUi} {...extra} />));
}
