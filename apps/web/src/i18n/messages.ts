// Gộp messages/<locale>/<module>.json; key thiếu ở locale đích lấy theo chuỗi fallback (… → en → vi).
import { fallbackChain } from '@appchat/shared';

export const MODULES = ['common', 'shell', 'actions', 'errors', 'dev', 'auth', 'onboarding', 'dashboard', 'inbox'] as const;

type Messages = Record<string, unknown>;

const isObj = (v: unknown): v is Messages => typeof v === 'object' && v !== null && !Array.isArray(v);

export const deepMerge = (base: Messages, over: Messages): Messages => {
  const out: Messages = { ...base };
  for (const [k, v] of Object.entries(over)) out[k] = isObj(v) && isObj(out[k]) ? deepMerge(out[k] as Messages, v) : v;
  return out;
};

const loadLocale = async (locale: string): Promise<Messages> => {
  const parts = await Promise.all(
    MODULES.map(async (m) => {
      try {
        const mod = (await import(`../../messages/${locale}/${m}.json`)) as { default: Messages };
        return [m, mod.default] as const;
      } catch {
        return [m, {}] as const;
      }
    }),
  );
  return Object.fromEntries(parts);
};

export const loadMessages = async (locale: string): Promise<Messages> => {
  const chain = fallbackChain(locale).reverse();
  let merged: Messages = {};
  for (const l of chain) merged = deepMerge(merged, await loadLocale(l));
  return merged;
};
