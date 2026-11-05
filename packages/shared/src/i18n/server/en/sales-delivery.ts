// Customer-facing document delivery (TIP-032b P2): order confirmation, receipt, public link. Merged into `sales.delivery`.
export const salesDelivery = {
  orderMessage: 'Dear {customer}, {business} confirms order {code}: total {total}, paid {paid}, left {left}. Details attached.',
  receiptMessage: 'Dear {customer}, {business} sends receipt {code}: received {amount} for {invoice}. Thank you!',
  link: 'View / download: {link}',
  orderPdfName: 'Order-confirmation-{code}.pdf',
  order: {
    title: 'ORDER CONFIRMATION {code}',
    date: 'Date',
    customer: 'Customer',
    item: 'Item',
    qty: 'Qty',
    price: 'Unit price',
    amount: 'Amount',
    discount: 'Discount',
    tax: 'Tax',
    total: 'Total',
    paid: 'Paid',
    left: 'Left',
    payStatus: 'Payment status',
    pay: { unpaid: 'Unpaid', awaiting_deposit: 'Awaiting deposit', deposited: 'Deposit paid', partial: 'Partially paid', paid: 'Paid', refunded: 'Refunded', partially_refunded: 'Partially refunded' },
    notVat: 'This order confirmation does not replace a VAT invoice.',
  },
};
