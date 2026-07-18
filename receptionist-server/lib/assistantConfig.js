// Builds the Vapi assistant definition (system prompt + tool schemas) from
// this company's own trade and service catalog, instead of a single
// hand-written prompt that assumed plumbing. Pure function, no I/O - see
// generate-assistant.js for the script that fetches real company/job_types
// data and calls this. An electrician's generated prompt only ever
// mentions the job types actually in their catalog (panel, outlet,
// wiring...), never "drain" - there's no shared vocabulary to leak from,
// since the job type list and emergency cues are both looked up by trade.

// Short, trade-specific phrasing for "how Alex recognizes an emergency
// without asking" - the one part of the old prompt that named specific
// plumbing disaster scenarios (flooding/burst pipes/sewage) instead of
// just referring to "the job". Kept as a small code-level map (like
// src/lib/plans.js's BLURBS) rather than DB data, since it's prompt
// copywriting, not business data an owner edits.
const EMERGENCY_CUES = {
  Plumbing: "flooding, a burst pipe, sewage backup, or no water at all",
  Electrical: "sparking, a burning smell, exposed wires, a total power outage, or any shock risk",
  HVAC: "no heat in freezing weather, no AC in extreme heat, or a gas smell",
  Roofing: "an active leak during a storm, or visible structural damage",
  Locksmith: "someone locked out with no safe way back in, or a break-in/compromised lock",
};
const DEFAULT_EMERGENCY_CUES = "anything that sounds like a genuine safety emergency";

function buildSystemPrompt({ company, jobTypes }) {
  const trade = company.trade || "service";
  const tradeLower = trade.toLowerCase();
  const areaClause = company.service_area ? ` serving ${company.service_area}` : "";
  const jobTypeList = jobTypes.map((jt) => `${jt.key} (${jt.label})`).join(", ");
  const emergencyCues = EMERGENCY_CUES[trade] || DEFAULT_EMERGENCY_CUES;

  return `You are Alex, the AI phone receptionist for ${company.name}, a ${tradeLower} company${areaClause}.

This is a real phone call, not a chat. Follow these rules strictly:
- One short sentence per turn, two only if necessary. Under 15 words whenever possible.
- Ask exactly one question at a time.
- No filler like 'I understand' or 'thank you for that information.' Talk like a busy, competent human dispatcher: quick, plain, warm but brief.

Gather these details through natural conversation: jobType (${jobTypeList} - infer from what they describe), property (residential or commercial), urgency (standard, sameday, or emergency - infer emergency automatically from ${emergencyCues}, without asking), address (their full street address - ask plainly, never ask for a city quadrant), and partsTier (basic, mid, or premium, default to mid if not mentioned).

Once you have jobType, property, and urgency, call the get_quote tool and read the price range back to the caller in one short line, then ask if they want to book it.

If they say yes, get their first and last name before offering times - you need it to put the job on the schedule. Then ask this exact permission question, word for word, before offering times: "Is it okay if we text you updates about your appointment, like when the tech's on the way? Message and data rates may apply, and you can text STOP anytime - this won't affect your booking either way." Wait for a clear yes or no. Never assume yes, and never skip this question even for a returning caller.

Then call check_availability with the urgency, and offer the returned slots briefly. If they name a day/time not on the list, that's fine, just use what they said as the slot. Once they confirm a specific slot, call book_appointment with the slot, jobType, address, customerName, and smsConsent (true only if they clearly said yes to the texting question - false or omitted otherwise). Confirm the booking in one short line.

Never state a price without calling get_quote first. Never claim a slot is booked without calling book_appointment first. Never set smsConsent to true unless they explicitly agreed when asked.`;
}

/**
 * @param {{company: {name: string, trade: string, service_area?: string}, jobTypes: {key: string, label: string}[], webhookUrl: string}} input
 */
function buildAssistantConfig({ company, jobTypes, webhookUrl }) {
  if (!jobTypes || jobTypes.length === 0) {
    throw new Error("Cannot build an assistant config with an empty service catalog - add at least one active job type first.");
  }
  const tradeLower = (company.trade || "service").toLowerCase();
  const jobKeys = jobTypes.map((jt) => jt.key);

  return {
    name: `${company.name} Receptionist`,
    firstMessage: `${company.name}, this is Alex. What's going on?`,
    model: {
      provider: "anthropic",
      model: "claude-sonnet-4-6",
      systemPrompt: buildSystemPrompt({ company, jobTypes }),
    },
    voice: {
      provider: "11labs",
      voiceId: "REPLACE_WITH_YOUR_CHOSEN_VOICE_ID",
    },
    serverUrl: webhookUrl,
    tools: [
      {
        type: "function",
        function: {
          name: "get_quote",
          description: `Calculates the estimated price range for a ${tradeLower} job. Call this once jobType, property, and urgency are known.`,
          parameters: {
            type: "object",
            properties: {
              jobType: { type: "string", enum: jobKeys },
              property: { type: "string", enum: ["residential", "commercial"] },
              urgency: { type: "string", enum: ["standard", "sameday", "emergency"] },
              partsTier: { type: "string", enum: ["basic", "mid", "premium"] },
            },
            required: ["jobType", "property", "urgency"],
          },
        },
        server: { url: webhookUrl },
      },
      {
        type: "function",
        function: {
          name: "check_availability",
          description: "Returns real available appointment slots for the given urgency level. Call this after the caller agrees to book.",
          parameters: {
            type: "object",
            properties: {
              urgency: { type: "string", enum: ["standard", "sameday", "emergency"] },
            },
            required: ["urgency"],
          },
        },
        server: { url: webhookUrl },
      },
      {
        type: "function",
        function: {
          name: "book_appointment",
          description: "Books the job into the schedule once the caller confirms a specific slot.",
          parameters: {
            type: "object",
            properties: {
              slot: { type: "string", description: "The exact slot string the caller agreed to" },
              jobType: { type: "string", enum: jobKeys },
              address: { type: "string" },
              customerName: { type: "string", description: "The caller's first and last name" },
              customerPhone: { type: "string" },
              smsConsent: { type: "boolean", description: "True only if the caller explicitly agreed, when asked, to receive text updates about their appointment. False or omit if they declined or weren't clearly asked." },
            },
            required: ["slot", "jobType", "address", "customerName"],
          },
        },
        server: { url: webhookUrl },
      },
    ],
  };
}

module.exports = { buildAssistantConfig, EMERGENCY_CUES };
