// Token DI của domain identity (provider dựng ở identity.module.ts từ env).
export const IDENTITY_ENV = Symbol('IDENTITY_ENV');
export const MAIL_PROVIDER = Symbol('MAIL_PROVIDER');
export const TAX_LOOKUP = Symbol('TAX_LOOKUP');
export const RATE_LIMITER = Symbol('RATE_LIMITER');
export const TENANT_PROVISION_QUEUE = Symbol('TENANT_PROVISION_QUEUE');
