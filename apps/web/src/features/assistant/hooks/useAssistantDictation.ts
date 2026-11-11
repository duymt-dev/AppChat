// Đọc chính tả cho ô soạn Trợ lý (TIP-023f §4.4-4.5): SpeechRecognition của TRÌNH DUYỆT qua adapter có kiểu (không route âm thanh
// server, không provider mới, không lưu âm thanh). Lần đầu: báo trình duyệt có thể gửi âm thanh tới dịch vụ nhận giọng của chính nó →
// người dùng bấm bắt đầu. Đang nghe: chữ tạm (interim — không bao giờ thành lệnh); tối đa 60s; Dừng tường minh. Kết quả cuối vào bản xem
// lại sửa được; "Chèn" ghép tại con trỏ đã ghi lúc bắt đầu chỉ khi bản nháp chưa đổi, đổi rồi → hỏi ghép (cuối / thay) — không mất chữ
// đã gõ. Không tự gửi. Đổi workspace / phiên / chế độ, ẩn tab, unmount → huỷ; callback cũ bị bỏ theo thế hệ.
'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { DictationState } from '../input-types';

export const DICTATION_MAX_MS = 60_000;
const CONSENT_KEY = 'appchat.asst.dictation.consent';

/** Adapter tối thiểu (Web Speech API khác nhau theo trình duyệt — chỉ dùng phần chung). */
export interface Recognizer {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type Ctor = new () => Recognizer;

export const recognizerCtor = (): Ctor | null => {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: Ctor; webkitSpeechRecognition?: Ctor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

const errorOf = (e: string): Extract<DictationState, { kind: 'error' }>['reason'] =>
  e === 'not-allowed' || e === 'service-not-allowed' ? 'denied' : e === 'no-speech' ? 'no_speech' : e === 'network' ? 'network' : 'failed';

const consented = () => {
  try {
    return localStorage.getItem(CONSENT_KEY) === '1';
  } catch {
    return false;
  }
};

export interface DraftAccess {
  /** Bản nháp + phiên bản (tăng mỗi lần sửa) + con trỏ hiện tại. */
  read: () => { text: string; rev: number; caret: number };
  write: (text: string) => void;
}

/** `scope` đổi (workspace / phiên / chế độ) → huỷ nghe + bỏ bản xem lại. */
export function useAssistantDictation(locale: string, draft: DraftAccess, scope: string) {
  const [state, setState] = useState<DictationState>({ kind: 'idle' });
  const rec = useRef<Recognizer | null>(null);
  const gen = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const anchor = useRef<{ rev: number; caret: number } | null>(null);
  const final = useRef('');

  const halt = useCallback((next: DictationState) => {
    gen.current++;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const r = rec.current;
    rec.current = null;
    if (r) {
      r.onresult = r.onerror = r.onend = null;
      try {
        r.abort();
      } catch {
        /* trình duyệt đã dừng */
      }
    }
    setState(next);
  }, []);

  useEffect(() => () => halt({ kind: 'idle' }), [halt]);
  // Đổi workspace / phiên / chế độ: huỷ nghe + bỏ bản xem lại (cleanup của phạm vi cũ — không setState đồng bộ trong effect).
  useEffect(() => () => halt({ kind: 'idle' }), [scope, halt]);
  useEffect(() => {
    const off = () => document.visibilityState === 'hidden' && rec.current && halt({ kind: 'idle' });
    document.addEventListener('visibilitychange', off);
    return () => document.removeEventListener('visibilitychange', off);
  }, [halt]);

  const listen = useCallback(() => {
    const C = recognizerCtor();
    if (!C) return setState({ kind: 'error', reason: 'unsupported' });
    halt({ kind: 'listening', interim: '' });
    const my = gen.current;
    const d = draft.read();
    anchor.current = { rev: d.rev, caret: d.caret };
    final.current = '';
    const r = new C();
    rec.current = r;
    r.lang = locale === 'en' ? 'en-US' : 'vi-VN';
    r.interimResults = true;
    r.continuous = true;
    r.onresult = (e) => {
      if (gen.current !== my) return;
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const x = e.results[i]!;
        if (x.isFinal) final.current += x[0].transcript;
        else interim += x[0].transcript;
      }
      setState({ kind: 'listening', interim: `${final.current}${interim}` });
    };
    r.onerror = (e) => gen.current === my && halt({ kind: 'error', reason: errorOf(e.error) });
    r.onend = () => {
      if (gen.current !== my) return;
      const text = final.current.trim();
      halt(text ? { kind: 'review', text } : { kind: 'error', reason: 'no_speech' });
    };
    timer.current = setTimeout(() => gen.current === my && rec.current?.stop(), DICTATION_MAX_MS);
    try {
      r.start();
    } catch {
      halt({ kind: 'error', reason: 'failed' });
    }
  }, [draft, halt, locale]);

  return {
    state,
    supported: !!recognizerCtor(),
    /** Bấm mic: lần đầu hiện thông báo quyền riêng tư, đã đồng ý → nghe. Không tự bắt đầu lại sau khi bị từ chối. */
    start: () => (consented() ? listen() : setState({ kind: 'consent' })),
    accept: () => {
      try {
        localStorage.setItem(CONSENT_KEY, '1');
      } catch {
        /* không lưu được → hỏi lại lần sau */
      }
      listen();
    },
    /** Dừng nghe: phần đã nhận (cuối) vào bản xem lại. */
    stop: () => rec.current?.stop(),
    cancel: () => halt({ kind: 'idle' }),
    edit: (text: string) => setState((s) => (s.kind === 'review' ? { kind: 'review', text } : s)),
    /** Bản nháp chưa đổi từ lúc bắt đầu nghe → chèn tại con trỏ đã ghi; đã đổi → false (UI hỏi ghép). */
    canInsertAtCaret: () => !!anchor.current && draft.read().rev === anchor.current.rev,
    insert: (how: 'caret' | 'end' | 'replace') => {
      if (state.kind !== 'review') return;
      const cur = draft.read().text;
      const at = how === 'caret' && anchor.current ? Math.min(anchor.current.caret, cur.length) : cur.length;
      const sep = (a: string, b: string) => (a && b && !/\s$/.test(a) && !/^\s/.test(b) ? ' ' : '');
      const next = how === 'replace' ? state.text : `${cur.slice(0, at)}${sep(cur.slice(0, at), state.text)}${state.text}${sep(state.text, cur.slice(at))}${cur.slice(at)}`;
      draft.write(next);
      halt({ kind: 'idle' });
    },
  };
}
