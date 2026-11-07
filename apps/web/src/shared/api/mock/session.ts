// Phiên đăng nhập giả: đã đăng nhập / đã khai báo / đã xem chào mừng / số ngày trial.
// Lưu localStorage (như prototype ac_authed / ac_declared / ac_trialseen / ac_trialdays) để reload giữ trạng thái.
export interface MockSession {
  authed: boolean;
  declared: boolean;
  trialSeen: boolean;
  expiredSeen: boolean;
  trialDaysLeft: number;
  provisioned: boolean;
  /** TIP-041: DB tenant đã lưu trữ / đang khôi phục (seed `archived`). */
  lifecycle?: 'archived' | 'restoring' | null;
  /** Danh sách dày ~120 dòng (bulk.ts) — chỉ khi seed `?session=…,bulk`. */
  bulk?: boolean;
}

const KEY = 'ac_mock_session';

const DEFAULT: MockSession = {
  authed: false,
  declared: false,
  trialSeen: false,
  expiredSeen: false,
  trialDaysLeft: 15,
  provisioned: false,
};

/** Seed đọc từ ?session=… (e2e / parity): authed,declared,trialSeen,expired,provisioned,bulk,archived */
const fromQuery = (): Partial<MockSession> | null => {
  const q = new URLSearchParams(window.location.search).get('session');
  if (q === null) return null;
  const f = new Set(q.split(','));
  return {
    authed: f.has('authed'),
    declared: f.has('declared'),
    trialSeen: f.has('trialSeen'),
    expiredSeen: false,
    trialDaysLeft: f.has('expired') ? 0 : 15,
    provisioned: f.has('declared') || f.has('provisioned'),
    bulk: f.has('bulk'),
    lifecycle: f.has('archived') ? 'archived' : null,
  };
};

export const loadSession = (): MockSession => {
  if (typeof window === 'undefined') return { ...DEFAULT, authed: true, declared: true, trialSeen: true, provisioned: true };
  const seeded = fromQuery();
  try {
    if (seeded) {
      const s = { ...DEFAULT, ...seeded };
      window.localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }
    const raw = window.localStorage.getItem(KEY);
    // Chưa có phiên: mặc định vào thẳng app (dev / parity shell); đăng xuất để xem luồng auth.
    return raw ? { ...DEFAULT, ...(JSON.parse(raw) as Partial<MockSession>) } : { ...DEFAULT, authed: true, declared: true, trialSeen: true, provisioned: true };
  } catch {
    return { ...DEFAULT, authed: true, declared: true, trialSeen: true, provisioned: true };
  }
};

export const saveSession = (s: MockSession) => {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* localStorage bị chặn — phiên chỉ giữ trong bộ nhớ */
  }
};
