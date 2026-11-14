// Server-side autonomous task strings — English.
import type { tasks as vi } from '../vi/tasks';

export const tasks: typeof vi = {
  template: {
    follow_up: { label: 'Follow up silent customers', name: 'Follow up silent customers', goal: 'Find customers with no interaction for {days} days, write a short check-in based on each history and send it in their latest conversation.' },
    stale_quote: { label: 'Chase pending quotes', name: 'Chase pending quotes', goal: 'Find quotes sent more than {days} days ago with no reply, remind the customer and ask whether anything needs adjusting.' },
    appointment_reminder: { label: 'Appointment reminders', name: 'Appointment reminders for tomorrow', goal: 'Remind customers with an appointment in the next {hours} hours: time, service, staff; ask them to confirm or reschedule.' },
    aftercare: { label: 'After-sale care', name: 'After-sale care', goal: 'Check in with customers whose order completed {days} days ago: experience, usage tips, any help needed.' },
    briefing: { label: 'Morning briefing', name: 'Morning briefing', goal: 'Every morning summarise what needs me: approval queue, conversations needing a person, the calendar for today, overdue tickets, low credits.' },
  },
  frame: {
    head: '# AUTONOMOUS TASK\nYou are running the task "{name}" on behalf of {user}. Do exactly the goal, use only the granted tools, never invent information. Finish with a short summary of what you did (who was messaged, who was skipped and why).',
    goal: 'Goal: {goal}',
    note: 'Extra instructions: {prompt}',
    targets: 'Items to handle this run ({n}):',
    none: 'Nothing to handle this run — reply "Nothing to do".',
    event: 'Trigger event: {topic} · {payload}',
    send: 'Message customers with the send tool in the conversation noted on each item. At most one message per customer.',
  },
  target: {
    follow_up: '{name} · silent since {date} · conversation {conversation}',
    stale_quote: '{name} · quote {code} ({total}) sent {date} · conversation {conversation}',
    appointment_reminder: '{name} · appointment {date} · booking {code} · conversation {conversation}',
    aftercare: '{name} · order {code} completed {date} · conversation {conversation}',
  },
  briefing: {
    title: 'Morning briefing {date}',
    approvals: '{n} items waiting for your approval',
    conversations: '{n} conversations need a person',
    appointments: '{n} appointments today',
    firstAppt: 'first at {time} · {name}',
    tickets: '{n} tickets past SLA',
    credits: '{n} AI credits left',
    creditsLow: '{n} AI credits left — running low, consider topping up',
    clear: 'Nothing urgent needs you today.',
    summary: '{approvals} approvals · {conversations} conversations · {appointments} appointments · {tickets} overdue tickets',
  },
  report: {
    title: 'Result of task "{name}"',
    done: 'Finished ({credits} credits).',
    waiting: 'Waiting for you to approve an action before continuing.',
    failed: 'Did not finish: {reason}',
  },
  reason: {
    agent: 'the assigned agent is no longer running',
    commander: 'the task creator no longer has access',
    credit: 'out of AI credits',
    error: 'the AI hit an error',
  },
  log: {
    completed: 'Finished',
    waiting_approval: 'Waiting for approval',
    failed: 'Failed',
    cancelled: 'Stopped',
    running: 'Running',
    queued: 'Queued',
    handoff: 'Handed to a person',
  },
  defaultPrompt: 'Do exactly the goal in a polite tone. When unsure, skip and note it in the summary.',
  channelInternal: 'Internal',
};
