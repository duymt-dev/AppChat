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
  overview: {
    earn: '{vnd}₫ = 1 point',
    mult: '{tier} × {m}',
    months: '{n} months',
    calc: { big_order: '+ 1,000 points', birthday: '+ 500 points', signup: '+ 200 points', referral: '+ 300 points', rating: '+ 100 points', package: '× 1.2 points' },
    exp: { m1: '1 month', m6: '6 months', m12: '12 months' },
  },
  tier: { member: 'Member', silver: 'Silver', gold: 'Gold', diamond: 'Diamond' },
};
