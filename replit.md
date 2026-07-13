# Furniture Collection

A pre-owned furniture browsing and reservation app built with TanStack Start (SSR React), Vite, Tailwind CSS v4, Supabase, and shadcn/ui. Originally created in Lovable.

## Stack

- **Framework**: TanStack Start (SSR) + TanStack Router (file-based routing)
- **UI**: React 19, Tailwind CSS v4, shadcn/ui (Radix primitives)
- **Backend**: Supabase (Postgres + Auth)
- **Runtime**: Node.js 22 + Bun (package manager)
- **Build**: Vite 8 via `@lovable.dev/vite-tanstack-config`

## Running the app

```
bun run dev
```

Runs on port 5000. The workflow "Start application" handles this automatically.

## Routes

| Route | Description |
|-------|-------------|
| `/` | Products browse page (home) |
| `/product/$id` | Product detail + reservation |
| `/alvookado` | Admin dashboard (auth-gated) |

## Environment variables

The `.env` file includes Supabase credentials (URL + anon key). The admin client (`client.server.ts`) additionally requires `SUPABASE_SERVICE_ROLE_KEY` — set this as a secret before using admin server functions.

## User preferences

- Products page is the home page (already `src/routes/index.tsx` at `/`)
