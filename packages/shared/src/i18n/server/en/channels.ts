// Server-side channel strings — English.
import type { channels as vi } from '../vi/channels';

export const channels: typeof vi = {
  name: { zalo_personal: 'Personal Zalo', email: 'Email', webchat: 'Website Chat' },
  test: {
    ok: 'Connection is working',
    paused: 'Account is paused',
    connecting: 'Waiting for the QR code to be scanned',
    expired: 'Login session expired — reconnect to scan a new code',
    error: 'Session lost — reconnecting',
    disconnected: 'Account is disconnected',
  },
  defaults: { hours: '08:00–18:00', sla: 'Default' },
  widget: {
    name: 'AppChat Assistant',
    greeting: 'Hi there 👋 How can we help you?',
    account: 'Website Chat',
    guest: 'Web visitor',
  },
};
