// Token DI của domain channels — tách khỏi channels.module.ts để handler / job import không vòng về module.
/** Registry kênh có adapter (worker giữ phiên + gửi) — transport theo env (Zalo / email thật / giả; webchat qua redis-emitter). */
export const CHANNEL_REGISTRY = Symbol('CHANNEL_REGISTRY');
/** URL mã nhúng widget (WIDGET_API_URL / WIDGET_SCRIPT_URL). */
export const WIDGET_URLS = Symbol('WIDGET_URLS');
