// Server-side booking text — English: rule-based AI hints on the Calendar page, appointment reminders sent to customers (REQ-G04).
export const booking = {
  ai: {
    confirm: 'Call pending customers to confirm',
    confirmHint: '{n} appointments awaiting confirmation · draft a Zalo reminder',
    gap: 'Fill today’s free slots',
    gapHint: 'Plenty of free slots · invite interested prospects',
  },
  remind: {
    h24: 'Hi {name}, {business} reminds you of your {service} appointment at {time} on {date} ({code}). Reply here if you need to reschedule or cancel.',
    h2: 'Hi {name}, your {service} appointment is in about 2 hours at {time} today ({code}). See you at {business}!',
  },
};
