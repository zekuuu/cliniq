# ADR-030: Inventory stock is tracked by batch and expired stock is disposed explicitly

**Date:** Saturday, October 17, 2026 — 12:07 PHT
**Status:** Accepted

## Context

An item previously held one quantity and one expiration date. Restocking an item with expired stock replaced that date, hiding the expired units and making them appear safe to give.

## Decision

1. Each inventory item holds received batches: id, quantity, expiration date (nullable), and received date.
2. Item totals are derived: usable non-expired stock, expired stock, and total on hand. Low-stock status uses usable stock only.
3. Restock always adds a batch. It never overwrites an earlier batch.
4. Dispensing uses non-expired batches in earliest-expiry-first order; a transaction and a medicine line retain their batch allocations. A visit edit returns stock to those original batches.
5. Expired batches stay visible until Staff explicitly adjusts that chosen batch with **Expired - disposed**. The movement history records the disposed batch; an expired batch never reaches zero merely because time passed.
6. Inventory shows usable and expired quantities separately, can filter to items with expired stock, warns before restocking an item that retains expired stock, and exposes batches plus movement history.

## Alternatives Considered

- **Keep one expiration date per item.** Rejected: a restock can hide earlier expired units.
- **Automatically zero expired batches.** Rejected: it silently changes physical stock and loses the disposal record.
- **Block a quantity above usable stock.** Rejected: ADR-018's warn-don't-block rule still applies to care already given.

## Consequences

- The mock layer migrates legacy one-date items and persisted mock state into one batch.
- The backend schema remains blocked pending team approval of the ERD; section 11 records the batch-table decision.
- Canonical Modules & Features and Frontend Context Brief need matching batch/transaction contract updates.
