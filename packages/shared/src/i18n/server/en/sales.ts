// Server-side quote texts — English.
import type { sales as vi } from '../vi/sales';

type Shape<T> = { [K in keyof T]: T[K] extends string ? string : Shape<T[K]> };

export const sales: Shape<typeof vi> = {
  quote: {
    message: 'Dear {customer}, {business} sends you quote {code} (version {version}) — total {total}, valid until {valid_until}. View: {link}',
    extended: 'Quote {code} has been extended until {valid_until}. View: {link}',
    pdfName: 'Quote-{code}-v{version}.pdf',
    hint: {
      needApproval: 'Over threshold — submit for approval before sending',
      draft: 'Complete the lines & send to the customer',
      pending: 'Waiting for internal approval',
      approved: 'Approved — send it to the customer now',
      expiring: '{n} days left — remind the customer to decide',
      viewed: 'Customer opened it — call to close',
      sent: 'Follow up on the customer response',
      revision: 'Customer asked for changes — new version in progress',
      accepted: 'Won — convert to a contract / order',
      rejected: 'Record the reason, nurture later',
      expired: 'Expired — extend or create a new version',
    },
    runs: {
      sugg: '{count} open quotes worth {total}. Largest: {top}. Prioritise quotes the customer has already opened.',
      suggEmpty: 'No open quotes to suggest on yet.',
      followup: '{count} sent quotes have had no response for over 3 days{list}. Send a reminder with an offer valid for 48 hours.',
      followupEmpty: 'No quote has been waiting for over 3 days.',
      analyze: 'Close rate {rate} ({accepted}/{decided} decided quotes). Rejected: {rejected} · expired: {expired}. Many expiries means reminders should go out earlier.',
      analyzeEmpty: 'No decided quotes to analyse yet.',
    },
  },
};
