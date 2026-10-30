// Server-side crm texts — English.
import type { crm as vi } from '../vi/crm';

type Shape<T> = { [K in keyof T]: T[K] extends string ? string : Shape<T[K]> };

export const crm: Shape<typeof vi> = {
  timeline: {
    created: 'Customer created · source {source}',
    stage: 'Stage changed: {from} → {to}',
    owner: 'Owner changed to {to}',
    merge: 'Merged {count} duplicate profiles into this customer',
    note: 'Note: {body}',
    email: 'Email sent: {subject}',
  },
  stage: { lead: 'New lead', potential: 'Potential', consulting: 'Consulting', quote: 'Quoted', contract: 'Contract', won: 'Won', lost: 'Lost' },
  ai: { wait: 'Pending' },
  preview: {
    merge: 'Merge {count} duplicate groups',
    import: 'Import {count} rows: create {created}, duplicate {dup}, owned by others {owned}, invalid {invalid}',
  },
  export: { code: 'Code', name: 'Full name', phone: 'Phone', email: 'Email', stage: 'Stage', owner: 'Owner', city: 'City', source: 'Source', created: 'Created' },
  dup: { phone: 'Phone', email: 'Email', name: 'Full name' },
  copy: '{name} (copy)',
  system: 'System',
};
