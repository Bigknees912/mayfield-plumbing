const express = require("express");
const { calcQuote } = require("./lib/pricing");
const { nextAvailableSlots, bookSlot } = require("./lib/scheduling");

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
// as toolCallList. We loop over it and return one result per call.
app.post("/vapi/webhook", checkAuth, (req, res) => {
  const toolCalls = req.body?.message?.toolCallList || [];
  const results = toolCalls.map((call) => {
    try {
      const output = runTool(call.name, call.arguments || {});
      return { toolCallId: call.id, result: JSON.stringify(output) };
    } catch (err) {
      return { toolCallId: call.id, result: `Error: ${err.message}` };
    }
  });
  res.json({ results });
});

function runTool(name, args) {
  switch (name) {
    case "get_quote": {
      const q = calcQuote({
        jobType: args.jobType,
        property: args.property,
        urgency: args.urgency,
        partsTier: args.partsTier,
      });
      return {
        jobLabel: q.jobLabel,
        low: q.low,
        high: q.high,
        message: `${q.jobLabel} runs $${q.low} to $${q.high} CAD.`,
      };
    }

    case "check_availability": {
      const slots = nextAvailableSlots(args.urgency || "standard");
      return { slots };
    }

    case "book_appointment": {
      const result = bookSlot({
        slot: args.slot,
        jobType: args.jobType,
        address: args.address,
        customerPhone: args.customerPhone,
      });
      if (!result.ok) return { booked: false, reason: result.reason };
      return { booked: true, slot: args.slot };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Mayfield receptionist webhook listening on port ${PORT}`);
});
