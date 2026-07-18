const Sentry = require("./instrument"); // must load before anything else - see instrument.js
const express = require("express");
const { calcQuote } = require("./lib/pricing");
const { nextAvailableSlots } = require("./lib/scheduling");
const { recordQuote, createBooking } = require("./lib/booking");
const { getCompanyId, validateEnv } = require("./lib/supabase");

// Fail loudly at boot if Supabase env vars are missing, instead of only
// discovering it on the first real phone call.
validateEnv();

const app = express();
app.use(express.json());

// Optional shared-secret check. Set VAPI_WEBHOOK_SECRET in your environment
// and add the same value as a header in Vapi's tool "server" config
// (Custom Credentials -> pass it as an Authorization header) to stop randoms
// from hitting this endpoint.
function checkAuth(req, res, next) {
  const secret = process.env.VAPI_WEBHOOK_SECRET;
  if (!secret) return next(); // no secret set, skip check (fine for local testing only)
  const header = req.headers["authorization"];
  if (header === `Bearer ${secret}`) return next();
  return res.status(401).json({ error: "unauthorized" });
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
      const q = await calcQuote({
        companyId,
        jobType: args.jobType,
        property: args.property,
        urgency: args.urgency,
        partsTier: args.partsTier,
      });
      await recordQuote({
        companyId,
        vapiCallId: callContext.vapiCallId,
        customerPhone: callContext.customerPhone,
        jobType: args.jobType,
        urgency: args.urgency,
        property: args.property,
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
      const slots = await nextAvailableSlots(args.urgency || "standard", companyId);
      return { slots };
    }

    case "book_appointment": {
      const result = await createBooking({
        companyId,
        vapiCallId: callContext.vapiCallId,
        slot: args.slot,
        jobType: args.jobType,
        address: args.address,
        customerPhone: args.customerPhone || callContext.customerPhone,
        customerName: args.customerName,
        smsConsent: args.smsConsent === true,
      });
      if (!result.ok) return { booked: false, reason: result.reason };
      return { booked: true, slot: args.slot };
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
