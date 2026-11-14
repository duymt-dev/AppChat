// TIP-025b §F.3 — dịch tin soạn: bật tự dịch + Gửi → xem trước (nguyên văn + bản dịch), KHÔNG gửi; "Gửi bản dịch" mới gọi message.send
// với chữ đã dịch; đổi nháp trong lúc chờ → kết quả cũ bị bỏ; huỷ giữ nháp; lỗi → thử lại / gửi nguyên văn; chế độ ghi chú không dịch;
// tắt tự dịch → không gọi model.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';

const runs: [string, Record<string, unknown>][] = [];
let fail = false;
let hold: (() => void) | null = null;
vi.mock('next-intl', () => ({ useTranslations: (ns: string) => Object.assign((k: string) => `${ns}.${k}`, { rich: (k: string) => k }) }));
vi.mock('@/shared/authz/useCan', () => ({ useCan: () => true }));
vi.mock('@/shared/shell/useShellData', () => ({ useMe: () => ({ data: { current_workspace_id: 'w1', user: { id: 'u1', name: 'An' } } }) }));
vi.mock('../hooks/useComposerFiles', () => ({ useComposerFiles: () => ({ files: [], add: vi.fn(), remove: vi.fn(), clear: vi.fn(), ready: true, ids: [] }) }));
vi.mock('../hooks/useAssistantDraft', () => ({ useAssistantDraft: () => ({ pending: false, error: null, proposal: null }) }));
vi.mock('./AssistantDraftBar', () => ({ AssistantDraftBar: () => null }));
vi.mock('./ComposerPopovers', () => ({ ComposerPopovers: () => null }));
vi.mock('@/shared/actions/useAction', () => ({
  useAction: (id: string) => ({
    isPending: false,
    run: async (i: Record<string, unknown>) => {
      runs.push([id, i]);
      if (id === 'ai.translate_draft') {
        if (hold) await new Promise<void>((r) => (hold = r));
        if (fail) return null;
        return { result: { text: `[${String(i.to).toUpperCase()}] ${String(i.text)}`, to: i.to, draft_revision: i.draft_revision, cached: false } };
      }
      return { result: {} };
    },
  }),
}));

import { useInboxUi } from '../inbox-store';
import { Composer } from './Composer';

const conv = { id: 'c1', title: 'Lan — Spa', kind: 'direct', ai_mode: 'off' } as never;
function Host() {
  const [d, setD] = useState('Dạ giá 1.200.000đ ạ');
  return <Composer conv={conv} channel={undefined} draft={d} onDraft={setD} />;
}
const sends = () => runs.filter(([id]) => id === 'message.send');

describe('Composer — dịch tin soạn', () => {
  afterEach(() => {
    cleanup();
    runs.length = 0;
    fail = false;
    hold = null;
    window.localStorage.clear();
    useInboxUi.setState({ composerMode: 'reply' });
  });
  const autoOn = (to = 'ja') => window.localStorage.setItem('inbox.xl:w1:u1:c1', JSON.stringify({ auto: true, to }));

  it('tắt tự dịch: Gửi gửi thẳng, không gọi model', async () => {
    render(<Host />);
    fireEvent.click(screen.getByTestId('composer-send'));
    await waitFor(() => expect(sends()).toHaveLength(1));
    expect(runs.some(([id]) => id === 'ai.translate_draft')).toBe(false);
  });

  it('bật: Gửi → xem trước, chưa gửi; Gửi bản dịch → message.send chữ đã dịch', async () => {
    autoOn('ja');
    render(<Host />);
    fireEvent.click(screen.getByTestId('composer-send'));
    await waitFor(() => expect(screen.getByTestId('xl-translated').textContent).toBe('[JA] Dạ giá 1.200.000đ ạ'));
    expect(screen.getByTestId('xl-original').textContent).toBe('Dạ giá 1.200.000đ ạ');
    expect(sends()).toHaveLength(0);
    fireEvent.click(screen.getByTestId('xl-send'));
    await waitFor(() => expect(sends()).toHaveLength(1));
    expect(sends()[0]![1]).toMatchObject({ conversation_id: 'c1', text: '[JA] Dạ giá 1.200.000đ ạ' });
  });

  it('sửa nháp trong lúc chờ → bỏ kết quả cũ; huỷ giữ nháp', async () => {
    autoOn('en');
    hold = () => {};
    render(<Host />);
    fireEvent.click(screen.getByTestId('composer-send'));
    await waitFor(() => expect(screen.getByTestId('xl-preview')).toBeTruthy());
    fireEvent.change(screen.getByTestId('composer-input'), { target: { value: 'Dạ giá mới' } });
    await act(async () => hold?.());
    expect(screen.queryByTestId('xl-translated')).toBeNull();
    hold = null;
    fireEvent.click(screen.getByTestId('composer-send'));
    await waitFor(() => expect(screen.getByTestId('xl-translated').textContent).toBe('[EN] Dạ giá mới'));
    fireEvent.click(screen.getByTestId('xl-cancel'));
    expect(screen.queryByTestId('xl-preview')).toBeNull();
    expect((screen.getByTestId('composer-input') as HTMLTextAreaElement).value).toBe('Dạ giá mới');
    expect(sends()).toHaveLength(0);
  });

  it('lỗi → thử lại / gửi nguyên văn; chế độ ghi chú không dịch', async () => {
    autoOn();
    fail = true;
    render(<Host />);
    fireEvent.click(screen.getByTestId('composer-send'));
    await waitFor(() => expect(screen.getByTestId('xl-send-original')).toBeTruthy());
    fireEvent.click(screen.getByTestId('xl-send-original'));
    await waitFor(() => expect(sends()[0]![1]).toMatchObject({ text: 'Dạ giá 1.200.000đ ạ' }));
    cleanup();
    runs.length = 0;
    useInboxUi.setState({ composerMode: 'note' });
    render(<Host />);
    fireEvent.click(screen.getByTestId('composer-send'));
    await waitFor(() => expect(runs.some(([id]) => id === 'note.add')).toBe(true));
    expect(runs.some(([id]) => id === 'ai.translate_draft')).toBe(false);
  });
});
