// Server-side catalog texts — English.
import type { catalog as vi } from '../vi/catalog';

type Shape<T> = { [K in keyof T]: T[K] extends string ? string : Shape<T[K]> };

export const catalog: Shape<typeof vi> = {
  activity: {
    create: 'Product created',
    update: 'Product details updated',
    price: 'Price changed: {from} → {to}',
    archive: 'Product archived',
    restore: 'Product restored',
    import: 'Opening stock: {qty}',
    adjust: 'Stock adjusted {delta} · {reason}',
    sale: 'Shipped for an order: {delta}',
    return: 'Returned from an order: {delta}',
    undo: 'Stock adjustment undone: {delta}',
    system: 'System',
  },
  label: { duration: 'Duration: {n}′', sessions: 'Sessions: {n}', valid: 'Valid: {n} days', parts: 'Includes: {n} items', deposit: 'Deposit: {money}' },
  type: { physical: 'Physical product', service: 'Service', combo: 'Combo', package: 'Package / course', digital: 'Digital product', rental: 'Rental' },
  rental: { hour: 'hour', day: 'day', week: 'week', month: 'month' },
  rag: {
    title: 'Product: {name} ({code})',
    type: 'Type: {type}',
    category: 'Category: {category}',
    unit: 'Unit: {unit}',
    duration: 'Duration: {n} minutes',
    sessions: 'Sessions: {n}',
    valid: 'Valid for: {n} days',
    rental: 'Rented per {unit}',
    parts: 'Includes: {list}',
    attrs: 'Options {name}: {values}',
    desc: 'Description: {text}',
    note: 'Prices and stock are always looked up in the product catalog, never taken from this document.',
  },
};
