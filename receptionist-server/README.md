# Mayfield AI Receptionist — Real Phone Deployment

This is the actual server that answers real phone calls once wired up. It
ports the pricing and scheduling logic from the chat demo into three tools
Vapi's voice AI calls mid-conversation, and writes real bookings straight
into the same Supabase database the dashboard app reads — a job Alex books
shows up on the owner's Jobs board and calendar without anyone re-entering
it. You do the account setup yourself (I can't create accounts or enter
payment details for you), but every piece of code is done.

## What each piece does

- `server.js` — the webhook. Vapi hits this whenever the assistant needs a
  price, an available slot, or to book a job.
- `lib/pricing.js` — the same pricing rules as the demo, in one place.
- `lib/scheduling.js` — generates candidate slots and checks them against
  real `jobs` rows in Supabase (by date + time window) so two callers can't
  get double-booked.
- `lib/booking.js` — creates/reuses the `customers` row, inserts the `jobs`
  row, and keeps a `calls` row (quote given, outcome) in sync across the
  whole conversation.
- `lib/supabase.js` — the Supabase client, authenticated as the service
  role since a phone call has no logged-in user to scope RLS to.
- `vapi-assistant.json` — the assistant definition: voice, system prompt,
  and the three tools, ready to send to Vapi's API.

## Step 0: Point this server at a real company

This server has no concept of "no company yet" — every booking needs a
`company_id` to attach to. Sign up as the owner through the dashboard app
first (see the root `AUTH.md`), then in the Supabase dashboard: **Table
Editor → companies**, copy the `id` of your row, and set it as
`SUPABASE_COMPANY_ID` (see `.env.example`). Nothing in this server will
work correctly until that's set.

## Step 1: Create accounts

1. Sign up at [vapi.ai](https://vapi.ai) — this is the voice AI layer, it
   handles speech-to-text, text-to-speech, and the phone call itself.
2. Sign up at [twilio.com](https://twilio.com) and buy a Calgary (403/587/825)
   local number under Phone Numbers → Buy a Number. Costs about $1-2/month
   plus per-minute usage.

## Step 2: Connect Twilio to Vapi

You don't write any Twilio code. Vapi imports the number directly:

1. In the Vapi dashboard, go to Phone Numbers → Import.
2. Choose Twilio, paste your Twilio Account SID and Auth Token (found in
   your Twilio console), and select the number you bought.
3. Vapi now owns the call routing for that number.

## Step 3: Deploy the webhook server

This server needs to be reachable on a public URL, since it's on your
laptop right now and Vapi can't reach `localhost`. Easiest free options:
[Render](https://render.com), [Railway](https://railway.app), or
[Fly.io](https://fly.io). Any of them:

1. Push this folder to a GitHub repo (or drag-and-drop deploy where supported).
2. Set the start command to `npm start`.
3. Once deployed, you'll get a URL like `https://mayfield-receptionist.onrender.com`.

To test locally first instead, install the Vapi CLI and tunnel your machine:

```bash
npm install
npm start
# in a second terminal:
vapi listen --forward-to localhost:3000/vapi/webhook
```

## Step 4: Create the assistant

Open `vapi-assistant.json` and replace every
`https://YOUR-DEPLOYED-SERVER.example.com/vapi/webhook` with your real
deployed URL from Step 3. Also pick a voice: browse voices in the Vapi
dashboard under Voice Library and drop the voiceId into the `voice` block.

Then create the assistant via the API:

```bash
curl --location 'https://api.vapi.ai/assistant' \
  --header 'Authorization: Bearer YOUR_VAPI_API_KEY' \
  --header 'Content-Type: application/json' \
  --data @vapi-assistant.json
```

This returns an assistant ID. In the Vapi dashboard, go to Phone Numbers,
select your imported Twilio number, and assign this assistant to it.

## Step 5: Call it

Call the Twilio number from your own phone. You're talking to Alex, live,
running your actual pricing and scheduling logic.

## Things to tighten before handing this to a real client

- **Security**: set `VAPI_WEBHOOK_SECRET` in your deployment's environment
  variables and add the matching Authorization header in Vapi's tool
  config, so randoms can't hit your webhook directly. Separately, guard
  `SUPABASE_SERVICE_ROLE_KEY` closely — it bypasses every RLS policy in the
  database, unlike the publishable key the browser app uses.
- **Untested call-context assumption**: `server.js` reads the caller's
  phone number and Vapi's call id from `message.call.id` /
  `message.call.customer.number` on the webhook body, per Vapi's
  documented server-message format — but this hasn't been exercised
  against a real live call yet. First real test call, check the Supabase
  `calls` table (or Render's logs) to confirm `vapi_call_id` and
  `customer_phone` actually populated; if not, check the raw payload
  shape (Vapi dashboard → Calls → your call → "Logs" has the raw webhook
  body) and adjust `server.js`'s `callContext` extraction.
- **Real-time pricing sync**: `lib/pricing.js` still has its own hardcoded
  copy of the job types/rates, separate from the `companies` and
  `job_types` tables the dashboard's Settings page would eventually let an
  owner edit. If those are changed in the dashboard, this server won't
  know until `lib/pricing.js` is updated to read from Supabase too.
- **SMS confirmation**: Vapi has a built-in `sms` tool that can text the
  customer a booking confirmation right after the call, using the Twilio
  account you already connected. Worth adding once the core flow works.
- **Per-client pricing**: everything in `lib/pricing.js` is one file. To
  resell this to a second plumbing company, copy the project, change the
  numbers, and create a second Vapi assistant, Supabase company, and
  Twilio number.
