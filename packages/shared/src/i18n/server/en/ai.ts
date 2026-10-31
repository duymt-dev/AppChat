// Server-side AI strings (TIP-021) — English.
import type { ai as vi } from '../vi/ai';

export const ai: typeof vi = {
  agent: { unnamed: 'New agent', copy: '{name} (copy)', assistant: 'AI Assistant' },
  handoff: {
    needs_human: 'AI needs a human: {detail}',
    asked_human: 'Customer asked for a staff member',
    banned_word: 'Hit an AI Governance banned keyword',
    complaint: 'Customer unhappy / complaining — needs a human',
    repeated: 'Customer asked the same question 3 times',
    low_confidence: 'AI not confident enough ({pct}% < threshold {threshold}%)',
    no_reply: 'AI could not draft a reply',
    unreadable: 'AI reply in the wrong format',
    error: 'AI failed to reply ({detail})',
    credit: 'Out of AI credits — needs a human reply',
    transfer_loop: 'Bounced between agents — needs a human',
    approval_rejected: 'The approver rejected the AI action',
  },
  approval: {
    title: '{action}',
    summary: '{agent} asks to run "{action}"',
    reason: {
      send: 'Sends outside — needs approval before sending',
      money: 'Money operation — always needs a human approval',
      delete: 'Deletes data — always needs a human approval',
      write: 'Agent confidence too low — needs approval',
      read: 'Needs approval',
      config: 'Changes configuration — needs approval',
    },
    rejected: 'The approver rejected this action',
    expired: 'Approval expired',
  },
};
