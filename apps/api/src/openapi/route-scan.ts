// Quét route thật của app Nest (TIP-003d): mọi controller đã đăng ký qua DiscoveryService → method + path (đã ghép prefix `/v1`, trừ
// `/hooks/*`, `/widget.js`, `/metrics` như prefix.ts) + tag theo nhóm route. Không dùng @nestjs/swagger (ngoài stack). Route nội bộ
// (`/metrics`, `/docs*`) và webhook nhà cung cấp `/hooks/*` không đưa vào spec công khai (ops §3 — không lộ bề mặt nội bộ / bí mật).
import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import type { DiscoveryService } from '@nestjs/core';

export interface ScannedRoute {
  method: 'get' | 'post' | 'put' | 'patch' | 'delete';
  /** Path OpenAPI (`/v1/contacts/{id}`). */
  path: string;
  tag: string;
  controller: string;
  handler: string;
}

const METHODS: Partial<Record<RequestMethod, ScannedRoute['method']>> = {
  [RequestMethod.GET]: 'get',
  [RequestMethod.POST]: 'post',
  [RequestMethod.PUT]: 'put',
  [RequestMethod.PATCH]: 'patch',
  [RequestMethod.DELETE]: 'delete',
};
/** Ngoài tiền tố `/v1` (prefix.ts). */
const UNPREFIXED = /^\/(hooks\/|widget\.js$|metrics$)/;
/** Không công khai trong spec: webhook nhà cung cấp, Prometheus nội bộ, chính tài liệu. */
const HIDDEN = /^\/(hooks\/|metrics$|v1\/docs(\/|$))/;

const join = (...parts: string[]) => `/${parts.map((p) => p.replace(/^\/+|\/+$/g, '')).filter(Boolean).join('/')}`;
/** `:id` → `{id}`; `{*path}` (wildcard Nest 11+) giữ tên. */
export const toOpenApiPath = (p: string) => p.replace(/\{\*([A-Za-z_]\w*)\}/g, '{$1}').replace(/:([A-Za-z_]\w*)/g, '{$1}');

/** Tag = đoạn đầu sau `/v1` (`/v1/contacts/{id}` → `contacts`) — ổn định, khớp nhóm route FE gọi. */
const tagOf = (path: string) => path.replace(/^\/v1/, '').split('/')[1] || 'root';

export function scanRoutes(discovery: Pick<DiscoveryService, 'getControllers'>): ScannedRoute[] {
  const out: ScannedRoute[] = [];
  for (const w of discovery.getControllers()) {
    const type = w.metatype as (new (...a: unknown[]) => object) | null;
    if (!type?.prototype) continue;
    const base = [Reflect.getMetadata(PATH_METADATA, type) ?? ''].flat() as string[];
    const proto = type.prototype as object;
    for (const key of Object.getOwnPropertyNames(proto)) {
      // Đọc qua descriptor: getter trên prototype (vd. `secure` của AuthController) không được gọi khi quét.
      const fn = Object.getOwnPropertyDescriptor(proto, key)?.value as unknown;
      if (key === 'constructor' || typeof fn !== 'function') continue;
      const verb = Reflect.getMetadata(METHOD_METADATA, fn) as RequestMethod | undefined;
      const sub = Reflect.getMetadata(PATH_METADATA, fn) as string | string[] | undefined;
      const method = verb === undefined ? undefined : METHODS[verb];
      if (!method || sub === undefined) continue;
      for (const b of base) {
        for (const s of [sub].flat()) {
          const raw = join(b, s);
          const full = UNPREFIXED.test(raw) ? raw : join('v1', raw);
          if (HIDDEN.test(full)) continue;
          const path = toOpenApiPath(full);
          out.push({ method, path, tag: tagOf(path), controller: type.name, handler: key });
        }
      }
    }
  }
  return out.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
}
