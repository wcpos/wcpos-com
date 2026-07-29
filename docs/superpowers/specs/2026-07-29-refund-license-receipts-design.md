# Refund licence cleanup and receipt details

**Date:** 2026-07-29
**Repositories:** `wcpos-medusa`, `wcpos-com`

## Goal

A completed full refund must revoke every licence issued by the order and
deactivate its attached sites. Directly suspended or revoked licences must also
have stale site activations removed. Customer order pages and PDF receipts must
show the refund state, amount, and date.

## Behaviour

- A full order refund:
  - records the refund transaction on the order;
  - deactivates every Keygen machine attached to the order's licences;
  - revokes those licences; and
  - presents the order as **Refunded**.
- A partial refund records and displays the refund but does not revoke a licence
  or deactivate its sites. The order presents as **Partially refunded**.
- A licence suspended or revoked directly in Keygen has its remaining machines
  removed by reconciliation within five minutes.
- The receipt keeps the original purchase total and adds one entry per refund,
  showing the negative refund amount and refund date.

## Architecture

### Refund processing (`wcpos-medusa`)

Add a dedicated `payment.refunded` subscriber for order and licence lifecycle
work. The existing email subscriber remains focused on notification delivery.

The new subscriber resolves the owning order and all refunds across its payment
collections. It stores a normalized snapshot in order metadata:

```ts
refunds: [
  {
    id: "ref_...",
    amount: 129,
    created_at: "2026-07-27T13:38:00.000Z"
  }
]
```

The snapshot is replaced from the authoritative payment relations on every
event, so event replay does not duplicate entries. It exists because the
customer-scoped Store API does not otherwise expose the nested refund records
needed by `wcpos-com`.

The subscriber sums the refund amounts. When the sum is at least the order
total, it extracts the licence IDs already stored in `order.metadata.licenses`.
For each licence it:

1. revokes the licence through Keygen's revoke action; then
2. lists and deletes every attached Keygen machine.

Revocation comes first so a transient machine-cleanup failure cannot leave a
refunded licence granting entitlement. Machine deletion uses the server's
Keygen admin token and remains available after revocation. Both operations
tolerate already-removed machines and already-revoked licences, making event
delivery safe to repeat.

Partial refunds stop after updating the refund snapshot.

### Suspended-licence reconciliation (`wcpos-medusa`)

Add a scheduled job that runs every five minutes. It uses the existing paged
Keygen licence and machine scans, selects licences whose canonical state is
suspended or revoked (`suspended`, `SUSPENDED`, or `BANNED` in Keygen data), and
deletes their machines.

The five-minute delay is an accepted risk: suspension already prevents licence
validation, so the remaining activation rows are temporarily stale display
data rather than continued entitlement. This avoids adding a new public,
signature-verified Keygen webhook endpoint and its deployment configuration.

### Customer order projection (`wcpos-com`)

Extend the Medusa order type and projection layer with validated refund facts.
Malformed metadata entries are ignored rather than breaking the order page or
receipt.

When at least one valid refund exists, projected status is derived from its
total:

- refund total greater than or equal to order total: `refunded`;
- refund total below order total: `partiallyRefunded`;
- no refund facts: retain the existing `payment_status`/order-status logic.

This shared projection updates both the order-history list and order-detail
status badge, even if Medusa still reports the payment as captured.

### PDF receipt (`wcpos-com`)

Receipt facts include normalized refund entries. The PDF retains the original
subtotal, tax, and total, then adds for each refund:

- **Refund:** a negative, locale-formatted currency amount;
- **Refund date:** a locale-formatted date.

The payment detail continues to show **Refunded** or
**Partially refunded**. New labels are added to every supported locale and use
the existing currency and date formatters.

## Error handling

- The refund lifecycle subscriber throws when the order snapshot, machine
  cleanup, or licence revocation fails. Medusa's event delivery can then retry.
- Replayed events are idempotent because refund snapshots are replaced and
  already-completed Keygen operations are accepted.
- The reconciliation job logs per-machine failures and leaves them for the next
  scheduled run. No additional retry or locking layer is added.
- Missing or malformed refund metadata falls back to current order status and
  produces no refund lines.

## Testing

### `wcpos-medusa`

- Full refund snapshots amount/date, deletes every machine, and revokes every
  attached licence.
- Partial refund snapshots amount/date without machine deletion or revocation.
- Event replay does not duplicate refund rows and accepts completed cleanup.
- Reconciliation deletes machines for suspended/revoked licences and leaves
  active licences unchanged.

### `wcpos-com`

- Refund metadata overrides a stale captured payment status for list and detail
  projections.
- Partial and full refund totals produce their respective status keys.
- Invalid refund metadata is ignored.
- Receipt projection preserves refund amount/date.
- PDF text contains the localized refund amount and date while retaining the
  original total.

## Non-goals

- Item-level licence revocation for partially refunded multi-item orders.
- Showing internal refund reasons or notes to customers.
- Replacing Medusa's payment or refund records with order metadata.
- Adding a Keygen webhook endpoint.

## Delivery

Implementation will ship as companion pull requests:

1. `wcpos-medusa`: refund snapshot, licence cleanup/revocation, reconciliation.
2. `wcpos-com`: order status projection and PDF receipt presentation.
