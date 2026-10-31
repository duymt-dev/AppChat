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
    quote_sent: 'Sent quote {code} (version {version}) · {total}',
    quote_viewed: 'Customer opened quote {code}',
    quote_accepted: 'Customer accepted quote {code}',
    quote_rejected: 'Customer declined quote {code}',
    quote_expired: 'Quote {code} expired',
    contract_sent: 'Sent contract {code} for signature · {value}',
    contract_signed: 'Customer signed contract {code}',
    contract_declined: 'Contract {code} was not signed',
    contract_terminated: 'Contract {code} terminated: {reason}',
    contract_expired: 'Contract {code} ended',
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
