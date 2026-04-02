# Mosaic — Physical World Intelligence Platform

Real-time shelf compliance. Verified by humans. Powered by AI.

## Stack

| Layer | Tech |
|---|---|
| Monorepo | Turborepo + pnpm workspaces |
| Enterprise Portal | Next.js 15 + Tailwind + Supabase |
| Collector App | Expo 52 (React Native) + Supabase |
| Database | Supabase (Postgres + PostGIS + RLS) |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| AI | OpenAI GPT-4o Vision |
| Payments | Stripe Connect |

## Project Structure

```
mosaic-app/
├── apps/
│   ├── web/          # Next.js enterprise portal (localhost:3000)
│   └── mobile/       # Expo collector app (iOS + Android)
├── packages/
│   └── types/        # Shared TypeScript types
└── supabase/
    └── migrations/   # Database migrations
```

## Getting Started

```bash
pnpm install
pnpm dev          # starts web on :3000
```

### Web only
```bash
cd apps/web && pnpm dev
```

### Mobile
```bash
cd apps/mobile && pnpm dev
```

## Supabase

Project: `bmoiftqtxprfgdnizmjn` (eu-north-1)
Dashboard: https://supabase.com/dashboard/project/bmoiftqtxprfgdnizmjn

## Environment

Copy `.env.local.example` → `.env.local` in `apps/web/`.
Copy `.env.example` → `.env` in `apps/mobile/`.
