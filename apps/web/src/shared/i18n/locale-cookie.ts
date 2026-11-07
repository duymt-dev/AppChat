// Cookie NEXT_LOCALE — nguồn locale trước khi đăng nhập / khi chưa có user.locale (Blueprint §7.4).
export const LOCALE_COOKIE = 'NEXT_LOCALE';

export const writeLocaleCookie = (code: string) => {
  document.cookie = `${LOCALE_COOKIE}=${code}; path=/; max-age=31536000; samesite=lax`;
};
