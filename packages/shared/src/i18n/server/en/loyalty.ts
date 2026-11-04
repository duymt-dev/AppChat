// Server-side loyalty strings — English: member points ledger rows (TIP-036), preview text.
export const loyalty = {
  ledger: {
    earn: 'Points earned on order {code}',
    redeem: 'Points used to pay {code}',
    adjust: 'Points adjusted · {reason}',
    expire: 'Points expired',
    reverse: 'Points reversed for order {code}',
    restore: 'Points returned',
  },
  reasons: {
    missing_earn: 'Completed order was not credited',
    order_error: 'Order mistake correction',
    compensation: 'Service incident compensation',
    promotion: 'Special campaign reward',
    refund_reverse: 'Points recovered after refund',
    fraud: 'Points recovered (wrong grant / fraud)',
    other: 'Other reason',
  },
  tier: { member: 'Member', silver: 'Silver', gold: 'Gold', diamond: 'Diamond' },
};
