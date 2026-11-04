// Token env của tiến trình (KernelModule.forRoot cung cấp) — file riêng để module con (metrics…) inject mà không import ngược kernel.module.
export const ENV_SOURCE = Symbol('ENV_SOURCE');
