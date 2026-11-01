// Server-side notification text — English. `{x}` params are replaced with escaped values when rendering email.
import type { notify as vi } from '../vi/notify';

type Shape<T> = { [K in keyof T]: T[K] extends string ? string : Shape<T[K]> };

export const notify: Shape<typeof vi> = {
  kind: {
    msg_assigned: { title: 'New conversation assigned to you: {contact}', label: 'New message assigned to me' },
    msg_mention: { title: '{actor} mentioned you in the conversation with {contact}', label: 'Mentioned in a conversation' },
    msg_vip: { title: 'New message from priority customer {contact}', label: 'Message from a VIP / priority customer' },
    crm_owner: { title: '{actor} assigned customer {contact} to you', label: 'Customer assigned to me' },
    crm_access: {
      title: '{actor} asked to co-own customer {contact}',
      approved: '{actor} approved your request to co-own customer {contact}',
      rejected: '{actor} declined your request to share customer {contact}',
      label: 'Customer share requests / decisions',
    },
    quote_approval: { title: '{actor} submitted quote {code} · {contact} for approval', label: 'Quotes waiting for my approval' },
    quote_expiring: { title: 'Quote {code} · {contact} expires in {n} days', label: 'Quotes about to expire' },
    contract_approval: { title: '{actor} submitted contract {code} · {contact} for approval', label: 'Contracts waiting for my approval & signature' },
    contract_signed: { title: '{contact} signed contract {code}', label: 'Customer signed a contract' },
    contract_declined: { title: 'Contract {code} · {contact} was not signed: {reason}', label: 'Customer declined / signing link expired' },
    contract_expiring: { title: 'Contract {code} · {contact} ends in {n} days — offer a renewal', label: 'Contracts about to end' },
    payment_received: { title: '{contact} paid {amount} for {code}', label: 'Customer paid my payment request' },
    refund_approval: {
      title: '{actor} requested a refund of {amount} · {contact}',
      approved: '{actor} approved the refund of {amount} · {contact}',
      rejected: '{actor} rejected the refund of {amount} · {contact}',
      label: 'Refunds waiting for me / decisions',
    },
    bank_review: { title: 'Transaction {amount} needs reconciliation', label: 'Bank transactions to reconcile' },
    sla_warn: { title: '{count} tickets are about to breach SLA', label: 'SLA about to be breached' },
    sla_breach: { title: 'Ticket {code} breached its SLA: {title}', label: 'Ticket breached SLA (escalation)' },
    ticket_assigned: { title: 'Ticket {code} was assigned to you: {title}', label: 'Ticket assigned to me' },
    ai_review: { title: '{agent} needs your approval before sending', label: 'AI needs approval before sending' },
    ai_escalate: { title: '{agent} handed the conversation with {contact} to a human', label: 'AI handed off to a human' },
    ai_budget: { title: 'AI has used {percent}% of the credit budget', label: 'AI over budget' },
    ai_briefing: { title: 'Morning briefing: {summary}', label: 'AI Assistant morning briefing' },
    ai_task_failed: { title: 'Task "{name}" did not finish: {reason}', label: 'Autonomous task failed' },
    channel_down: { title: 'Channel {channel} was disconnected', label: 'Channel disconnected' },
    billing_invoice: { title: 'New plan invoice {code}', label: 'Plan & wallet — new invoice' },
  },
  mail: {
    subject: '[{workspace}] {title}',
    open: 'Open in AppChat',
    footer: 'You received this email because email is on for "{label}". Change it in Settings › Notifications.',
  },
};
