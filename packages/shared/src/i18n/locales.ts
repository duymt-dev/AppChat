// Registry ngôn ngữ (Blueprint §7.4). Thêm ngôn ngữ = thêm bản dịch + bật enabled; không sửa code.
export interface LocaleDef {
  code: string;
  nativeName: string;
  flag: string;
  antd: string;
  dayjs: string;
  intl: string;
  dir: 'ltr' | 'rtl';
  enabled: boolean;
}

export const LOCALES: readonly LocaleDef[] = [
  { code: 'vi', nativeName: 'Tiếng Việt (Việt Nam)', flag: 'vn', antd: 'vi_VN', dayjs: 'vi', intl: 'vi-VN', dir: 'ltr', enabled: true },
  { code: 'en', nativeName: 'English (United States)', flag: 'us', antd: 'en_US', dayjs: 'en', intl: 'en-US', dir: 'ltr', enabled: true },
  { code: 'zh-CN', nativeName: '简体中文（中国）', flag: 'cn', antd: 'zh_CN', dayjs: 'zh-cn', intl: 'zh-CN', dir: 'ltr', enabled: false },
  { code: 'zh-HK', nativeName: '中文（香港）', flag: 'hk', antd: 'zh_HK', dayjs: 'zh-hk', intl: 'zh-HK', dir: 'ltr', enabled: false },
  { code: 'zh-TW', nativeName: '中文（繁體）', flag: 'tw', antd: 'zh_TW', dayjs: 'zh-tw', intl: 'zh-TW', dir: 'ltr', enabled: false },
  { code: 'ja', nativeName: '日本語（日本）', flag: 'jp', antd: 'ja_JP', dayjs: 'ja', intl: 'ja-JP', dir: 'ltr', enabled: false },
  { code: 'ko', nativeName: '한국어（대한민국）', flag: 'kr', antd: 'ko_KR', dayjs: 'ko', intl: 'ko-KR', dir: 'ltr', enabled: false },
  { code: 'th', nativeName: 'ภาษาไทย (ไทย)', flag: 'th', antd: 'th_TH', dayjs: 'th', intl: 'th-TH', dir: 'ltr', enabled: false },
  { code: 'ms', nativeName: 'Bahasa Melayu (Malaysia)', flag: 'my', antd: 'ms_MY', dayjs: 'ms', intl: 'ms-MY', dir: 'ltr', enabled: false },
  { code: 'id', nativeName: 'Indonesia (Indonesia)', flag: 'id', antd: 'id_ID', dayjs: 'id', intl: 'id-ID', dir: 'ltr', enabled: false },
  { code: 'fil', nativeName: 'Filipino (Philippines)', flag: 'ph', antd: 'en_US', dayjs: 'en', intl: 'fil-PH', dir: 'ltr', enabled: false },
];

export const DEFAULT_LOCALE = 'vi';
export const ENABLED_LOCALES: readonly string[] = LOCALES.filter((l) => l.enabled).map((l) => l.code);

export const localeDef = (code: string): LocaleDef =>
  LOCALES.find((l) => l.code === code) ?? (LOCALES[0] as LocaleDef);

/** Chuỗi fallback: zh-HK → zh-TW → en → vi; ngôn ngữ khác → en → vi. */
export const fallbackChain = (code: string): string[] => {
  const chain = code === 'zh-HK' ? ['zh-HK', 'zh-TW', 'en', 'vi'] : [code, 'en', 'vi'];
  return [...new Set(chain)];
};

/** user.locale → workspace.locale → Accept-Language → vi; chỉ trả ngôn ngữ đã bật. */
export const resolveLocale = (...candidates: (string | null | undefined)[]): string => {
  for (const c of candidates) {
    if (!c) continue;
    const exact = ENABLED_LOCALES.find((l) => l.toLowerCase() === c.toLowerCase());
    if (exact) return exact;
    const base = ENABLED_LOCALES.find((l) => l === c.split('-')[0]?.toLowerCase());
    if (base) return base;
  }
  return DEFAULT_LOCALE;
};
