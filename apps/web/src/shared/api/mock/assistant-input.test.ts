// Hợp đồng mock đầu vào Trợ lý (TIP-023f §5.1, §5.3): tải lên (purpose attachment, id uuid) → prepare idempotent theo bản nháp →
// GET /assistant/input/:id (preparing → ready) → /parts phân trang → lượt chỉ có tệp (không chữ) được nhận và buộc phiên; tệp chưa
// ready → ATTACHMENT_NOT_PREPARED; buộc phiên khác → 409; remove tháo bản nháp; lịch sử phiên có phần tệp (tên / loại, không nội dung).
// Mô phỏng hợp đồng — không chứng minh parser / model.
import { beforeEach, describe, expect, it } from 'vitest';
import { inputArtifactSchema, inputReadSchema } from '@appchat/shared';
import { mockTransport } from './mock-transport';
import { resetAssistantInput } from './assistant-input-store';

type Done<T> = { result: T };
const prepare = async (name: string, body: string, nonce: string) => {
  const up = await mockTransport.upload(new File([body], name, { type: 'text/plain' }), 'attachment');
  const r = await mockTransport.action('assistant.attachment_prepare', { file_id: up.file_id, draft_nonce: nonce });
  return (r.data as Done<{ artifact_id: string; revision: number; phase: string }>).result;
};
const ready = async (id: string) => {
  let a = inputArtifactSchema.parse(await mockTransport.get(`/assistant/input/${id}`));
  while (a.phase !== 'ready' && a.phase !== 'failed' && a.phase !== 'unsupported') a = inputArtifactSchema.parse(await mockTransport.get(`/assistant/input/${id}`));
  return a;
};

beforeEach(() => resetAssistantInput());

describe('mock đầu vào Trợ lý', () => {
  it('prepare idempotent theo bản nháp → ready → parts phân trang đúng schema', async () => {
    const nonce = crypto.randomUUID();
    const up = await mockTransport.upload(new File(['Đoạn 1\n\nĐoạn 2'], 'ghi-chu.txt', { type: 'text/plain' }), 'attachment');
    const once = async () => ((await mockTransport.action('assistant.attachment_prepare', { file_id: up.file_id, draft_nonce: nonce })).data as Done<{ artifact_id: string; phase: string }>).result;
    const a = await once();
    expect(a.phase).toBe('queued');
    expect((await once()).artifact_id).toBe(a.artifact_id);
    const dto = await ready(a.artifact_id);
    expect(dto).toMatchObject({ phase: 'ready', kind: 'text', part_count: 2 });
    expect(dto).not.toHaveProperty('parts');
    const page = inputReadSchema.parse(await mockTransport.get(`/assistant/input/${a.artifact_id}/parts`, { revision: 1, limit: 1 }));
    expect(page).toMatchObject({ has_more: true, next_cursor: '1', parts: [{ locator: { kind: 'paragraph', paragraph: 1 }, text: 'Đoạn 1' }] });
  });

  it('tệp hỏng / đuôi lạ → lỗi có lý do', async () => {
    const nonce = crypto.randomUUID();
    expect(await ready((await prepare('bao-gia-corrupt.txt', 'x', nonce)).artifact_id)).toMatchObject({ phase: 'failed', error_reason: 'corrupt' });
  });

  it('lượt chỉ có tệp: nhận + buộc phiên + lịch sử có phần tệp; chưa ready → ATTACHMENT_NOT_PREPARED; phiên khác → 409', async () => {
    const nonce = crypto.randomUUID();
    const a = await prepare('hop-dong.txt', 'Điều 1: thanh toán 30 ngày', nonce);
    const pending = await prepare('khac.txt', 'y', nonce);
    await expect(mockTransport.post('/assistant/messages', { text: '', inputs: [{ artifact_id: pending.artifact_id, revision: 1 }] })).rejects.toMatchObject({ status: 409, error: { code: 'ATTACHMENT_NOT_PREPARED' } });
    await ready(a.artifact_id);
    const turn = await mockTransport.post<{ session_id: string; events: { type: string; text?: string }[] }>('/assistant/messages', { text: '', mode: 'chat', inputs: [{ artifact_id: a.artifact_id, revision: 1 }] });
    expect(turn.events[0]?.text).toContain('thanh toán 30 ngày');
    const hist = await mockTransport.get<{ data: { text: string; attachment?: { name: string } }[] }>(`/assistant/sessions/${turn.session_id}/messages`);
    expect(hist.data[0]?.text).toBe('Tệp đính kèm nói gì?');
    expect(hist.data[1]?.attachment?.name).toBe('hop-dong.txt');
    expect(JSON.stringify(hist.data[1])).not.toContain('30 ngày');
    await expect(mockTransport.post('/assistant/messages', { text: 'lại', session_id: 'as_other', inputs: [{ artifact_id: a.artifact_id, revision: 1 }] })).rejects.toMatchObject({ status: 409 });
  });

  it('remove: tháo bản nháp chưa buộc (revision tăng); sai revision → 409', async () => {
    const a = await prepare('a.txt', 'z', crypto.randomUUID());
    await expect(mockTransport.action('assistant.attachment_remove', { artifact_id: a.artifact_id, if_revision: 9 })).rejects.toMatchObject({ status: 409 });
    const r = await mockTransport.action('assistant.attachment_remove', { artifact_id: a.artifact_id, if_revision: 1 });
    expect((r.data as Done<{ phase: string; revision: number }>).result).toMatchObject({ phase: 'cancelled', revision: 2 });
  });
});
