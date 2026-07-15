# Auth & Database

Supabase project: `umtoseyxvszdxbuvuyuk` (ca-central-1). URL and publishable
key are in `.env.example`. Generated types are in `db.types.ts`.

The database/RPC layer below was built first; a real auth frontend (login,
signup, employee join-code flow) now exists under `src/`, wired to it.
`app-demo.jsx`'s dashboard (jobs board, calendar, map, CRM, etc.),
`voice-receptionist-demo.html`, and `marketing-site.html` remain
behavior/design references, not code to build on top of directly — only the
auth screens have been ported to real code so far.

## Running the frontend

This machine doesn't have Node.js installed, so the app has been written
but not installed or run. Once Node is available:

```
npm install
cp .env.example .env   # already has real project values filled in
npm run dev
```

## Frontend implementation

`src/App.jsx` is a small state machine driven by `supabase.auth` session
state plus whether a `profiles` row exists for that user:

| `session` | `profile` | Screen |
|---|---|---|
| checking | — | loading |
| `null` | — | `LoginScreen` / `SignupScreen` / `CheckEmailScreen` |
| set | checking | loading |
| set | `null` | `RoleChoiceScreen` → `OwnerOnboardingScreen` or `EmployeeJoinScreen` |
| set | set | signed-in placeholder (name/role/company + Sign Out) |

**Why role selection happens *after* `signUp()`, not before it** (this is
the one real deviation from `app-demo.jsx`'s screen order): the demo's
`OwnerSignup`/`EmployeeSignup` screens collect business name / join code
*together with* email+password, because the demo's "session" is just local
state that appears instantly. A real `supabase.auth.signUp()` can return
with no session at all if the project requires email confirmation — the
user has to click a link in their inbox, which is a full page navigation
that would lose any in-memory form state. So `SignupScreen` only collects
credentials; once a session exists (immediately, or after the user
confirms and logs back in — same code path either way) and no `profiles`
row is found yet, `RoleChoiceScreen` picks up and finishes the job with
`OwnerOnboardingScreen` (business name, owner name, trade, team size,
service area) or `EmployeeJoinScreen` (name, join code), calling the RPCs
below. This also naturally covers first-time Google sign-in, which lands
authenticated with no prior role choice at all.

Files: `src/lib/supabaseClient.ts` (client), `src/lib/auth.js` (thin
wrappers over `supabase.auth.*` and the two RPCs), `src/auth/*.jsx`
(screens + shared styling ported from the demo's `LIGHT` palette and
`AuthShell`/`FieldLabel`/`TextInput`/etc. building blocks), `src/App.jsx`
(the state machine above).

## Dashboard screens (jobs, calendar, home)

`app-demo.jsx`'s `OwnerHome`, `JobsBoard`, `CalendarPage`, and `TechHome`
are ported to `src/dashboard/*.jsx`, reading and writing the real tables
instead of local state. `src/dashboard/AppShell.jsx` replaces the
placeholder screen in `App.jsx` once a profile exists, and only shows the
tabs that are wired up (`Home`, `Jobs` for owners, `Calendar`) — the demo's
Map/Clients/Insights/Team/Settings tabs aren't part of this pass.

Data access lives in `src/lib/jobs.js`, `src/lib/dashboard.js`, and
`src/lib/timeEntries.js` — plain functions wrapping `supabase.from(...)`
queries, mirroring the pattern in `src/lib/auth.js`. Every read relies on
RLS to scope results to the caller's company (no manual `company_id`
filtering needed); every insert into `customers`/`jobs`/`time_entries`
relies on those columns' `DEFAULT public.current_company_id()` (added in
migration `012_default_company_id_on_client_inserts`) rather than the
client supplying `company_id` itself — simpler call sites, and it closes
off a spoofing vector.

**Seeded job types**: `job_types` starts empty for a new company, which
would leave `JobsBoard`'s "New Job" form with nothing to pick from.
Migration `011_seed_default_job_types` seeds the six plumbing job types
from `receptionist-server/lib/pricing.js`'s `JOB_TYPES` whenever a
`trade: 'Plumbing'` company is created. Other trades get no defaults yet.

**Features intentionally dropped**, because they had no real data behind
them in the demo and this task is specifically about persistence:
- Weather-alert banner (`OwnerHome`) — hardcoded Calgary forecast.
- "Recovered" stat (`OwnerHome`) — replaced with "Completed Today", a real
  count from `jobs`.
- Confirmation-SMS simulate-yes/simulate-reschedule buttons
  (`CalendarPage`) — no SMS backend exists.
- AI job-report generation and the "on the way" SMS preview (`TechHome`) —
  the demo called the Anthropic API directly from the browser with no
  backend proxy or API key; `Mark Complete` now just saves the tech's own
  notes straight to `jobs.notes`.
- Fake per-pair distance hash in the assign picker (`JobsBoard`) —
  replaced with a real haversine calculation (`distanceKm` in
  `src/lib/jobs.js`) over `jobs.lat/lng` and `tech_locations.lat/lng`, but
  those columns have no geocoding or GPS pipeline populating them yet, so
  it will show "—" until one exists.

**Not built**: real-time sync (every screen fetches on mount/after a
mutation, not via Supabase Realtime — multiple browser tabs won't see each
other's writes without a manual refresh), job photo attachments, and
anything under the demo's Map/Clients/Insights/Team/Settings tabs.

## Signup flow

A new `auth.users` row has no `company_id` or `role` yet, so two RPCs bridge
that gap. Call one of them client-side immediately after
`supabase.auth.signUp()` / Google OAuth completes and the user has answered
"starting a business" vs. "joining a team" (mirrors the demo's
`SignupChoice` screen):

- **Owner**: `supabase.rpc('create_company_and_owner', { p_business_name, p_owner_name, p_trade, p_team_size, p_service_area })`
  Creates the `companies` row, a join code, the caller's `profiles` row
  (`role: 'owner'`), and a `starter`-plan `subscriptions` row. Returns the
  new `companies` row.
- **Tech**: `supabase.rpc('join_company_as_tech', { p_join_code, p_name })`
  Looks up the company by join code and creates the caller's `profiles` row
  (`role: 'tech'`). Raises `invalid join code` if no match — surface that as
  the same "That join code doesn't match any company" error the demo shows.
- **Regenerate join code**: `supabase.rpc('regenerate_join_code')` — owner
  only, returns the new code. Used by the Team page's regenerate button.

Both signup RPCs reject a second call for the same user (`profile already
exists for this user`) — a user can only belong to one company.

After either RPC succeeds, fetch the caller's `profiles` row to get
`role`/`company_id` and drive which UI (`owner` vs `tech` tabs) to show —
same split as `AppShell` in the demo.

## Google OAuth setup (manual, one-time)

Supabase's Google provider is not yet enabled — you need to do this
yourself since it requires a Google Cloud account:

1. In [Google Cloud Console](https://console.cloud.google.com), create a
   project (or reuse one), then **APIs & Services → Credentials → Create
   Credentials → OAuth client ID**, type "Web application".
2. Add authorized redirect URI:
   `https://umtoseyxvszdxbuvuyuk.supabase.co/auth/v1/callback`
3. Copy the generated Client ID and Client Secret.
4. In the Supabase dashboard: **Authentication → Providers → Google**,
   paste both values in, and enable the provider.
5. In the Supabase dashboard: **Authentication → URL Configuration**, add
   `http://localhost:5173` (Vite's dev server) to **Redirect URLs**, plus
   your real domain once deployed. `signInWithGoogle()` in
   `src/lib/auth.js` passes `redirectTo: window.location.origin`, and
   Supabase rejects any redirect target not on this allowlist.
6. Once enabled, the "Continue with Google" button already wired up in
   `LoginScreen`/`SignupScreen` works — same post-auth `RoleChoiceScreen`
   flow as email/password to attach the user to a company.

## Schema reference

All tables are in `public`, RLS-enabled, scoped by `company_id`. Two
`SECURITY DEFINER` helper functions back the RLS policies:
`current_company_id()` and `current_role()`, both resolving from the
caller's own `profiles` row.

| Table | Purpose |
|---|---|
| `companies` | One row per tenant business; also holds pricing/ops settings (base fee, hourly rate, urgency multipliers, deposit rules, commission %, auto-assign/notify toggles) — the Settings page's "Pricing & Revenue" section. |
| `profiles` | 1:1 with `auth.users`. `role` is `owner` or `tech`. |
| `job_types` | Per-company catalog of job types (drain, faucet, water heater, etc.), each with hours/rate/parts cost. |
| `customers` | CRM contacts, with referral code + who-referred-whom. |
| `jobs` | Core work orders: status (`unassigned → assigned → in_progress → done`/`cancelled`), assigned tech, urgency, price range, scheduling, and `source` (`manual`/`phone_ai`/`website_lead`). |
| `job_status_events` | Audit trail of status changes, with lat/lng for "checked in, location verified." |
| `tech_locations` | Latest lat/lng + status (`on_job`/`en_route`/`available`/`offline`) per tech — upsert target for the live map. |
| `time_entries` | Clock in/out. |
| `calls` | AI receptionist call log (quote, urgency, property/parts tier, outcome, transcript). Written by `receptionist-server` via the service role key. |
| `leads` | Marketing site lead form submissions. Written by the marketing site via the service role key. |
| `feedback` | Post-job sentiment; powers the owner's negative-feedback recovery alert. |
| `nurture_campaigns` / `campaign_enrollments` | Automated customer follow-up campaigns and who's enrolled. |
| `invoices` | Auto-generated on job completion. |
| `subscriptions` | Plan (`starter`/`growth`/`pro`) and Stripe IDs — schema only, no Stripe webhook wired up yet. |
| `integrations` | Connect-state for Google Calendar / QuickBooks / Slack / Stripe — schema only, no OAuth flows wired up yet. |

### RLS pattern

- All company members can **read** everything scoped to their company
  (jobs, customers, calendar, team directory, etc.).
- **Owner-only writes**: `job_types`, `feedback`, `nurture_campaigns`,
  `campaign_enrollments`, `invoices`, `integrations`, company settings,
  team management.
- **Jobs**: owners can create/update/delete any job in their company; techs
  can update (status + notes) only jobs assigned to them.
- **`customers`**: any company member can create/update (owner or tech
  might add a new customer while booking on the spot).
- **`tech_locations` / `time_entries`**: techs write only their own row;
  everyone in the company can read (for the live map / team overview).
- **`calls` / `leads`**: read-only for company members via the API; all
  writes come from `receptionist-server` and the marketing site using the
  Supabase **service role key**, which bypasses RLS (there's no logged-in
  user on a phone call or an anonymous site visitor).

## Not built yet (flagged in the schema, not implemented)

- Job photo attachments / Supabase Storage buckets.
- Stripe billing webhooks (subscriptions table exists, nothing populates
  `stripe_customer_id`/`stripe_subscription_id` yet beyond the `starter`
  default).
- Google Calendar / QuickBooks / Slack OAuth flows (integrations table
  exists, `connected` stays `false` until built).
- Any frontend wiring — `app-demo.jsx` still runs on its in-memory mock
  state; it hasn't been pointed at Supabase yet.
