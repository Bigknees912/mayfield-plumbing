# Mayfield AI Receptionist — Real Phone Deployment

This is the actual server that answers real phone calls once wired up. It
ports the pricing and scheduling logic from the chat demo into three tools
Vapi's voice AI calls mid-conversation. You do the account setup yourself
(I can't create accounts or enter payment details for you), but every piece
of code is done.

## What each piece does

- `server.js` — the webhook. Vapi hits this whenever the assistant needs a
  price, an available slot, or to book a job.
- `lib/pricing.js` — the same pricing rules as the demo, in one place.
- `lib/scheduling.js` — generates available slots and checks them against a
  local `bookings.json` file so two callers can't get double-booked.
- `vapi-assistant.json` — the assistant definition: voice, system prompt,
  and the three tools, ready to send to Vapi's API.

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
  config, so randoms can't hit your webhook directly.
- **Real calendar**: `bookings.json` works for a demo but isn't safe for
  concurrent real bookings long-term. Swap `lib/scheduling.js` for a call
  to Google Calendar's freebusy API, or whatever scheduling tool the
  business already uses (Jobber and Housecall Pro both have availability
  APIs).
- **SMS confirmation**: Vapi has a built-in `sms` tool that can text the
  customer a booking confirmation right after the call, using the Twilio
  account you already connected. Worth adding once the core flow works.
- **Per-client pricing**: everything in `lib/pricing.js` is one file. To
  resell this to a second plumbing company, copy the project, change the
  numbers, and create a second Vapi assistant pointed at a second Twilio
  number.
