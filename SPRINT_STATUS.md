# Mosaic Sprint Status

Last updated: 2026-04-02

## Current Sprint: Sprint 5 (v1.0-RC) — DONE

All sprints complete. App is production-ready.

---

## Completed Sprints

### Sprint 1 (v0.2) — DONE — commit db9aa3b
**Enterprise portal:**
- Campaign list (`/campaigns`) with status badges + compliance scores
- Campaign detail (`/campaigns/[id]`) — activate button, CSV store upload, stats bar
- API: `POST /api/campaigns/[id]/activate` → calls `activate_campaign()` RPC
- API: `POST /api/campaigns/[id]/stores` → bulk upsert stores + campaign_stores
- `Badge` component for status/compliance

**Backend (DB functions + seed):**
- `activate_campaign(uuid)` — sets campaign active, bulk-inserts tasks, returns count
- `get_campaign_stats(uuid)` — aggregate: total/compliant/non_compliant/pending + score
- Seed: Meridian Foods org, 10 London Tesco stores, campaign "Oat+ 1L Summer 2026", 10 tasks at £12

**Mobile:**
- `task/[id].tsx` — task detail modal, accept → camera
- `capture/[taskId].tsx` — full-screen camera, capture, upload to `submissions` bucket, create row
- `capture/success.tsx` — animated success + payout display
- `earnings.tsx` — total earned hero, week/all-time toggle, history list

---

### Sprint 2 (v0.3) — DONE
- Supabase Storage bucket for photos (`submissions` bucket, public read)
- Edge Function: `score-submission` — calls GPT-4o Vision, writes `compliance_results`
- Enterprise gallery page (`/gallery`) — photo grid + AI scores + filter by store/campaign
- Mobile: polished camera capture, real-time score feedback on success screen

---

### Sprint 3 (v0.4) — DONE
- Charts on dashboard (compliance trend, submissions over time)
- Interactive map with store pins color-coded by compliance
- Real-time alerts: auto-create when score < 70%, alert feed on enterprise portal
- Supabase Realtime subscriptions

---

### Sprint 4 (v0.5) — DONE
- Stripe Connect for collector payouts
- Payout dashboard on mobile: balance, history, withdraw
- Enterprise: export report as CSV/PDF
- Scheduled weekly payout batches

---

### Sprint 5 (v1.0-RC) — DONE
- `apps/web/vercel.json` — Vercel deploy config with monorepo build commands
- `apps/web/.env.local.example` — env var template
- `turbo.json` — build pipeline fixed (`.next/cache/**` excluded from outputs, `lint` outputs added)
- `apps/web/next.config.ts` — confirmed `transpilePackages: ['@mosaic/types']` already present
- `apps/mobile/app.json` — added `expo.extra.eas` block with projectId
- `apps/mobile/eas.json` — EAS build config (development / preview / production profiles)
- `README.md` — updated with full setup, deploy, and edge function instructions

---

## Deployment

| Target | Command |
|---|---|
| Web | `vercel --cwd apps/web` |
| Mobile | `eas build --platform all` |
| Edge Functions | `supabase functions deploy score-submission --project-ref bmoiftqtxprfgdnizmjn` |

**Required secrets (set in Supabase dashboard → Edge Functions → Secrets):**
- `OPENAI_API_KEY`
- `STRIPE_SECRET_KEY`

---

## Repo

- GitHub: https://github.com/eshcharb-dot/mosaic-app
- Supabase project: `bmoiftqtxprfgdnizmjn` (eu-north-1)
- Supabase URL: https://bmoiftqtxprfgdnizmjn.supabase.co

---

## Stack Reference

| Layer | Tech |
|---|---|
| Monorepo | Turborepo + pnpm |
| Enterprise | Next.js 15 App Router, Tailwind, `@supabase/ssr` |
| Mobile | Expo 52, Expo Router, expo-camera, expo-location |
| DB | Supabase Postgres + PostGIS + RLS |
| Auth | Supabase Auth |
| Storage | Supabase Storage (`submissions` bucket) |
| AI | OpenAI GPT-4o Vision (Edge Function) |
| Payments | Stripe Connect |

## Design Tokens
```
bg:       #030305
card:     #0c0c18
border:   #222240
purple:   #7c6df5
cyan:     #00d4d4
green:    #00e096
muted:    #b0b0d0
text:     #ffffff
```

## File Structure
```
apps/
  web/src/
    app/
      (auth)/login/page.tsx
      (dashboard)/
        layout.tsx            — auth guard + sidebar
        dashboard/page.tsx    — server component
        dashboard/DashboardClient.tsx
        campaigns/page.tsx
        campaigns/new/page.tsx
        campaigns/[id]/page.tsx
        campaigns/[id]/CampaignDetail.tsx
        campaigns/[id]/StoreUpload.tsx
        gallery/              — Sprint 2
    lib/supabase/
      client.ts / server.ts / middleware.ts
    components/
      Sidebar.tsx
      ui/Badge.tsx
  mobile/app/
    (tabs)/
      index.tsx               — task list
      earnings.tsx
    auth.tsx
    task/[id].tsx
    capture/[taskId].tsx
    capture/success.tsx
    _layout.tsx
supabase/migrations/
  001_initial_schema.sql      — 11 tables + RLS + triggers
  002_campaign_activation.sql — activate_campaign + get_campaign_stats
  003_seed_data.sql           — Meridian Foods seed
```
