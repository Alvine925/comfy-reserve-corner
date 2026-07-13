---
name: Serial numbers & batch product creation
description: How the quantity-based product creation and serial number system works
---

## Rule
`createProduct` accepts a `quantity` field (1–500, not stored in DB). It generates N product rows, each with a unique `serial_number` of the form `{PREFIX}-{NNN}` where PREFIX = first 6 alphanumeric chars of the product name, uppercase.

## Why
Admin wanted to add "Office Chair × 20" once, not 20 times. Each physical unit needs a trackable ID for reservations, counter offer outbid emails, and customer confirmations.

## How to apply
- Serial prefix from `serialPrefix(name)` in `products.functions.ts`
- Next sequence start from `nextSerialStart(supabase, prefix)` — queries existing serials matching `PREFIX-%` to find max and continue
- `serial_number` column on `products` table is NULLABLE — added in migration `20260713130000_serial_number.sql` which must be run first
- Queries explicitly listing `serial_number` will fail before migration runs → use `select("*")` for single-product queries; omit `serial_number` from list queries and joins
- After migration runs, `getProduct` uses `select("*")` so serial_number appears automatically
- Admin toast on create shows: "Created N units (PREFIX-001 → PREFIX-020)"
- Image sync: when editing one unit's images, `syncGroupImages` server fn propagates to all other units with same name
