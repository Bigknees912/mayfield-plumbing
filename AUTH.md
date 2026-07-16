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
tabs that are wired up (`Home`, `Jobs`, `Calendar`, `Clients`, `Automations`
for owners) — the demo's Map/Insights/Team/Settings tabs aren't part of
this pass.

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

**Not built**: job photo attachments, and anything under the demo's
Map/Insights/Team/Settings tabs.

## CRM pipeline (Clients page)

`src/dashboard/ClientsPage.jsx` — didn't exist in any prior pass (the
demo's `ClientsPage` was explicitly out of scope until now). Built as a
GoHighLevel-style drag-and-drop pipeline: **New Lead → Contacted → Quoted
→ Booked → Completed → Nurture**, using `@dnd-kit/core` (`MouseSensor` +
`TouchSensor`, not `PointerSensor` — see the code comment in
`ClientsPage.jsx`; a plain `PointerSensor` would intercept touch input
too, breaking the board's horizontal scroll on mobile).

**Design decision worth flagging**: those six stages don't map cleanly
onto any single existing table (`leads.status` only has
new/contacted/converted/lost; "Quoted"/"Booked"/"Completed" are job
concepts; "Nurture" is a `nurture_campaigns` concept). Rather than trying
to *derive* a stage from scattered job/lead state, `customers` gained an
explicit `pipeline_stage` column (migration
`018_customers_pipeline_stage`) that only ever changes two ways:

1. A card is dragged to a new column (`updateContactStage` in
   `src/lib/crm.js`) - optimistic update, reverted with an `ErrorBanner`
   if the write fails.
2. A customer-creation call site picks a sensible starting stage:
   `findOrCreateCustomer` (`src/lib/jobs.js`, used by `JobsBoard`'s New
   Job form) and `receptionist-server/lib/booking.js`'s phone-booking flow
   both default new customers to `'booked'` (a job is being created right
   alongside), while the Clients page's own "Add Contact" defaults to
   `'new_lead'`. Neither path ever touches an *existing* customer's
   stage — a manual drag never gets silently overwritten by a later job.

**Nothing auto-advances a stage** from job status changes, deposit
payments, or completions (e.g. a job going `done` does not automatically
drag its customer to "Completed"). This is a deliberate scope decision,
not an oversight — auto-advancement means deciding whether automation is
allowed to override a manual placement (e.g. a customer someone
deliberately moved to "Nurture"), which is a business-logic call this
task didn't specify. Wiring it up later would mean a DB trigger on
`jobs`/`invoices` updating `customers.pipeline_stage`, following the same
pattern as the SMS triggers above.

**`leads` table still isn't wired up**: the marketing site's lead form
remains a client-side stub (`console.log`, no Supabase write — see its
own code comment), so this pipeline only reflects customers created
through the app itself. A future pass connecting the marketing site would
most naturally insert directly into `customers` at `'new_lead'` rather
than `leads`, to land straight on this board.

Realtime: `customers` was added to the `supabase_realtime` publication
(same migration), and `useJobsRealtime.js` was generalized into
`useTableRealtime.js` (table name is now a parameter) so `ClientsPage` can
reuse it — `useJobsRealtime` itself is now a two-line wrapper around it,
kept so `OwnerHome`/`JobsBoard`'s existing imports didn't need to change.

### Tags and the interaction timeline

Clicking a card opens `src/dashboard/ContactDetailModal.jsx`, which adds
two things per contact, from migration `019_contact_tags_and_interactions`:

- **`customers.tags text[]`** — plain array, not a separate tags table +
  join. The examples given ("repeat customer", "referred by Sarah") are
  ad-hoc, often contact-specific text, not a controlled vocabulary worth
  normalizing. The modal still offers lightweight autocomplete: `allTags`
  (every distinct tag already used across the company) is computed
  client-side in `ClientsPage.jsx` from the contacts already loaded — no
  extra query — and shown as click-to-add suggestions. Saved via
  `updateContactTags`, optimistic with revert-on-failure, and patches the
  board's local state directly (`onTagsChanged`) rather than waiting on a
  full reload or the realtime round-trip.
- **`customer_interactions` table** — the timeline. Deliberately *not*
  the same table as `calls` (that's the AI receptionist's automated Vapi
  call log — vapi_call_id, quote_low/high — a different concern from a
  person typing "called to follow up, left voicemail"). `type` is
  `'note'` or `'call'`, picked via a toggle in the composer.
  `company_id`/`created_by` are both DB-side defaults
  (`current_company_id()` / `auth.uid()`), same convention as everywhere
  else — never supplied by the client.
- **Append-only by design**: there's no UPDATE policy on
  `customer_interactions`. It's meant to read like an audit trail —
  corrections are new entries, not edits to history. A DELETE policy
  exists (creator or owner) for cleaning up a genuine mistake, but no UI
  button calls it yet since removal wasn't asked for; it's there at the
  RLS layer if it's ever needed directly.
- **Card-vs-drag click handling**: `ContactCard` has both `@dnd-kit`
  drag listeners *and* an `onClick` to open the detail modal on the same
  element. This works because of the sensors' `activationConstraint`
  (`distance`/`delay`) — a plain tap that doesn't cross that threshold
  never becomes a drag, so the click fires normally. If drag-vs-click
  ever misbehaves after real testing, that constraint tuning is the first
  place to look.

### Loading and error handling

Every screen follows the same pattern via `src/dashboard/useAsyncData.js`:
`loading` is only ever true before the *first* successful load; once data
has loaded once, a later failure (e.g. a realtime-triggered background
refresh) sets `error` without wiping the screen back to a loading/blank
state - existing data stays on screen with a dismissible `ErrorBanner`
(with Retry) on top of it, rather than a full-page `ErrorState` replacing
everything. `ErrorState`/`ErrorBanner`/`LoadingState` all live in
`src/dashboard/ui.jsx`. Every mutation (assign, deposit, clock in/out,
start job, complete job, save notes, sign out) has its own
loading/disabled state on the specific control and surfaces failures
instead of failing silently - there is no bare `.then()` without a
`.catch()`, and no `onClick` wired directly to an unguarded async
function, anywhere in `src/`.

## receptionist-server → same database

`receptionist-server` (the Vapi phone AI) now reads/writes the exact same
`jobs`/`customers`/`calls`/`job_types` tables instead of a local
`bookings.json` file — a job Alex books over the phone is a real row the
owner's Jobs board and Home stats can see. Details:

- **New files**: `receptionist-server/lib/supabase.js` (service-role
  client — there's no logged-in user on a phone call, so it bypasses RLS
  and must filter by `company_id` explicitly on every query),
  `lib/booking.js` (`recordQuote` upserts a `calls` row keyed by Vapi's
  call id every time `get_quote` runs; `createBooking` finds/creates the
  `customers` row, inserts the `jobs` row, marks the call `outcome:
  'booked'`). `lib/scheduling.js` was rewritten to check real `jobs` rows
  for conflicts instead of `bookings.json`.
- **New required env vars** (`receptionist-server/.env.example`):
  `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (from the Supabase dashboard
  — never expose client-side, unlike the publishable key), and
  `SUPABASE_COMPANY_ID` — this deployed server answers calls for exactly
  one company, so it needs that company's id. **There's no company to
  point it at until someone completes owner signup through the dashboard
  app once** — this is a hard prerequisite, not just a nice-to-have.
- **`customerName` added**: `customers.name` is `NOT NULL`, but the voice
  flow never asked for one. `vapi-assistant.json`'s system prompt and the
  `book_appointment` tool schema now collect it before booking.
- **Live dashboard updates**: `jobs` was added to the `supabase_realtime`
  publication (migration `013_enable_realtime_on_jobs`), and
  `src/dashboard/useJobsRealtime.js` subscribes `OwnerHome`/`JobsBoard` to
  it (filtered to the company, still RLS-scoped per client) — a phone
  booking appears without the owner refreshing.
- **Untested against a real call**: `server.js` assumes Vapi's webhook
  body carries the caller's number and call id at
  `message.call.customer.number` / `message.call.id`, per Vapi's
  documented format — this hasn't been exercised against an actual phone
  call yet. First real test call, check the `calls` table (or Render
  logs) to confirm those populated.

## Deposit collection (Stripe)

Real Stripe Checkout, not a fake "Send Deposit Link" button — the demo's
button had no `onClick` at all. Runs as two Supabase Edge Functions, source
in `supabase/functions/`:

- **`create-deposit-checkout`** (`verify_jwt: true`) — called from
  `JobsBoard`'s "Send Deposit Link" button via
  `supabase.functions.invoke(...)`, which auto-attaches the owner's
  session JWT. Re-validates server-side that the job is actually over
  `companies.deposit_threshold` (never trusts the client), checks the
  caller's `profiles.role` is `'owner'` (defense-in-depth beyond RLS —
  a tech *could* technically hit this for their own assigned job per the
  `jobs_update` policy, but the button only exists on the owner-only Jobs
  board, so the function enforces that same boundary), creates a real
  Stripe Checkout Session for the computed deposit amount, and sets
  `jobs.deposit_status = 'pending'` + `stripe_checkout_session_id`. Uses a
  per-request client built from the forwarded `Authorization` header (not
  the service role) so it's RLS-scoped to the caller's own company, same
  guarantee as every other write in this app.
- **`stripe-webhook`** (`verify_jwt: false` — Stripe has no Supabase
  session; the `Stripe-Signature` header verified inside the function *is*
  the auth) — listens for `checkout.session.completed` and flips
  `jobs.deposit_status` to `'paid'` with `deposit_paid_at`, matched by
  both `job_id` (from Stripe's session `metadata`) and
  `stripe_checkout_session_id`. Uses the service-role client, same pattern
  as `receptionist-server`.

**Schema**: `jobs` gained `deposit_status` (`none`/`pending`/`paid`),
`deposit_amount` (locked in at send-time — a later change to
`deposit_pct` in Settings doesn't retroactively change what was already
requested), `stripe_checkout_session_id`, `deposit_paid_at`. `jobs` was
already in the Realtime publication (from the phone-booking work), so a
webhook-driven `'paid'` flip shows up live on the dashboard too, same as
everything else.

**One-time Stripe setup** (I can't create the account or click through
their dashboard for you):
1. Sign up at [stripe.com](https://stripe.com) (or use an existing
   account). Toggle **Test mode** first — use test card `4242 4242 4242
   4242`, any future expiry/CVC, to try this end-to-end before going live.
2. **Developers → API keys**: copy the **Secret key**.
3. Supabase dashboard → **Edge Functions → Secrets** (no CLI needed):
   add `STRIPE_SECRET_KEY` with that value.
4. **Developers → Webhooks → Add endpoint**: URL
   `https://umtoseyxvszdxbuvuyuk.supabase.co/functions/v1/stripe-webhook`,
   event: `checkout.session.completed`. After creating it, copy its
   **Signing secret** and add it in the same Supabase Secrets page as
   `STRIPE_WEBHOOK_SECRET`.
5. Flip to **Live mode** and repeat steps 2 and 4 (test and live keys/
   webhooks are separate in Stripe) once you're ready for real charges.

**Known limitation**: there's no automated delivery (SMS/email) of the
checkout link — "Send Deposit Link" opens a modal with the real Stripe URL
for the owner to copy/open and share manually (read it over the phone,
text it themselves). Wiring actual SMS delivery would reuse the Twilio
account already connected for the receptionist.

## Review-request SMS on job completion

**Superseded by the automation builder below.** The hardcoded trigger
described in this section was retired in migration
`024_retire_hardcoded_review_trigger_and_seed_default`, which drops
`jobs_completed_send_review`/`notify_job_completed()` and seeds an
equivalent-but-editable `automations` row instead (same message, now with
a 24-hour delay instead of firing instantly, and the owner can change or
disable it without a migration). The Edge Function and Vault secret
described below (`send-review-request`, `job_completed_webhook_secret`)
are now dead code/unused — left in place rather than deleted, but nothing
calls them anymore. This section is kept for history; see "Automation
builder" for the mechanism actually running today.

Real Twilio SMS, fired server-side the instant a job's status becomes
`'done'` — not triggered by any client code, so it fires reliably
regardless of which screen (or future path) completes the job. The demo's
comment on `FEEDBACK` said this outright: *"In production this comes from
the same review-request text the job completion already sends"* — this is
that text.

**Architecture** (source in `supabase/functions/send-review-request/`):
- A Postgres trigger (`jobs_completed_send_review`, migration
  `015_review_request_on_job_complete`) fires `after update on jobs`,
  guarded by `new.status = 'done' and old.status is distinct from 'done'`
  so it only fires on the transition into done, not on later edits to an
  already-completed job.
- The trigger function (`notify_job_completed`, `security definer` so it
  can read the shared secret regardless of which role — owner or tech —
  triggered the update) calls `net.http_post` (the `pg_net` extension) to
  hit the `send-review-request` Edge Function, async so it doesn't block
  the status-update write.
- **Auth between the trigger and the function**: there's no Supabase user
  session on a DB trigger, so a shared secret is used instead — generated
  with `gen_random_bytes()` *inside* Postgres and stored in Supabase Vault
  (`job_completed_webhook_secret`), rather than passed in as a literal
  value. This matters: `apply_migration` calls persist their SQL text in
  Supabase's migration history, so a hardcoded secret there would sit in
  plaintext right next to the Vault entry meant to protect it. The trigger
  reads it from `vault.decrypted_secrets` and sends it as `x-webhook-secret`;
  the edge function checks it against its own `JOB_COMPLETED_WEBHOOK_SECRET`
  secret. **To get the value for that edge function secret**, run this
  yourself in the Supabase SQL Editor (deliberately not something I ran and
  printed here — no reason to route a live secret through my output when
  you can pull it directly):
  ```sql
  select decrypted_secret from vault.decrypted_secrets where name = 'job_completed_webhook_secret';
  ```
- The function looks up the job's customer + company, skips gracefully
  (no SMS, no error) if there's no phone on file or `companies.google_review_link`
  isn't set, normalizes the phone to E.164, and sends via Twilio's REST
  API directly (`fetch` + Basic auth — no SDK needed).

**Required Edge Function secrets** (Supabase dashboard → Edge Functions →
Secrets, same no-CLI path as the Stripe secrets):
- `JOB_COMPLETED_WEBHOOK_SECRET` — the value from the SQL query above.
- `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` — from the Twilio console
  (same account already set up for the AI receptionist).
- `TWILIO_FROM_NUMBER` — the Twilio number already connected to Vapi, in
  E.164 format (e.g. `+14035551234`). One number handles both inbound
  voice and outbound SMS.

**Required setup on the company itself**: `companies.google_review_link`
starts `null` — there's no Settings screen yet to edit it through, so set
it directly (Supabase dashboard → Table Editor → companies → edit the
row), or give me the business's Google review link and I'll set it via a
query. Get the link from Google Business Profile → "Ask for reviews" (a
short `g.page/r/.../review` link) or a `search.google.com/local/writereview?placeid=...`
URL for the business's Place ID.

**Message sent**: `"Hi {FirstName}, thanks for choosing {CompanyName}! If
you have a minute, a quick Google review helps us a lot: {link}"`.

## "On the way" SMS on job start

Same trigger/Vault/edge-function pattern as the review-request SMS above,
fired when a tech taps Start Job (`jobs.status` transitions to
`'in_progress'`). Because `TechHome`'s Start Job button already just does
a plain `jobs.status` update through `advanceJobStatus()`, **no frontend
change was needed at all** — the trigger fires on that write regardless.

- Trigger: `jobs_started_send_on_the_way` → function `notify_job_started()`
  (migration `017_on_the_way_sms_on_job_started`) → Edge Function
  `send-on-the-way-sms` (source in `supabase/functions/`).
- Own dedicated Vault secret, `job_started_webhook_secret` (not shared
  with the review-request trigger's secret — smaller blast radius if one
  ever leaks). Get its value the same way, run yourself in the SQL Editor:
  ```sql
  select decrypted_secret from vault.decrypted_secrets where name = 'job_started_webhook_secret';
  ```
  Set it as the edge function's `JOB_STARTED_WEBHOOK_SECRET` secret.
  `TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN`/`TWILIO_FROM_NUMBER` are shared
  with `send-review-request` (same Twilio account and number).
- **"Live Google Maps link" honestly means**: an interactive
  `maps.google.com` URL to the job's address — the same URL `TechHome`'s
  own Navigate button already uses — not real-time GPS tracking of the
  tech. There's no location pipeline (`tech_locations` has no GPS source
  feeding it), so this doesn't pretend to show where the tech actually is,
  only where they're headed. A genuine live-tracking page would need a
  GPS ingestion pipeline from the tech's phone plus a public tracking
  page — a materially bigger feature than "send a text."
- No client-visible confirmation that the text sent (unlike the deposit
  flow, which shows the Stripe URL directly) — this fires from Postgres
  via `pg_net`, fire-and-forget, so the browser never learns the outcome.
  Check Edge Function logs (Supabase dashboard → Edge Functions →
  send-on-the-way-sms → Logs) to confirm sends.

**Message sent**: `"Hi {FirstName}, {TechFirstName} from {CompanyName} is
on the way to {address}. {mapsLink}"`.

## Automation builder

`src/dashboard/AutomationsPage.jsx` (owner-only tab) — GoHighLevel-style
no-code rules: **when** a trigger fires, **wait** an optional delay, **then**
run an action. Built as a **form-based builder**, not a visual
drag-and-drop canvas: a list of rule cards, each created/edited through a
form (trigger dropdown + config, delay amount/unit, action dropdown +
config). Same no-code outcome as a node-graph editor, a fraction of the
engineering effort, and no new UI dependency — this was an explicit scope
choice (asked and confirmed) over building a canvas library integration.

**Schema** (migration `021_automations_schema`, `action_type` extended to
include `send_email` in migration `026_automation_email_channel`):
- **`automations`** — one row per rule: `trigger_type`
  (`job_status_changed` / `pipeline_stage_changed` / `tag_added`) +
  `trigger_config` (jsonb, e.g. `{"status": "done"}`), `delay_minutes`,
  `action_type` (`send_sms` / `send_email` / `add_tag` / `change_stage` /
  `add_note`) + `action_config` (jsonb, e.g. `{"message": "..."}` for SMS or
  `{"subject": "...", "body": "..."}` for email), `active` toggle.
  Owner-only read/write via RLS, same `current_role() = 'owner'` pattern as
  other settings tables.
- **`automation_runs`** — the delay queue. One row enqueued per matching
  trigger event, `scheduled_for = now() + delay`, `status`
  (`pending`/`sent`/`failed`/`cancelled`). This is how a "wait 24 hours"
  step exists at all — a Postgres trigger can't block/sleep, so instead it
  enqueues a future row that a scheduled job later picks up and executes.

**Trigger detection** (migration `022_automation_trigger_detection`): two
`AFTER UPDATE` triggers, `jobs_status_automations` and
`customers_automations`, each `security definer`. On a matching column
change (job `status`, customer `pipeline_stage`, or a newly-added
`customers.tags` entry — diffed via `array_agg(...) where t <> all(old.tags)`),
they look up every `active` automation with a matching `trigger_type`/
`trigger_config` for that company and insert an `automation_runs` row
with `scheduled_for = now() + (delay_minutes || ' minutes')::interval`.

**Loop prevention**: an automation's own action (e.g. `change_stage`) could
itself match another automation's trigger, cascading indefinitely. Both
trigger functions check a session-local flag,
`current_setting('app.automation_processing', true) = 'true'`, and skip
enqueueing if it's set. `run_due_automations()` (below) sets that flag for
the duration of its run, so nothing the automation engine does can ever
enqueue further runs — only real user/API actions can.

**Scheduler** (migration `023_automation_scheduler`): `pg_cron` (installed
via Supabase's documented pattern —
`create extension pg_cron with schema pg_catalog; grant usage on schema cron to postgres; ...`,
not a bare `create extension pg_cron`) runs `run_due_automations()` every
minute (`cron.schedule('run-due-automations', '* * * * *', ...)`). Each
run: sets the loop-prevention flag, pulls up to 100 due
(`status = 'pending' and scheduled_for <= now()`) rows, and for each one
dispatches on `action_type` — `add_tag`/`change_stage`/`add_note` are
applied directly in SQL; `send_sms` renders the message (template
variables substituted via a `replace()` chain) and calls the
`run-automation-sms` Edge Function through `net.http_post`; `send_email`
renders `subject` and `body` the same way and calls `run-automation-email`.
Both channel functions are authenticated with the same Vault secret
(`automation_webhook_secret`, generated with `gen_random_bytes()` inside
Postgres, same reasoning as the SMS secrets above — never a literal in
migration SQL; reused across both functions rather than split, since they
share one caller and trust boundary). Each row is processed in its own
`begin/exception` block so one failure (e.g. bad phone number, no email on
file) doesn't stop the batch — it's marked `status = 'failed'` with the
error message instead.

**Email channel** (migration `026_automation_email_channel`, Edge Function
`run-automation-email`): sends via [Resend](https://resend.com)'s REST API
(`fetch` + Bearer auth, no SDK — same convention as the Twilio calls). Uses
`customers.email` (already existed on the table; no schema change needed
there); if a matched customer has no email on file, the run is skipped
gracefully (`status = 'sent'`, no error) rather than treated as a failure,
matching how `send_sms` skips customers with no phone. Plain-text body, not
HTML/WYSIWYG — "simple template editor" here means a subject field plus a
body textarea with variable substitution, matching the SMS composer's
level of complexity rather than building a rich-text editor.

**Building an email *sequence***: there's no separate "sequence" concept in
the schema — a sequence is just multiple `send_email` automations sharing
the same trigger (e.g. `pipeline_stage_changed` → `nurture`) with staggered
`delay_minutes` (0, then 3 days, then 7 days, ...). Each is its own rule in
the list, independently editable/toggleable. This was a deliberate reuse of
the existing trigger → wait → action primitive rather than adding a new
"multi-step campaign" object — it produces the same result (a drip of
emails after a contact lands in Nurture) without a second builder UI.

**Template variables** available in a `send_sms` message, or a `send_email`
subject/body (see `SMS_VARIABLES` in `src/lib/automations.js` — the name
predates the email channel but the variable set and substitution logic are
shared across both): `{{first_name}}`, `{{name}}`, `{{company_name}}`,
`{{job_description}}`, `{{job_address}}`, `{{review_link}}`.

**Default automation**: every new company gets one pre-seeded rule on
signup (`create_company_and_owner`, updated in migration `024`) — "Ask for
a Google review," `job_status_changed` → `done`, 24-hour delay, `send_sms`
with the same message the old hardcoded trigger sent. This replaces that
old trigger (see "Review-request SMS" above) rather than running alongside
it, so completed jobs aren't double-texted. The owner can edit or disable
it like any other rule.

**Required Edge Function secrets** (Supabase dashboard → Edge Functions →
Secrets — these are project-wide, so setting them once covers every
function, not just the automation ones): both `run-automation-sms` and
`run-automation-email` need `AUTOMATION_WEBHOOK_SECRET` (get the value the
same way as the other webhook secrets — SQL Editor, not printed here):
```sql
select decrypted_secret from vault.decrypted_secrets where name = 'automation_webhook_secret';
```
`run-automation-sms` also needs
`TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN`/`TWILIO_FROM_NUMBER`, shared with
the other SMS functions. `run-automation-email` needs:
- `RESEND_API_KEY` — from [resend.com](https://resend.com) → API Keys,
  after creating an account and verifying a sending domain (Resend
  requires a verified domain before it'll send from an address on it).
- `RESEND_FROM_EMAIL` — the address to send from, e.g.
  `notifications@yourdomain.com`, on that verified domain.

**Not built**: `pipeline_stage_changed` and `tag_added` triggers exist at
the schema/detection level but have no seeded default automations using
them yet — the form builder supports creating them, just nothing does by
default. `automation_runs` has no UI (no "view scheduled/sent runs" list)
— `AutomationsPage` only reads/writes `automations` itself.

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
| `customer_interactions` | Notes/call-log timeline entries for a `customers` row. Append-only. |
| `automations` | No-code trigger → wait → action rules (see "Automation builder"). Owner-only read/write. |
| `automation_runs` | Delay queue for `automations` — one row per matching trigger event, executed by `run_due_automations()` on a `pg_cron` schedule. Owner-only read. |

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

## Multi-tenancy guarantee

Every table that holds tenant data is scoped by `company_id` and RLS-enabled
— this was true from the very first migration, not bolted on later. What
migration `027_multitenancy_fk_hardening` (+ `028`, a same-day bugfix)
added was a deliberate audit pass specifically checking: *can one company
ever see or corrupt another company's data, even through a bug in the React
code, not just the intended UI flows?*

**Read isolation** (unchanged, already correct): every `SELECT` policy on
every table filters by `company_id = current_company_id()` — directly, or
via a join to a company-scoped parent for the two tables with no
`company_id` column of their own (`job_status_events` joins through
`jobs.company_id`; `campaign_enrollments` joins through
`nurture_campaigns.company_id`). `companies` itself is scoped by
`id = current_company_id()` instead, since it *is* the tenant. There is no
table, and no policy, that returns rows across a `company_id` boundary — a
client can send any query it wants (crafted, buggy, whatever) and Postgres
still only returns that session's own company's rows, because the
filtering happens in the database, not the app.

**Write-side gap this closed**: several `INSERT`/`UPDATE` `WITH CHECK`
clauses validated a row's *own* `company_id` but not that its foreign keys
(`jobs.customer_id`/`job_type_id`/`assigned_tech_id`/`call_id`,
`customers.referred_by`, `customer_interactions.customer_id`,
`campaign_enrollments.customer_id`) pointed at a row in that *same*
company. This never leaked another company's data (reads were always
independently re-scoped), but it meant a bug in the app's own dropdowns —
or a hand-crafted request — could link another company's row id into your
own data (e.g. a job "assigned" to a tech who doesn't work for you). Fixed
by adding `exists (select 1 from <referenced table> where id = <fk column>
and company_id = current_company_id())` to each affected policy's
`WITH CHECK`. Existing rows are untouched (`WITH CHECK` only applies to the
row image being written, not retroactively), and the migration confirmed
zero rows would have violated it (every table was empty at the time).

**Bug caught during this pass, worth knowing about if you write similar
policies later**: the first version of the `customers.referred_by` check
self-joined `customers` (aliased `c2`) to validate the referral target, and
wrote the condition as `c2.id = referred_by`. Because `c2` is itself
`customers`, the unqualified `referred_by` resolved to `c2.referred_by`
(the subquery's own column shadows the outer row), not the row being
inserted — so the check was actually comparing `c2.id = c2.referred_by`
and would have silently rejected almost every legitimate customer insert
that set a referral. Fixed one migration later
(`028_fix_customers_referred_by_check`) by qualifying the outer reference
explicitly (`customers.referred_by`). **Lesson**: any RLS policy that
self-joins a table to validate one of its own columns needs the outer
column reference qualified with the base table name — an unqualified
column name always resolves to the closest (innermost) matching table in
scope, not the policy's own row.

**How this was verified** (beyond reading the SQL): a rolled-back
transactional test (`begin; ... rollback;`, nothing committed) created two
throwaway companies/owners/customers and confirmed, live, that (a) Owner A
attempting to create a job pointed at Company B's `customer_id` gets
rejected with a real `42501 row-level security policy` error, and (b) the
equivalent same-company operations, including the `referred_by`
self-reference, succeed normally. `get_advisors` (security + performance)
was re-run after both migrations and shows no new findings.

## Not built yet (flagged in the schema, not implemented)

- Job photo attachments / Supabase Storage buckets.
- Stripe billing webhooks (subscriptions table exists, nothing populates
  `stripe_customer_id`/`stripe_subscription_id` yet beyond the `starter`
  default).
- Google Calendar / QuickBooks / Slack OAuth flows (integrations table
  exists, `connected` stays `false` until built).
- Any frontend wiring — `app-demo.jsx` still runs on its in-memory mock
  state; it hasn't been pointed at Supabase yet.
