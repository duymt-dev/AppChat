// Server-side notification text — English. `{x}` params are replaced with escaped values when rendering email.
import type { notify as vi } from '../vi/notify';

type Shape<T> = { [K in keyof T]: T[K] extends string ? string : Shape<T[K]> };

export const notify: Shape<typeof vi> = {
  kind: {
    msg_assigned: { title: 'New conversation assigned to you: {contact}', label: 'New message assigned to me' },
    msg_mention: { title: '{actor} mentioned you in the conversation with {contact}', label: 'Mentioned in a conversation' },
    msg_vip: { title: 'New message from priority customer {contact}', label: 'Message from a VIP / priority customer' },
    sla_warn: { title: '{count} tickets are about to breach SLA', label: 'SLA about to be breached' },
    ai_review: { title: '{agent} needs your approval before sending', label: 'AI needs approval before sending' },
    ai_escalate: { title: '{agent} handed the conversation with {contact} to a human', label: 'AI handed off to a human' },
    ai_budget: { title: 'AI has used {percent}% of the credit budget', label: 'AI over budget' },
    channel_down: { title: 'Channel {channel} was disconnected', label: 'Channel disconnected' },
    billing_invoice: { title: 'New plan invoice {code}', label: 'Plan & wallet — new invoice' },
  },
  mail: {
    subject: '[{workspace}] {title}',
    open: 'Open in AppChat',
    footer: 'You received this email because email is on for "{label}". Change it in Settings › Notifications.',
  },
};
