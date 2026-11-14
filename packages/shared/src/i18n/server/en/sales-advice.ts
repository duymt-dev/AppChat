// Server-built stock / price / alternative clauses sent to customers (TIP-022c §3.5): stock, price and checked time always come from the
// current observation, never from model text. "In stock" is as of the check only — nothing is reserved, no delivery date. Merged into `sales.advice`.
export const salesAdvice = {
  available: '{name}: in stock for {qty} {unit} (checked at {time}) — {price}/{unit}. Not reserved for you yet.',
  shortage: '{name}: not enough for {qty} {unit} right now (checked at {time}).',
  shortageCombo: '{name}: some components are not enough for {qty} {unit} right now (checked at {time}).',
  unknown: '{name}: I could not check stock right now — a staff member will confirm for you.',
  notTracked: '{name} is a {type}, not stock-tracked — {price}/{unit}. Scheduling / timing needs a separate confirmation.',
  alternativesHead: 'You may consider:',
  alternative: '- {name} — {price}/{unit}, in stock (checked at {time})',
  noAlternative: 'I could not find a verified in-stock alternative — tell me more about what you need and I will look again.',
  types: { service: 'service', package: 'package', digital: 'digital product', rental: 'rental', combo: 'combo' },
};
