// Đọc chính tả (TIP-023f §4.4-4.5, AC 8) bằng recognizer GIẢ tất định: lần đầu hỏi đồng ý; chữ tạm không vào ô soạn; Dừng → bản xem
// lại sửa được → Chèn tại con trỏ đã ghi; gõ thêm trong lúc nghe → không chèn chồng (chọn cuối / thay), không mất chữ; lỗi quyền → báo
// thật; đổi phạm vi (phiên / chế độ) → huỷ, callback trễ bị bỏ; không bao giờ tự gửi; 60s tự dừng. Kiểm thử giọng thật làm riêng.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { DICTATION_MAX_MS, useAssistantDictation, type Recognizer } from './useAssistantDictation';

let last: FakeRec | null = null;
class FakeRec implements Recognizer {
  lang = '';
  interimResults = false;
  continuous = false;
  onresult: Recognizer['onresult'] = null;
  onerror: Recognizer['onerror'] = null;
  onend: Recognizer['onend'] = null;
  started = false;
  aborted = false;
  start() {
    this.started = true;
    last = this as FakeRec;
  }
  stop() {
    this.onend?.();
  }
  abort() {
    this.aborted = true;
  }
  say(text: string, isFinal: boolean) {
    this.onresult?.({ resultIndex: 0, results: [{ isFinal, 0: { transcript: text } }] });
  }
}

const box = { text: 'Xin chào ', rev: 0, caret: 9 };
const draft = { read: () => ({ ...box }), write: (t: string) => ((box.text = t), box.rev++) };
const setup = (scope = 's1') => renderHook(({ s }) => useAssistantDictation('vi', draft, s), { initialProps: { s: scope } });

beforeEach(() => {
  Object.assign(box, { text: 'Xin chào ', rev: 0, caret: 9 });
  (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition = FakeRec;
  localStorage.clear();
  last = null;
});
afterEach(() => {
  delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
  vi.useRealTimers();
});

describe('useAssistantDictation', () => {
  it('lần đầu: thông báo → đồng ý mới nghe (vi-VN); chữ tạm không vào ô soạn; Dừng → xem lại → Chèn tại con trỏ', () => {
    const { result } = setup();
    act(() => result.current.start());
    expect(result.current.state.kind).toBe('consent');
    expect(last).toBeNull();
    act(() => result.current.accept());
    expect(last!.started).toBe(true);
    expect(last?.lang).toBe('vi-VN');
    act(() => last!.say('tạo báo', false));
    expect(result.current.state).toEqual({ kind: 'listening', interim: 'tạo báo' });
    expect(box.text).toBe('Xin chào ');
    act(() => last!.say('tạo báo giá', true));
    act(() => result.current.stop());
    expect(result.current.state).toEqual({ kind: 'review', text: 'tạo báo giá' });
    act(() => result.current.edit('tạo báo giá mới'));
    act(() => result.current.insert('caret'));
    expect(box.text).toBe('Xin chào tạo báo giá mới');
    expect(result.current.state.kind).toBe('idle');
  });

  it('gõ thêm trong lúc nghe → không chèn tại con trỏ cũ; thêm vào cuối giữ nguyên chữ đã gõ', () => {
    localStorage.setItem('appchat.asst.dictation.consent', '1');
    const { result } = setup();
    act(() => result.current.start());
    act(() => last!.say('một hai', true));
    draft.write('Xin chào anh Minh');
    act(() => result.current.stop());
    expect(result.current.canInsertAtCaret()).toBe(false);
    act(() => result.current.insert('end'));
    expect(box.text).toBe('Xin chào anh Minh một hai');
  });

  it('từ chối micro → lỗi thật (gõ phím); không tự bắt đầu lại', () => {
    localStorage.setItem('appchat.asst.dictation.consent', '1');
    const { result } = setup();
    act(() => result.current.start());
    const r = last!;
    act(() => r.onerror?.({ error: 'not-allowed' }));
    expect(result.current.state).toEqual({ kind: 'error', reason: 'denied' });
    expect(last).toBe(r);
  });

  it('đổi phạm vi → huỷ nghe; kết quả trễ của lần cũ bị bỏ', () => {
    localStorage.setItem('appchat.asst.dictation.consent', '1');
    const { result, rerender } = setup();
    act(() => result.current.start());
    const r = last!;
    const late = r.onresult!;
    rerender({ s: 's2' });
    expect(r.aborted).toBe(true);
    act(() => late({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: 'trễ' } }] }));
    expect(result.current.state.kind).toBe('idle');
  });

  it('tối đa 60s rồi tự dừng; trình duyệt không hỗ trợ → báo thật', () => {
    vi.useFakeTimers();
    localStorage.setItem('appchat.asst.dictation.consent', '1');
    const { result } = setup();
    act(() => result.current.start());
    act(() => last!.say('xong', true));
    act(() => vi.advanceTimersByTime(DICTATION_MAX_MS));
    expect(result.current.state).toEqual({ kind: 'review', text: 'xong' });
    delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
    act(() => result.current.start());
    expect(result.current.state).toEqual({ kind: 'error', reason: 'unsupported' });
  });
});
