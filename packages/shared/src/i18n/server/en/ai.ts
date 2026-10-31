// Server-side AI strings (TIP-021) — English.
import type { ai as vi } from '../vi/ai';

export const ai: typeof vi = {
  agent: { unnamed: 'New agent', copy: '{name} (copy)', assistant: 'AI Assistant' },
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
