# Mosaic — Physical World Intelligence Platform

Real-time shelf compliance. Verified by humans. Powered by AI.

## Stack

| Layer | Tech |
|---|---|
| Monorepo | Turborepo + pnpm workspaces |
| Enterprise Portal | Next.js 15 App Router + Tailwind + `@supabase/ssr` |
| Collector App | Expo 52 (React Native) + Expo Router + expo-camera |
| Database | Supabase Postgres + PostGIS + RLS |
| Auth | Supabase Auth |
| Storage | Supabase Storage (`submissions` bucket) |
| AI | OpenAI GPT-4o Vision (Supabase Edge Function) |
| Payments | Stripe Connect |

## Project Structure

```
mosaic-app/
├── apps/
│   ├── web/          # Next.js enterprise portal (localhost:3000)
│   └── mobile/       # Expo collector app (iOS + Android)
├── packages/
│   └── types/        # Shared TypeScript types (@mosaic/types)
└── supabase/
    └── migrations/   # Database migrations
```

## Setup

### 1. Install dependencies
```bash
pnpm install
```

### 2. Environment variables
```bash
cp apps/web/.env.local.example apps/web/.env.local
```
Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` from your Supabase project dashboard (Settings → API).

### 3. Run migrations
```bash
supabase db push --project-ref bmoiftqtxprfgdnizmjn
```
Or apply manually in order: `001_initial_schema.sql`, `002_campaign_activation.sql`, `003_seed_data.sql`.

### 4. Start dev servers
```bash
pnpm dev           # web on :3000 + mobile (Expo)
```

Or individually:
```bash
cd apps/web && pnpm dev
cd apps/mobile && pnpm dev
```

## Supabase

- Project ref: `bmoiftqtxprfgdnizmjn` (eu-north-1)
- Dashboard: https://supabase.com/dashboard/project/bmoiftqtxprfgdnizmjn

## Deploy

### Web (Vercel)
```bash
vercel --cwd apps/web
```
Set environment variables in Vercel dashboard matching `apps/web/.env.local.example`.

### Mobile (EAS)
```bash
eas build --platform all          # production build
eas build --platform all --profile preview   # APK for testing
```

### Edge Functions
```bash
supabase functions deploy score-submission --project-ref bmoiftqtxprfgdnizmjn
```
Set `OPENAI_API_KEY` and `STRIPE_SECRET_KEY` as secrets in the Supabase dashboard (Edge Functions → Secrets).
