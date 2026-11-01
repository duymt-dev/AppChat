// Shape đọc phiên / onboarding / `/me` (FE ↔ BE — gap-filling §5, TIP-011): `GET /v1/session`, `GET /v1/me`, `GET /v1/auth/brand`,
// `GET /v1/workspace/provisioning`. Mock transport (apps/web) và API thật parse cùng các schema này.
import { z } from 'zod';

export const sessionSchema = z.object({
  authed: z.boolean(),
  declared: z.boolean(),
  trialSeen: z.boolean(),
  expiredSeen: z.boolean(),
  trialDaysLeft: z.number().int().min(0),
  provisioned: z.boolean(),
  /** Mốc hết trial (ms epoch); 0 khi không có trial. */
  trialEndsAt: z.number(),
  /** Workspace đang dùng (http transport gắn X-Workspace-Id) — mock không có. */
  workspace_id: z.string().nullable().optional(),
});
export type SessionDto = z.infer<typeof sessionSchema>;

export const provisioningSchema = z.object({ status: z.enum(['running', 'ready', 'failed']) });

export const authBrandSchema = z.object({
  card: z.object({ initials: z.string(), name: z.string(), meta: z.string(), tag: z.string(), message: z.string(), ai: z.string() }),
  stats: z.array(z.object({ v: z.string(), l: z.string() })),
});

export const meSchema = z.object({
  user: z.object({
    id: z.string(),
    name: z.string(),
    initial: z.string(),
    phone: z.string(),
    /** Tên vai trò ở workspace đang dùng. */
    title: z.string(),
    locale: z.string(),
    email: z.string(),
  }),
  workspaces: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      initial: z.string(),
      kind: z.enum(['personal', 'team', 'business']),
      plan: z.string(),
      color: z.string(),
    }),
  ),
  current_workspace_id: z.string().nullable(),
  billing: z.object({ trial_days_left: z.number(), paid_plan: z.string(), wallet_balance: z.string() }),
});
export type MeDto = z.infer<typeof meSchema>;
