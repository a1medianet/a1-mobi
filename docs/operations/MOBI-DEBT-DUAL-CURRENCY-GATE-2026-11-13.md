# A1 MOBI — Debt & dual-currency closure gate (2026-11-13)

Status: schema and debt rules reviewed; pure multi-branch reconciliation implemented and unit-tested; NO production migration, posting UI or live balance published yet.

Current observed facts
- Customer is tenant-wide and DebtAccount is unique per customer, with ONE monetary balance plus a currency (default USD).
- DebtEntry contains branch of the activity, amount in account base currency, type, balanceAfter and idempotency key.
- Payment stores actual currency, amount and exchangeRate as captured at transaction time.
- Current charge requires an existing sale OR repair. There is no safe standalone "new debt" form from Customers.
- ExchangeRate is stored per tenant and branch with effective date; currency policies support USD and LBP.
- The customer screen must not show aggregate balances before account-vs-ledger reconciliation.

Required production design (future gates)
1. Customers > Customer profile > Debts & Statement: open balance, charge source, settlement, reversal and full source-linked timeline. No unanchored freeform debt without an approved reason and auditable source record.
2. Default active payment currencies USD/LBP, configurable allowed currencies at tenant level. Keep ledger base currency and original instrument currency, historic rate, rate effective timestamp/source, actor and exchange gain/loss (when applicable).
3. Daily FX quote from A1 Currency: explicit branch selection, displayed timestamp, stale-rate blocking, manual approval override logged; historical entry values never silently recomputed when today's quote changes.
4. Cross-branch statement: combine ALL scoped tenant DebtEntry records for a customer, show branch of each posting and only display verified total if sum of all entries + accepted opening balance equals DebtAccount.balance. For mismatch show reconciliation required; do not invent figures.
5. Cash: record collections to the correctly opened branch cash session in the received currency; idempotency, refunds/reversals and bank vs cash accounting rules.
6. Audit and RBAC: customers.read separate from debt.read, debt.write, debt.collect, debt.adjust, debt.export. PDF/Excel exports must include dates, filters, FX details, branch and source.
7. Tests: USD debt paid in LBP; LBP debt paid in USD; mixed branch collections, stale rate, rate change between days, duplicate action, permissions, tenant isolation and rollback.
8. Automatic reminders: operational notices for due accounts by explicit due date, customer preferences and channel consent. No marketing permission inferred from debt records.

Release gate
- Confirm production database dump, restore drill, and reversible migration plan.
- Historical debt migration and currency-denominated accounts require a separate approved plan; DO NOT reinterpret historical account balance currency.
- No changes to live financial data or production schema without evidence.
