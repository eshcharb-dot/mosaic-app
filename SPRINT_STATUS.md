# Mosaic Sprint Status

Last updated: 2026-04-03

## Current Sprint: Sprint 55 (v2.0) — DONE

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

---

## Completed Sprints (v1.1–v2.0)

### Sprints 6-10 — DONE — commit 159d52c
- Supabase Realtime subscriptions (useRealtimeTable hook)
- Enterprise onboarding wizard (multi-step, org setup)
- Mobile map (SVG, haversine distance, 6km viewport)

### Sprints 11-15 — DONE — commit aae7dd3
- Team management (invitations with crypto tokens)
- Push notifications (expo-notifications, lazy-loaded)
- Campaign templates table + API

### Sprints 16-20 — DONE — commit 512b3e5
- Webhooks system (HMAC-SHA256, deliver-webhook edge function)
- Global command palette (⌘K, debounced search)
- Mobile offline queue + connectivity hook + sync manager

### Sprints 21-25 — DONE — commit c826c15
- White-label branding (CSS vars, BrandProvider, custom domain)
- Compliance rules engine (campaign rules builder)
- Collector tier system (bronze/silver/gold/platinum, auto-promote trigger)

### Sprints 26-30 — DONE — commit 1a2d8d4
- AI digest emails (GPT-4o narrative, styled HTML)
- Public ROI calculator marketing page
- Territory management (store territory assignment + map)

### Sprints 31-35 — DONE — commit 21c4ca1
- Interactive map filters (heatmap/territory modes, score/campaign filters)
- Photo comparison slider (drag-to-reveal, keyboard support)
- Admin dashboard (platform-wide stats, org/collector management, audit log)
- Export center (CSV/PDF with date/campaign filters)
- Security hardening (rate limiting, security headers, input validation, audit logging)

### Sprints 36-38 — DONE — commit 557443f
- i18n: English / German / French (JSON files, I18nProvider, language selector)
- Accessibility: WCAG 2.1 AA (focus rings, skip links, ARIA, focus traps)
- Dark/light theme toggle (CSS vars, ThemeProvider, zero-flash inline script)

### Sprints 39-41 — DONE — commit bcd131a
- Performance monitoring dashboard (system health, 8 metrics, 30s auto-refresh)
- Mobile tablet layout optimization (2-column grid, side panel, responsive hooks)
- Mobile dark/light theme (ThemeContext, AsyncStorage persistence, token system)

### Sprints 42-44 — DONE — commit a4e5d26
- Batch photo capture (up to 5 photos per submission, preview strip)
- GPS location verification (Haversine distance check, 200m threshold)
- Slack alert integration (webhook, threshold config, test message)

### Sprints 45-47 — DONE — commit fd0c58e
- Email notification system (Resend integration, digest preferences, email log)
- Public marketing landing page (hero, stats bar, features grid, CTA)
- Enterprise onboarding wizard (4-step, org setup, first campaign creation)

### Sprints 48-50 — DONE — commit 784e480
- Help center (searchable, 8 articles, category filter)
- Mobile task search + filters (Near Me, High Pay, Quick Tasks, empty states)
- Campaign templates gallery (6 pre-built templates, detail panel, one-click create)

### Sprints 51-53 — DONE — commit f01f494
- Store management page (bulk edit/delete, CSV import/export)
- Mobile achievement badges (12 badges, tier system, DB migration)
- Collector management page (org-scoped, stats, side panel)

### Sprints 54-55 — DONE
- Mobile task history screen (completed tasks, earnings, scores, filters)
- Error boundaries + loading states + final polish
