// TIP-040 pha 5 (AC04): form provider — key / header CHỈ GHI: để trống = không gửi (giữ nguyên), "Xoá key" gửi null; header nhập
// `tên: giá trị` → object; không bao giờ điền sẵn key cũ.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const run = vi.fn();
vi.mock('@/shared/actions/useAction', () => ({ useAction: () => ({ run: (i: unknown) => run(i), isPending: false }) }));
vi.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));

import { ProviderForm } from './ProviderForm';
import { stubDom } from './test-dom';

stubDom();

const P = { key: 'router', version: 4, kind: 'openai_compatible' as const, name: '9router', base_url: 'https://llm.example.com/v1', has_api_key: true, header_names: ['x-canary'], capabilities: {}, status: 'active' as const, last_probe_at: null, last_error: null };
const save = async () => act(async () => void fireEvent.click(screen.getByTestId('adm-prov-save').closest('button')!));

beforeEach(() => run.mockReset().mockResolvedValue({ result: {} }));
afterEach(cleanup);

describe('ProviderForm', () => {
  it('để trống key / header → không gửi (giữ nguyên); ô key không điền sẵn', async () => {
    render(<ProviderForm provider={P} onClose={() => undefined} />);
    expect((screen.getByTestId('adm-prov-apikey') as HTMLInputElement).value).toBe('');
    await save();
    await waitFor(() => expect(run).toHaveBeenCalled());
    const body = run.mock.calls[0]![0] as Record<string, unknown>;
    expect(body).toMatchObject({ key: 'router', if_version: 4, kind: 'openai_compatible', name: '9router', base_url: 'https://llm.example.com/v1' });
    expect('api_key' in body).toBe(false);
    expect('headers' in body).toBe(false);
  });

  it('xoá key → api_key null; nhập key + header → gửi giá trị mới', async () => {
    render(<ProviderForm provider={P} onClose={() => undefined} />);
    fireEvent.click(screen.getByText('clearKey'));
    await save();
    await waitFor(() => expect(run).toHaveBeenCalled());
    expect(run.mock.calls[0]![0]).toMatchObject({ api_key: null });
    cleanup();
    run.mockClear();
    render(<ProviderForm provider={P} onClose={() => undefined} />);
    fireEvent.change(screen.getByTestId('adm-prov-apikey'), { target: { value: 'sk-new-key-123' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'headers' }), { target: { value: 'X-Canary: v2\nx-other: 1' } });
    await save();
    await waitFor(() => expect(run).toHaveBeenCalled());
    expect(run.mock.calls[0]![0]).toMatchObject({ api_key: 'sk-new-key-123', headers: { 'x-canary': 'v2', 'x-other': '1' } });
  });
});
