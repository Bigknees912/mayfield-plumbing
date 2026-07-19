const crypto = require("crypto");
const Sentry = require("./instrument"); // must load before anything else - see instrument.js
const express = require("express");
const { calcQuote } = require("./lib/pricing");
const { nextAvailableSlots } = require("./lib/scheduling");
const { recordQuote, createBooking } = require("./lib/booking");
const { getCompanyId, validateEnv } = require("./lib/supabase");
const { validateBookingArgs, validateQuoteArgs } = require("./lib/validate");
const { isRateLimited } = require("./lib/rateLimiter");

// Fail loudly at boot if Supabase env vars are missing, instead of only
// discovering it on the first real phone call.
validateEnv();

const app = express();
app.use(express.json());

// Shared-secret check, now required rather than optional: this endpoint
// creates real jobs/customers and can trigger real SMS spend, so "forgot
// to set the secret" must fail closed (reject everything, loudly, in the
// logs) instead of silently accepting unauthenticated traffic. Set
// VAPI_WEBHOOK_SECRET in your environment and add the same value as a
// header in Vapi's tool "server" config (Custom Credentials -> pass it as
// an Authorization header).
function checkAuth(req, res, next) {
  const secret = process.env.VAPI_WEBHOOK_SECRET;
  if (!secret) {
    console.error("VAPI_WEBHOOK_SECRET is not set - refusing all webhook traffic. Set it before going live (see README's 'Things to tighten').");
    return res.status(503).json({ error: "webhook not configured" });
  }
  const header = req.headers["authorization"] || "";
  const expected = `Bearer ${secret}`;
  // Constant-time comparison - a plain === leaks timing information an
  // attacker could in principle use to guess the secret byte-by-byte.
  const headerBuf = Buffer.from(header);
  const expectedBuf = Buffer.from(expected);
  const matches = headerBuf.length === expectedBuf.length && crypto.timingSafeEqual(headerBuf, expectedBuf);
  if (matches) return next();
  return res.status(401).json({ error: "unauthorized" });
}

// Rate limits, keyed by the caller's phone number (not IP - every request
// here comes from Vapi's own servers, not the end caller, so an IP-based
// limit would throttle every caller on this deployment together instead
// of isolating a single abusive one). Falls back to the Vapi call id, and
// finally to a shared bucket, for the rare case neither is available.
const RATE_LIMITS = {
  book_appointment: { windowMs: 60 * 60 * 1000, max: 3 }, // 3 bookings/hour/caller
  get_quote: { windowMs: 10 * 60 * 1000, max: 15 }, // 15 quotes/10min/caller
  default: { windowMs: 10 * 60 * 1000, max: 40 }, // blanket ceiling on any tool/caller
};

function rateLimitKey(toolName, callContext) {
  const caller = callContext.customerPhone || callContext.vapiCallId || "unknown-caller";
  return `${toolName}:${caller}`;
}

// Vapi sends every tool call for the assistant to this one endpoint, batched
// as toolCallList, alongside call metadata (id, caller's number) under
// message.call. That shape is per Vapi's documented server-message format -
// worth double-checking against a real call's payload (e.g. via get_logs)
// the first time you test this live, since it's untested against an actual
// call from this end.
app.post("/vapi/webhook", checkAuth, async (req, res) => {
  const toolCalls = req.body?.message?.toolCallList || [];
  const call = req.body?.message?.call || {};
  const callContext = { vapiCallId: call.id, customerPhone: call.customer?.number };

  const results = await Promise.all(
    toolCalls.map(async (toolCall) => {
      try {
        if (isRateLimited(rateLimitKey(toolCall.name, callContext), RATE_LIMITS.default) ||
            (RATE_LIMITS[toolCall.name] && isRateLimited(rateLimitKey(toolCall.name, callContext), RATE_LIMITS[toolCall.name]))) {
          return { toolCallId: toolCall.id, result: "Error: too many requests from this caller recently - please try again later." };
        }
        const output = await runTool(toolCall.name, toolCall.arguments || {}, callContext);
        return { toolCallId: toolCall.id, result: JSON.stringify(output) };
      } catch (err) {
        // Without this, a broken booking/quote just becomes a vague thing
        // Alex says on the call - nobody finds out until the customer
        // complains their appointment never actually got scheduled.
        Sentry.captureException(err, { extra: { toolName: toolCall.name, toolArgs: toolCall.arguments, vapiCallId: callContext.vapiCallId } });
        return { toolCallId: toolCall.id, result: `Error: ${err.message}` };
      }
    })
  );
  res.json({ results });
});

async function runTool(name, args, callContext) {
  const companyId = getCompanyId();

  switch (name) {
    case "get_quote": {
      const validated = validateQuoteArgs(args);
      const q = await calcQuote({
        companyId,
        jobType: validated.jobType,
        property: validated.property,
        urgency: validated.urgency,
        partsTier: validated.partsTier,
      });
      await recordQuote({
        companyId,
        vapiCallId: callContext.vapiCallId,
        customerPhone: callContext.customerPhone,
        jobType: validated.jobType,
        urgency: validated.urgency,
        property: validated.property,
        quote: q,
      });
      return {
        jobLabel: q.jobLabel,
        low: q.low,
        high: q.high,
        message: `${q.jobLabel} runs $${q.low} to $${q.high} CAD.`,
      };
    }

    case "check_availability": {
      const urgency = typeof args.urgency === "string" ? args.urgency : "standard";
      const slots = await nextAvailableSlots(urgency, companyId);
      return { slots };
    }

    case "book_appointment": {
      const validated = validateBookingArgs(args);
      const result = await createBooking({
        companyId,
        vapiCallId: callContext.vapiCallId,
        slot: validated.slot,
        jobType: validated.jobType,
        address: validated.address,
        customerPhone: validated.customerPhone || callContext.customerPhone,
        customerName: validated.customerName,
        smsConsent: args.smsConsent === true,
      });
      if (!result.ok) return { booked: false, reason: result.reason };
      return { booked: true, slot: validated.slot };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// Catches anything that escapes the per-tool-call try/catch above (e.g. a
// throw in checkAuth, or a future route added without its own handling).
// Must come after every route is defined.
Sentry.setupExpressErrorHandler(app);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Mayfield receptionist webhook listening on port ${PORT}`);
});
