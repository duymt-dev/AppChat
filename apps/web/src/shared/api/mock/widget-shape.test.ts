// TIP-017: route mock Cài đặt › Trợ lý AI website đúng shape đọc dùng chung với API thật (packages/shared/src/api/webchat.ts);
// `webchat.update_widget` (tắt / bật, cấu hình) phản ánh ở lần đọc sau và trả đúng output của Action Registry.
import { beforeEach, describe, expect, it } from 'vitest';
import { webchatUpdateWidget } from '@appchat/actions';
import { widgetSettingsSchema } from '@appchat/shared';
import { mockTransport } from './mock-transport';
import { setMockRole } from './store';

describe('mock widget — shape FE ↔ BE', () => {
  beforeEach(() => setMockRole('owner'));

  it('GET /settings/widget + webchat.update_widget', async () => {
    const w = widgetSettingsSchema.parse(await mockTransport.get('/settings/widget'));
    expect(w).toMatchObject({ enabled: true, public_key: 'wk_demo_appchat_w1' });
    const r = await mockTransport.action('webchat.update_widget', { enabled: false, greeting: 'Chào bạn' });
    expect(webchatUpdateWidget.output.parse((r.data as { result: unknown }).result)).toMatchObject({ ok: true, public_key: 'wk_demo_appchat_w1' });
    expect(widgetSettingsSchema.parse(await mockTransport.get('/settings/widget'))).toMatchObject({ enabled: false, greeting: 'Chào bạn', kpis: { running: 0 } });
  });
});
