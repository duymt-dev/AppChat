// Khai báo doanh nghiệp / cá nhân (REQ-A02, Blueprint §2.2 business_profile, §3.4 `business_profile.update`).
import { z } from 'zod';
import { defineAction } from './define';

export const businessProfileUpdate = defineAction({
  id: 'business_profile.update',
  module: 'settings',
  title: 'actions.business_profile.update.title',
  description:
    'Declare or update the workspace business profile (popup after sign-up, mandatory). ' +
    'Example: {"kind":"enterprise","tax_code":"0312345678","legal_name":"CÔNG TY TNHH A","address":"…","business_description":"Spa"}',
  input: z
    .object({
      kind: z.enum(['enterprise', 'household', 'individual']),
      tax_code: z.string().regex(/^\d{10}(\d{3})?$/).optional(),
      national_id: z.string().regex(/^\d{12}$/).optional(),
      legal_name: z.string().min(1).max(255),
      address: z.string().min(1).max(500),
      representative: z.string().max(120).optional(),
      phone: z.string().max(20).optional(),
      founded_on: z.string().max(20).optional(),
      legal_status: z.string().max(60).optional(),
      business_description: z.string().min(1).max(1000),
    })
    .refine((v) => (v.kind === 'individual' ? !!v.national_id : !!v.tax_code), { path: ['tax_code'] }),
  output: z.object({ workspace_id: z.string(), declared_at: z.string() }),
  permission: 'settings.manage',
  risk: 'config',
  agentGrantable: false,
  invalidates: ['me', 'settings'],
  db: 'platform',
});
