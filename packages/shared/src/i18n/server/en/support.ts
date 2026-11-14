// Ticket strings on the server — English: rule-based AI hints on the Tickets page, CSAT survey on close, close reasons for the customer
// timeline, the "AI self-serve" team label.
export const support = {
  ai: {
    overdue: "Summarise today's overdue tickets",
    overdueHint: '{breach} tickets breached SLA + {risk} due soon · suggested priorities',
    route: 'Triage & route the backlog',
    routeHint: '{n} tickets without an assignee · assign by category & priority',
    report: "This week's SLA report",
    reportHint: '{met}% within SLA · {ai} tickets handled by AI · {breach} breaches',
  },
  csat: 'Hi {name}, your request {code} has been resolved. Please rate your satisfaction from 1 to 5 (5 = very satisfied) by replying with a number. Thank you!',
  reason: { resolved: 'resolved', duplicate: 'duplicate', withdrawn: 'withdrawn by customer', out_of_scope: 'out of scope' },
  teamAi: 'AI self-serve',  // TIP-034b: ticket category suggestion export (headers match the import aliases).
  categories: { sheet: 'Ticket categories', file: 'ticket-categories', position: 'Position', label: 'Category' },
  // TIP-034c §4.4: ticket bulk result file (export-only 038b dataset).
  bulkResults: { sheet: 'Bulk results', file: 'ticket-bulk-results', note: 'Per-ticket results of one bulk change — ids only, no ticket content', cols: { ticket_id: 'Ticket ID', outcome: 'Outcome', error_code: 'Error code', changed: 'Changed', undo_state: 'Undo' } },
};
