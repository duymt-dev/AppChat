// TIP-014c AC5 (D48): Dòng Research trong menu ＋ khoá cứng + nhãn "Sắp có" + bấm không làm gì.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import inboxMessages from '../../../../messages/vi/inbox.json';
import commonMessages from '../../../../messages/vi/common.json';

const pushSpy = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushSpy }) }));
vi.mock('@/shared/ai-utilities', () => ({ UtilityMenu: () => null }));
vi.mock('@/shared/api/client', () => ({
  transport: { get: async () => ({ agent: { id: 'a1', name: 'Bot CSKH' }, groups: [] }) },
}));

import { AgentToolsMenu } from './AgentToolsMenu';

describe('AgentToolsMenu — Research khoá (TIP-014c AC5)', () => {
  afterEach(() => {
    cleanup();
    pushSpy.mockReset();
  });

  it('nút Research bị disabled, có nhãn "Sắp có", bấm không gọi handler nào', () => {
    const onClose = vi.fn();
    const onPickFile = vi.fn();
    const onCapture = vi.fn();
    const onSelectUtility = vi.fn();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <NextIntlClientProvider locale="vi" messages={{ inbox: inboxMessages, common: commonMessages }}>
          <AgentToolsMenu
            conversationId="c1"
            onClose={onClose}
            onPickFile={onPickFile}
            onCapture={onCapture}
            onSelectUtility={onSelectUtility}
          />
        </NextIntlClientProvider>
      </QueryClientProvider>,
    );

    const btn = screen.getByTestId('agent-tools-research') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.textContent).toContain('Research');
    expect(btn.textContent).toContain('Sắp có');
    fireEvent.click(btn);
    expect(onClose).not.toHaveBeenCalled();
    expect(onPickFile).not.toHaveBeenCalled();
    expect(onCapture).not.toHaveBeenCalled();
    expect(onSelectUtility).not.toHaveBeenCalled();
    expect(pushSpy).not.toHaveBeenCalled();
  });
});
