import React, { useState, useMemo } from "react";
import {
  MoreVertical, PhoneIncoming, PhoneMissed, CalendarCheck, TrendingUp,
  AlertTriangle, MapPin, CheckCircle2, Navigation, LogOut, Settings as SettingsIcon,
  Users, CreditCard, X, Lock, Sparkles, ChevronRight, Home, KanbanSquare,
  Copy, RefreshCw, UserPlus, Bell, Play, ArrowLeft, BarChart3, BookUser,
  Sun, Moon, Plug, Star, DollarSign, Percent, CloudRain, ShieldCheck, Gift,
  Route, MessageCircle, Receipt, Clock3, Radar, Calendar, Phone, Clock,
  LogIn, Wallet, ChevronLeft
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";

const LIGHT = {
  bg: "#F5F4ED", card: "#FFFFFF", ink: "#1F1E1D", sub: "#83807A", border: "#E5E1D8",
  accent: "#DA7756", accentSoft: "#F3E3DB", success: "#3D7A5C", successSoft: "#E4EEE7",
  alert: "#BF4C3C", alertSoft: "#F5E2DE", info: "#5B7A8C", infoSoft: "#E4EBEE",
};
const DARK = {
  bg: "#262624", card: "#30302E", ink: "#F5F4ED", sub: "#A6A29A", border: "#40403C",
  accent: "#E08A67", accentSoft: "#3D2F28", success: "#5FAE85", successSoft: "#1E3327",
  alert: "#E28577", alertSoft: "#3A2622", info: "#8FB2C4", infoSoft: "#20313A",
};
// Demo-simple theme swap: mutate the shared object's values in place, then
// bump a version counter to force a re-render. A production build would use
// React Context instead of a mutable module object.
let C = { ...LIGHT };

const PLANS = { starter: { name: "Starter", price: 149 }, growth: { name: "Growth", price: 349 }, pro: { name: "Pro", price: 649 } };

const URGENCY_STYLE = () => ({
  emergency: { label: "Emergency", bg: C.alertSoft, fg: C.alert },
  sameday: { label: "Same-Day", bg: C.accentSoft, fg: C.accent },
  standard: { label: "Standard", bg: C.border, fg: C.sub },
});
const STATUS_META = () => ({
  unassigned: { label: "Unassigned", bg: C.border, fg: C.sub },
  assigned: { label: "Assigned", bg: C.infoSoft, fg: C.info },
  in_progress: { label: "In Progress", bg: C.accentSoft, fg: C.accent },
  done: { label: "Completed", bg: C.successSoft, fg: C.success },
});

function money(n) { return n.toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }); }
function initialsOf(name) { return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(); }
function randomCode() { return "MAYFIELD-" + Math.random().toString(36).slice(2, 6).toUpperCase(); }
// Stable mock distance so the same tech/job pairing always shows the same
// "km away" in this demo. A real build replaces this with each tech's live
// GPS position compared against the job address.
function mockDistanceKm(techId, jobId) {
  let h = 0;
  const s = techId + jobId;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 97;
  return (h / 10 + 0.6).toFixed(1);
}

const INITIAL_TEAM = [
  { id: "u1", name: "Dave Martinez", email: "dave@mayfieldplumbing.ca", phone: "(403) 555-0119", initials: "DM" },
  { id: "u2", name: "Priya Kapoor", email: "priya@mayfieldplumbing.ca", phone: "(403) 555-0284", initials: "PK" },
];
const INITIAL_JOBS = [
  { id: "j1", date: "2026-07-13", time: "6:47 AM", job: "Pipe Repair / Leak", address: "412 17 Ave SE", customer: "Sarah Chen", customerPhone: "(403) 555-0119", urgency: "emergency", low: 415, high: 495, status: "in_progress", techId: "u1", mapX: 62, mapY: 58, notes: "" },
  { id: "j2", date: "2026-07-13", time: "8:12 AM", job: "Toilet Repair", address: "88 Bowness Rd NW", customer: "Mike Douglas", customerPhone: "(403) 555-0284", urgency: "standard", low: 320, high: 385, status: "unassigned", techId: null, mapX: 24, mapY: 22, notes: "" },
  { id: "j3", date: "2026-07-13", time: "8:55 AM", job: "Drain Cleaning", address: "2210 4 St SW", customer: "Sarah Chen", customerPhone: "(403) 555-0119", urgency: "sameday", low: 285, high: 340, status: "assigned", techId: "u1", mapX: 46, mapY: 45, notes: "" },
  { id: "j4", date: "2026-07-13", time: "9:30 AM", job: "Faucet Install", address: "55 Falconridge Blvd NE", customer: "Amara Okafor", customerPhone: "(403) 555-0296", urgency: "standard", low: 260, high: 310, status: "unassigned", techId: null, mapX: 70, mapY: 18, notes: "" },
  { id: "j5", date: "2026-07-13", time: "10:41 AM", job: "Water Heater Repair", address: "301 Signal Hill Ctr SW", customer: "Tom Reyes", customerPhone: "(403) 555-0347", urgency: "sameday", low: 890, high: 1080, status: "done", techId: "u2", mapX: 12, mapY: 60, notes: "" },
  { id: "j6", date: "2026-07-13", time: "2:38 PM", job: "Pipe Repair / Leak", address: "780 Cranston Ave SE", customer: "Linh Tran", customerPhone: "(403) 555-0601", urgency: "emergency", low: 415, high: 495, status: "assigned", techId: "u2", mapX: 68, mapY: 82, notes: "" },
  { id: "j7", date: "2026-07-10", time: "11:00 AM", job: "Drain Cleaning", address: "412 17 Ave SE", customer: "Sarah Chen", customerPhone: "(403) 555-0119", urgency: "standard", low: 285, high: 340, status: "done", techId: "u1", mapX: 62, mapY: 58, notes: "" },
  { id: "j8", date: "2026-07-14", time: "9:00-11:00 AM", job: "Faucet Install", address: "19 Kincora Grove NW", customer: "Priya Anand", customerPhone: "(403) 555-0410", urgency: "standard", low: 260, high: 310, status: "assigned", techId: "u2", mapX: 30, mapY: 15, notes: "" },
  { id: "j9", date: "2026-07-15", time: "1:00-3:00 PM", job: "Toilet Install", address: "44 Aspen Summit SW", customer: "James Wu", customerPhone: "(403) 555-0733", urgency: "standard", low: 390, high: 460, status: "assigned", techId: "u1", mapX: 8, mapY: 50, notes: "" },
  { id: "j10", date: "2026-07-16", time: "9:00-11:00 AM", job: "Sump Pump", address: "780 Cranston Ave SE", customer: "Linh Tran", customerPhone: "(403) 555-0601", urgency: "standard", low: 495, high: 590, status: "assigned", techId: "u2", mapX: 68, mapY: 82, notes: "" },
  { id: "j11", date: "2026-07-17", time: "1:00-3:00 PM", job: "Drain Cleaning", address: "88 Bowness Rd NW", customer: "Mike Douglas", customerPhone: "(403) 555-0284", urgency: "standard", low: 285, high: 340, status: "unassigned", techId: null, mapX: 24, mapY: 22, notes: "" },
];
// Life360-style live status per technician. In a real build this updates
// from each tech's phone GPS every few seconds; here it's a fixed snapshot.
const TECH_STATUS = {
  u1: { mapX: 62, mapY: 60, status: "on_job", label: "At job site", detail: "412 17 Ave SE", updated: "1 min ago" },
  u2: { mapX: 40, mapY: 70, status: "en_route", label: "En route", detail: "ETA 8 min to 780 Cranston Ave SE", updated: "just now" },
};
const WEEKLY_REVENUE = [
  { day: "Mon", revenue: 1240 }, { day: "Tue", revenue: 1890 }, { day: "Wed", revenue: 2210 },
  { day: "Thu", revenue: 1560 }, { day: "Fri", revenue: 2740 }, { day: "Sat", revenue: 980 }, { day: "Sun", revenue: 610 },
];
// Pulled from a live Calgary forecast. Heavy rain days are exactly when sump
// pump and basement flooding calls spike, this is a real, useful trigger,
// not just a novelty banner.
const CALGARY_FORECAST = [
  { day: "Mon", rainChance: 5 }, { day: "Tue", rainChance: 10 }, { day: "Wed", rainChance: 30 },
  { day: "Thu", rainChance: 35 }, { day: "Fri", rainChance: 35 },
];
const DEPOSIT_THRESHOLD = 800;
function depositAmount(high) { return Math.round((high * 0.2) / 5) * 5; }
// Post-job feedback, drives the recovery-task feature. In production this
// comes from the same review-request text the job completion already sends.
const FEEDBACK = [
  { jobId: "j5", customer: "Tom Reyes", sentiment: "positive", note: "Fast and clean work, would call again." },
  { jobId: "j7", customer: "Sarah Chen", sentiment: "negative", note: "Tech was over an hour late and didn't call ahead.", resolved: false },
];
const NURTURE_CAMPAIGNS = [
  { name: "6-Month Maintenance Reminder", trigger: "Completed job, 6 months no return visit", enrolled: 14 },
  { name: "Reschedule Win-Back", trigger: "Declined the confirmation SMS", enrolled: 3 },
  { name: "Negative Feedback Recovery", trigger: "Left negative post-job feedback", enrolled: 1 },
  { name: "Repeat Customer Loyalty", trigger: "3+ completed jobs", enrolled: 6 },
];

function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
      * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif; }
      .tap { cursor: pointer; transition: opacity 0.12s ease, transform 0.12s ease; }
      .tap:active { transform: scale(0.98); }
      input::placeholder { color: #AEAEB2; }
      input, select { font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif; }
    `}</style>
  );
}
function GoogleG({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h11.8c-.5 2.7-2.1 5-4.4 6.6v5.4h7.1c4.2-3.9 6.6-9.6 6.6-16.5z"/>
      <path fill="#34A853" d="M24 46c6 0 10.9-2 14.5-5.4l-7.1-5.4c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9H4.5v5.6C8.1 41 15.4 46 24 46z"/>
      <path fill="#FBBC05" d="M11.8 28.3c-.4-1.3-.7-2.7-.7-4.3s.3-3 .7-4.3v-5.6H4.5C3 17.1 2.2 20.4 2.2 24s.8 6.9 2.3 9.9l7-5.6z"/>
      <path fill="#EA4335" d="M24 10.7c3.3 0 6.2 1.1 8.5 3.3l6.3-6.3C34.9 4.2 30 2 24 2 15.4 2 8.1 7 4.5 14.1l7 5.6c1.7-5.2 6.5-9 12.5-9z"/>
    </svg>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [companyCode, setCompanyCode] = useState("MAYFIELD-4K2P");
  const [team, setTeam] = useState(INITIAL_TEAM);
  const [jobs, setJobs] = useState(INITIAL_JOBS);
  const [screen, setScreen] = useState("login");
  const [pendingOwner, setPendingOwner] = useState(null);
  const [businessProfile, setBusinessProfile] = useState({ trade: "Plumbing", teamSize: "2-5", serviceArea: "Calgary and surrounding areas" });
  const [themeVersion, setThemeVersion] = useState(0);

  function setTheme(mode) {
    Object.assign(C, mode === "dark" ? DARK : LIGHT);
    setThemeVersion((v) => v + 1);
  }

  function loginDemo(role) {
    if (role === "owner") setSession({ role: "owner", name: "Owner", initials: "O", plan: "growth", theme: "light" });
    else setSession({ role: "tech", id: "u1", name: "Dave Martinez", initials: "DM", plan: "growth", theme: "light" });
  }
  function startOwnerSignup(businessName, name) {
    setPendingOwner({ businessName, name });
    setScreen("onboarding");
  }
  function finishOnboarding(profile) {
    setBusinessProfile(profile);
    const code = randomCode();
    setCompanyCode(code);
    setSession({ role: "owner", name: pendingOwner?.name || "Owner", initials: initialsOf(pendingOwner?.name || "Owner"), plan: "growth", theme: "light" });
  }
  function createEmployeeAccount(name, code) {
    if (code.trim().toUpperCase() !== companyCode) return false;
    const id = "u" + (team.length + 1);
    const newTech = { id, name, email: "", initials: initialsOf(name) };
    setTeam([...team, newTech]);
    setSession({ role: "tech", id, name, initials: newTech.initials, plan: "growth", theme: "light" });
    return true;
  }
  function assignJob(jobId, techId) {
    setJobs(jobs.map((j) => (j.id === jobId ? { ...j, techId, status: j.status === "unassigned" ? "assigned" : j.status } : j)));
  }
  function advanceJob(jobId, nextStatus) {
    setJobs(jobs.map((j) => (j.id === jobId ? { ...j, status: nextStatus } : j)));
  }
  function updateJobNotes(jobId, notes) {
    setJobs(jobs.map((j) => (j.id === jobId ? { ...j, notes } : j)));
  }
  function removeTeamMember(id) {
    setTeam(team.filter((t) => t.id !== id));
    setJobs(jobs.map((j) => (j.techId === id ? { ...j, techId: null, status: "unassigned" } : j)));
  }

  if (!session) {
    if (screen === "signup-choice") return <SignupChoice onBack={() => setScreen("login")} onPickOwner={() => setScreen("signup-owner")} onPickEmployee={() => setScreen("signup-employee")} />;
    if (screen === "signup-owner") return <OwnerSignup onBack={() => setScreen("signup-choice")} onCreate={startOwnerSignup} />;
    if (screen === "onboarding") return <Onboarding onFinish={finishOnboarding} />;
    if (screen === "signup-employee") return <EmployeeSignup onBack={() => setScreen("signup-choice")} onCreate={createEmployeeAccount} />;
    return <LoginScreen onLogin={loginDemo} onSignup={() => setScreen("signup-choice")} />;
  }

  return (
    <AppShell
      key={themeVersion}
      session={session}
      businessProfile={businessProfile}
      onLogout={() => { setSession(null); setScreen("login"); setTheme("light"); }}
      team={team} jobs={jobs} companyCode={companyCode}
      onRegenerateCode={() => setCompanyCode(randomCode())}
      onAssignJob={assignJob} onAdvanceJob={advanceJob} onRemoveTeamMember={removeTeamMember}
      onUpdateJobNotes={updateJobNotes}
      onSetTheme={setTheme}
    />
  );
}

/* ---------------- AUTH ---------------- */

function AuthShell({ children, maxWidth = 380 }) {
  return (
    <div style={{ minHeight: "100%", background: LIGHT.bg, padding: "50px 20px" }}>
      <GlobalStyle />
      <div style={{ maxWidth, margin: "0 auto" }}>{children}</div>
    </div>
  );
}
function BackRow({ onBack }) {
  return <div className="tap" onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, color: LIGHT.sub, fontSize: 13, fontWeight: 600, marginBottom: 20 }}><ArrowLeft size={15} /> Back</div>;
}
function LoginScreen({ onLogin, onSignup }) {
  return (
    <AuthShell>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: LIGHT.accent, margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#fff", fontSize: 22 }}>M</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: LIGHT.ink, margin: "0 0 4px 0" }}>Welcome to Mayfield</h1>
        <div style={{ fontSize: 14, color: LIGHT.sub }}>Sign in to your dashboard</div>
      </div>
      <div style={{ background: LIGHT.card, borderRadius: 20, padding: 24, boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)" }}>
        <div className="tap" onClick={() => onLogin("owner")} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, border: `1px solid ${LIGHT.border}`, borderRadius: 12, padding: "12px 0", marginBottom: 16, fontSize: 14.5, fontWeight: 600, color: LIGHT.ink }}>
          <GoogleG /> Continue with Google
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0" }}><div style={{ flex: 1, height: 1, background: LIGHT.border }} /><span style={{ fontSize: 12, color: LIGHT.sub }}>or</span><div style={{ flex: 1, height: 1, background: LIGHT.border }} /></div>
        <div className="tap" onClick={() => onLogin("owner")} style={{ textAlign: "center", background: LIGHT.ink, color: "#fff", borderRadius: 10, padding: "12px 0", fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Sign In as Owner (demo)</div>
        <div className="tap" onClick={() => onLogin("tech")} style={{ textAlign: "center", border: `1px solid ${LIGHT.border}`, color: LIGHT.ink, borderRadius: 10, padding: "12px 0", fontSize: 14, fontWeight: 600 }}>Sign In as Technician (demo)</div>
      </div>
      <div style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: LIGHT.sub }}>New here? <span className="tap" onClick={onSignup} style={{ color: LIGHT.accent, fontWeight: 700 }}>Create an account</span></div>
    </AuthShell>
  );
}
function SignupChoice({ onBack, onPickOwner, onPickEmployee }) {
  return (
    <AuthShell>
      <BackRow onBack={onBack} />
      <h1 style={{ fontSize: 20, fontWeight: 700, color: LIGHT.ink, marginBottom: 4 }}>How are you joining?</h1>
      <div style={{ fontSize: 13.5, color: LIGHT.sub, marginBottom: 24 }}>This decides what you'll see once you're in.</div>
      <div className="tap" onClick={onPickOwner} style={{ background: LIGHT.card, borderRadius: 16, padding: 18, boxShadow: "0 1px 2px rgba(0,0,0,0.04)", display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: LIGHT.accentSoft, display: "flex", alignItems: "center", justifyContent: "center" }}><Sparkles size={19} color={LIGHT.accent} /></div>
        <div style={{ flex: 1 }}><div style={{ fontSize: 14.5, fontWeight: 700, color: LIGHT.ink }}>I'm starting a new business</div><div style={{ fontSize: 12.5, color: LIGHT.sub }}>Set up a company, get a join code for your team</div></div>
        <ChevronRight size={16} color={LIGHT.sub} />
      </div>
      <div className="tap" onClick={onPickEmployee} style={{ background: LIGHT.card, borderRadius: 16, padding: 18, boxShadow: "0 1px 2px rgba(0,0,0,0.04)", display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: LIGHT.infoSoft, display: "flex", alignItems: "center", justifyContent: "center" }}><UserPlus size={19} color={LIGHT.info} /></div>
        <div style={{ flex: 1 }}><div style={{ fontSize: 14.5, fontWeight: 700, color: LIGHT.ink }}>I'm joining my team</div><div style={{ fontSize: 12.5, color: LIGHT.sub }}>Your employer gives you a join code</div></div>
        <ChevronRight size={16} color={LIGHT.sub} />
      </div>
    </AuthShell>
  );
}
function OwnerSignup({ onBack, onCreate }) {
  const [biz, setBiz] = useState(""); const [name, setName] = useState("");
  return (
    <AuthShell>
      <BackRow onBack={onBack} />
      <h1 style={{ fontSize: 20, fontWeight: 700, color: LIGHT.ink, marginBottom: 20 }}>Set up your business</h1>
      <div style={{ background: LIGHT.card, borderRadius: 20, padding: 22, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
        <FieldLabel>Business name</FieldLabel><TextInput value={biz} onChange={setBiz} placeholder="Mayfield Plumbing & Drain" />
        <FieldLabel>Your name</FieldLabel><TextInput value={name} onChange={setName} placeholder="Jordan Reyes" />
        <FieldLabel>Email</FieldLabel><TextInput placeholder="you@company.com" />
        <FieldLabel>Password</FieldLabel><TextInput type="password" placeholder="••••••••" />
        <div className="tap" onClick={() => onCreate(biz, name)} style={{ textAlign: "center", background: LIGHT.ink, color: "#fff", borderRadius: 10, padding: "12px 0", fontSize: 14, fontWeight: 600, marginTop: 6 }}>Continue</div>
      </div>
      <div style={{ fontSize: 12, color: LIGHT.sub, marginTop: 14, textAlign: "center" }}>Next, a few quick questions so we can set up your app.</div>
    </AuthShell>
  );
}
function EmployeeSignup({ onBack, onCreate }) {
  const [name, setName] = useState(""); const [code, setCode] = useState(""); const [error, setError] = useState("");
  function submit() {
    if (!name.trim()) return setError("Enter your name.");
    if (!onCreate(name, code)) setError("That join code doesn't match any company. Double-check with your employer.");
  }
  return (
    <AuthShell>
      <BackRow onBack={onBack} />
      <h1 style={{ fontSize: 20, fontWeight: 700, color: LIGHT.ink, marginBottom: 20 }}>Join your team</h1>
      <div style={{ background: LIGHT.card, borderRadius: 20, padding: 22, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
        <FieldLabel>Your name</FieldLabel><TextInput value={name} onChange={setName} placeholder="Dave Martinez" />
        <FieldLabel>Email</FieldLabel><TextInput placeholder="you@email.com" />
        <FieldLabel>Password</FieldLabel><TextInput type="password" placeholder="••••••••" />
        <FieldLabel>Company join code</FieldLabel><TextInput value={code} onChange={setCode} placeholder="MAYFIELD-4K2P" />
        {error && <div style={{ color: LIGHT.alert, fontSize: 12.5, marginBottom: 10 }}>{error}</div>}
        <div className="tap" onClick={submit} style={{ textAlign: "center", background: LIGHT.ink, color: "#fff", borderRadius: 10, padding: "12px 0", fontSize: 14, fontWeight: 600, marginTop: 6 }}>Join Company</div>
      </div>
      <div style={{ fontSize: 12, color: LIGHT.sub, marginTop: 14, textAlign: "center" }}>Try demo code: <strong style={{ color: LIGHT.ink }}>MAYFIELD-4K2P</strong></div>
    </AuthShell>
  );
}

function Onboarding({ onFinish }) {
  const [trade, setTrade] = useState("Plumbing");
  const [teamSize, setTeamSize] = useState("2-5");
  const [serviceArea, setServiceArea] = useState("Calgary and surrounding areas");
  return (
    <AuthShell maxWidth={420}>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: LIGHT.ink, marginBottom: 4 }}>Tell us about your business</h1>
      <div style={{ fontSize: 13.5, color: LIGHT.sub, marginBottom: 22 }}>This customizes your job types, pricing, and dashboard.</div>

      <FieldLabel>What's your trade?</FieldLabel>
      <ChipRow options={["Plumbing", "Electrical", "HVAC", "Roofing", "Other"]} value={trade} onChange={setTrade} />

      <FieldLabel>Team size (including you)</FieldLabel>
      <ChipRow options={["Just me", "2-5", "6-15", "15+"]} value={teamSize} onChange={setTeamSize} />

      <FieldLabel>Service area</FieldLabel>
      <TextInput value={serviceArea} onChange={setServiceArea} placeholder="e.g. Calgary and surrounding areas" />

      <div className="tap" onClick={() => onFinish({ trade, teamSize, serviceArea })} style={{ textAlign: "center", background: LIGHT.ink, color: "#fff", borderRadius: 10, padding: "13px 0", fontSize: 14, fontWeight: 600, marginTop: 8 }}>
        Finish Setup
      </div>
    </AuthShell>
  );
}
function ChipRow({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
      {options.map((o) => {
        const active = o === value;
        return (
          <div key={o} className="tap" onClick={() => onChange(o)} style={{ padding: "9px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600, border: `1.5px solid ${active ? LIGHT.accent : LIGHT.border}`, background: active ? LIGHT.accentSoft : LIGHT.card, color: active ? LIGHT.accent : LIGHT.ink }}>
            {o}
          </div>
        );
      })}
    </div>
  );
}
function FieldLabel({ children }) { return <div style={{ fontSize: 11.5, fontWeight: 700, color: LIGHT.sub, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>{children}</div>; }
function TextInput({ value, onChange, placeholder, type = "text" }) {
  return <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange && onChange(e.target.value)} style={{ width: "100%", background: "#F5F5F7", border: `1px solid ${LIGHT.border}`, borderRadius: 10, fontSize: 14, padding: "11px 13px", marginBottom: 14, color: LIGHT.ink }} />;
}

/* ---------------- APP SHELL ---------------- */

function AppShell({ session, businessProfile, onLogout, team, jobs, companyCode, onRegenerateCode, onAssignJob, onAdvanceJob, onRemoveTeamMember, onUpdateJobNotes, onSetTheme }) {
  const [tab, setTab] = useState("home");
  const [plansOpen, setPlansOpen] = useState(false);
  const unassignedCount = jobs.filter((j) => j.status === "unassigned").length;

  const ownerTabs = [
    { id: "home", label: "Home", icon: Home }, { id: "jobs", label: "Jobs", icon: KanbanSquare },
    { id: "map", label: "Map", icon: Radar }, { id: "calendar", label: "Calendar", icon: Calendar },
    { id: "clients", label: "Clients", icon: BookUser }, { id: "analytics", label: "Insights", icon: BarChart3 },
    { id: "team", label: "Team", icon: Users }, { id: "settings", label: "Settings", icon: SettingsIcon },
  ];
  const techTabs = [
    { id: "home", label: "Home", icon: Home }, { id: "calendar", label: "Calendar", icon: Calendar },
    { id: "directory", label: "Team", icon: Users }, { id: "settings", label: "Settings", icon: SettingsIcon },
  ];
  const tabs = session.role === "owner" ? ownerTabs : techTabs;

  return (
    <div style={{ minHeight: "100%", background: C.bg, paddingBottom: 76 }}>
      <GlobalStyle />
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px" }}>
        <TopBar session={session} businessProfile={businessProfile} onLogout={onLogout} onOpenPlans={() => setPlansOpen(true)} unassignedCount={unassignedCount} onBell={() => session.role === "owner" && setTab("jobs")} />

        {tab === "home" && session.role === "owner" && <OwnerHome jobs={jobs} team={team} businessProfile={businessProfile} />}
        {tab === "home" && session.role === "tech" && <TechHome jobs={jobs.filter((j) => j.techId === session.id && j.date === "2026-07-13")} onAdvanceJob={onAdvanceJob} onUpdateJobNotes={onUpdateJobNotes} session={session} />}
        {tab === "jobs" && session.role === "owner" && <JobsBoard jobs={jobs} team={team} onAssignJob={onAssignJob} />}
        {tab === "map" && session.role === "owner" && <MapPage team={team} jobs={jobs} />}
        {tab === "calendar" && <CalendarPage jobs={jobs} team={team} myTechId={session.role === "tech" ? session.id : null} />}
        {tab === "directory" && session.role === "tech" && <TeamDirectory team={team} session={session} />}
        {tab === "clients" && session.role === "owner" && <ClientsPage jobs={jobs} />}
        {tab === "analytics" && session.role === "owner" && <AnalyticsPage jobs={jobs} />}
        {tab === "team" && session.role === "owner" && <TeamPage team={team} jobs={jobs} companyCode={companyCode} onRegenerateCode={onRegenerateCode} onRemove={onRemoveTeamMember} />}
        {tab === "settings" && <SettingsPage session={session} businessProfile={businessProfile} onSetTheme={onSetTheme} />}
      </div>
      <BottomNav tabs={tabs} active={tab} onChange={setTab} />
      {plansOpen && <PlanModal currentPlan={session.plan} onClose={() => setPlansOpen(false)} />}
    </div>
  );
}

function TopBar({ session, businessProfile, onLogout, onOpenPlans, unassignedCount, onBell }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div className="tap" onClick={() => setMenuOpen(!menuOpen)} style={{ width: 36, height: 36, borderRadius: 10, background: C.card, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 2px rgba(0,0,0,0.06)" }}>
          <MoreVertical size={18} color={C.ink} />
        </div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: C.ink }}>Mayfield {businessProfile?.trade || "Plumbing"}</div>
          <div className="tap" onClick={onOpenPlans} style={{ fontSize: 12, color: C.accent, fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
            {PLANS[session.plan].name} Plan <ChevronRight size={12} />
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {session.role === "owner" && (
          <div className="tap" onClick={onBell} style={{ position: "relative", width: 36, height: 36, borderRadius: 18, background: C.card, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 2px rgba(0,0,0,0.06)" }}>
            <Bell size={16} color={C.ink} />
            {unassignedCount > 0 && <div style={{ position: "absolute", top: -3, right: -3, background: C.alert, color: "#fff", fontSize: 9.5, fontWeight: 700, borderRadius: 8, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>{unassignedCount}</div>}
          </div>
        )}
        <div style={{ width: 36, height: 36, borderRadius: 18, background: C.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>{session.initials}</div>
      </div>
      {menuOpen && (
        <div style={{ position: "absolute", top: 44, left: 0, background: C.card, borderRadius: 14, boxShadow: "0 4px 16px rgba(0,0,0,0.2)", width: 220, padding: 6, zIndex: 20 }}>
          <MenuItem icon={SettingsIcon} label="Settings" />
          <MenuItem icon={CreditCard} label="Billing & Plan" onClick={() => { setMenuOpen(false); onOpenPlans(); }} />
          <div style={{ height: 1, background: C.border, margin: "6px 4px" }} />
          <MenuItem icon={LogOut} label="Log Out" onClick={onLogout} />
        </div>
      )}
    </div>
  );
}
function MenuItem({ icon: Icon, label, onClick }) {
  return <div className="tap" onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, fontSize: 13.5, color: C.ink }}><Icon size={15} color={C.sub} /><span>{label}</span></div>;
}
function BottomNav({ tabs, active, onChange }) {
  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: C.card, borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "center", padding: "8px 0 max(8px, env(safe-area-inset-bottom))" }}>
      <div style={{ display: "flex", gap: 2, width: "100%", maxWidth: 720, padding: "0 8px" }}>
        {tabs.map((t) => {
          const Icon = t.icon; const isActive = active === t.id;
          return (
            <div key={t.id} className="tap" onClick={() => onChange(t.id)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 0" }}>
              <Icon size={19} color={isActive ? C.accent : C.sub} />
              <span style={{ fontSize: 9.5, fontWeight: 600, color: isActive ? C.accent : C.sub }}>{t.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- OWNER: HOME ---------------- */

function WeatherAlert() {
  const peakDay = CALGARY_FORECAST.reduce((max, d) => (d.rainChance > max.rainChance ? d : max), CALGARY_FORECAST[0]);
  if (peakDay.rainChance < 25) return null;
  return (
    <div style={{ background: C.infoSoft, borderRadius: 16, padding: 14, marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: C.card, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><CloudRain size={17} color={C.info} /></div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{peakDay.rainChance}% rain chance {peakDay.day}</div>
        <div style={{ fontSize: 11.5, color: C.sub }}>Sump pump and basement flooding calls usually spike. Consider an extra on-call shift.</div>
      </div>
    </div>
  );
}
function LicenseBadge() {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: C.successSoft, color: C.success, borderRadius: 20, padding: "4px 10px", fontSize: 10.5, fontWeight: 700, marginBottom: 14 }}>
      <ShieldCheck size={12} /> Licensed &amp; Insured — Alberta
    </div>
  );
}

function RecoveryAlerts() {
  const open = FEEDBACK.filter((f) => f.sentiment === "negative" && !f.resolved);
  if (open.length === 0) return null;
  return (
    <div style={{ background: C.alertSoft, borderRadius: 16, padding: 14, marginBottom: 16 }}>
      {open.map((f, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: C.card, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><AlertTriangle size={17} color={C.alert} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>Negative feedback from {f.customer}</div>
            <div style={{ fontSize: 11.5, color: C.sub }}>"{f.note}" · call them back before they post a public review</div>
          </div>
          <a href="tel:" className="tap" style={{ fontSize: 11.5, fontWeight: 600, color: C.alert, border: `1px solid ${C.alert}`, borderRadius: 8, padding: "6px 10px", whiteSpace: "nowrap", textDecoration: "none" }}>Call Now</a>
        </div>
      ))}
    </div>
  );
}

function OwnerHome({ jobs, team, businessProfile }) {
  const stats = useMemo(() => {
    const answered = jobs.length;
    const booked = jobs.filter((j) => j.status !== "unassigned").length;
    const bookedValue = jobs.reduce((s, j) => s + j.high, 0);
    return { answered, booked, bookedValue };
  }, [jobs]);
  const S = STATUS_META(); const U = URGENCY_STYLE();

  return (
    <>
      <LicenseBadge />
      <div style={{ fontSize: 12.5, color: C.sub, marginBottom: 14 }}>{businessProfile?.serviceArea}</div>
      <RecoveryAlerts />
      <WeatherAlert />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        <StatCard icon={PhoneIncoming} label="Calls Today" value={stats.answered} sub="100% answered" subColor={C.success} />
        <StatCard icon={PhoneMissed} label="Recovered" value={5} sub="vs. voicemail" subColor={C.accent} />
        <StatCard icon={CalendarCheck} label="In Motion" value={stats.booked} sub={money(stats.bookedValue)} subColor={C.success} />
        <StatCard icon={TrendingUp} label="Needs Assignment" value={jobs.filter((j) => j.status === "unassigned").length} sub="tap Jobs to assign" subColor={C.alert} />
      </div>
      <SectionLabel>Recent Calls</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {jobs.slice(0, 6).map((j) => {
          const u = U[j.urgency]; const s = S[j.status]; const tech = team.find((t) => t.id === j.techId);
          return (
            <div key={j.id} style={{ background: C.card, borderRadius: 16, padding: 14, boxShadow: "0 1px 2px rgba(0,0,0,0.04)", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: u.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {j.urgency === "emergency" ? <AlertTriangle size={18} color={u.fg} /> : <CalendarCheck size={18} color={u.fg} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{j.job}</div>
                <div style={{ fontSize: 12.5, color: C.sub }}>{j.customer} · {tech ? tech.name : "Unassigned"}</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 4 }}>{money(j.low)}&ndash;{money(j.high)}</div>
                <Badge bg={s.bg} fg={s.fg}>{s.label}</Badge>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ---------------- OWNER: JOBS BOARD ---------------- */

function JobsBoard({ jobs, team, onAssignJob }) {
  const [pickerFor, setPickerFor] = useState(null);
  const S = STATUS_META();
  const columns = ["unassigned", "assigned", "in_progress", "done"];
  return (
    <>
      <SectionLabel>Job Board</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {columns.map((col) => {
          const colJobs = jobs.filter((j) => j.status === col); const meta = S[col];
          return (
            <div key={col}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}><Badge bg={meta.bg} fg={meta.fg}>{meta.label}</Badge><span style={{ fontSize: 12, color: C.sub }}>{colJobs.length}</span></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {colJobs.map((j) => {
                  const tech = team.find((t) => t.id === j.techId);
                  const needsDeposit = j.high >= DEPOSIT_THRESHOLD;
                  const suggested = tech ? null : [...team].sort((a, b) => mockDistanceKm(a.id, j.id) - mockDistanceKm(b.id, j.id))[0];
                  return (
                    <div key={j.id} style={{ background: C.card, borderRadius: 14, padding: 12, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: C.ink }}>{j.job}</div>
                          <div style={{ fontSize: 12, color: C.sub }}>{j.customer} · {j.address}</div>
                          {j.status === "in_progress" && (
                            <div style={{ fontSize: 10.5, color: C.success, display: "flex", alignItems: "center", gap: 3, marginTop: 3 }}>
                              <CheckCircle2 size={10} /> {tech ? tech.name.split(" ")[0] : "Tech"} checked in at {j.time} · location verified
                            </div>
                          )}
                        </div>
                        {tech && <div style={{ width: 26, height: 26, borderRadius: 13, background: C.accentSoft, color: C.accent, fontSize: 10.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{tech.initials}</div>}
                        {!tech && suggested && (
                          <div className="tap" onClick={() => onAssignJob(j.id, suggested.id)} style={{ fontSize: 11.5, fontWeight: 600, color: "#fff", background: C.accent, borderRadius: 8, padding: "7px 10px", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5 }}>
                            <CheckCircle2 size={12} /> Assign {suggested.name.split(" ")[0]}
                          </div>
                        )}
                        <div className="tap" onClick={() => setPickerFor(j.id)} style={{ fontSize: 16, color: C.sub, padding: "4px 6px", flexShrink: 0 }}>⋯</div>
                      </div>
                      {needsDeposit && (
                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px dashed ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ fontSize: 11, color: C.sub, display: "flex", alignItems: "center", gap: 4 }}><DollarSign size={11} color={C.accent} /> Deposit due: {money(depositAmount(j.high))}</div>
                          <div className="tap" style={{ fontSize: 10.5, fontWeight: 600, color: C.accent }}>Send Deposit Link</div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {colJobs.length === 0 && <div style={{ fontSize: 12, color: C.sub, padding: "6px 2px" }}>Nothing here.</div>}
              </div>
            </div>
          );
        })}
      </div>
      {pickerFor && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 }} onClick={() => setPickerFor(null)}>
          <div style={{ background: C.card, borderRadius: "20px 20px 0 0", padding: 20, width: "100%", maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, marginBottom: 2 }}>Assign to</div>
            <div style={{ fontSize: 11.5, color: C.sub, display: "flex", alignItems: "center", gap: 4, marginBottom: 14 }}><Route size={11} /> Sorted by distance to the job</div>
            {[...team].sort((a, b) => mockDistanceKm(a.id, pickerFor) - mockDistanceKm(b.id, pickerFor)).map((t, i) => (
              <div key={t.id} className="tap" onClick={() => { onAssignJob(pickerFor, t.id); setPickerFor(null); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 6px" }}>
                <div style={{ width: 32, height: 32, borderRadius: 16, background: C.accentSoft, color: C.accent, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{t.initials}</div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 14, color: C.ink }}>{t.name}</span>
                  {i === 0 && <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, color: C.success, background: C.successSoft, borderRadius: 10, padding: "2px 7px" }}>Suggested</span>}
                </div>
                <span style={{ fontSize: 12, color: C.sub }}>{mockDistanceKm(t.id, pickerFor)} km away</span>
              </div>
            ))}
            {team.length === 0 && <div style={{ fontSize: 13, color: C.sub }}>No team members yet.</div>}
          </div>
        </div>
      )}
    </>
  );
}

/* ---------------- OWNER: LIVE MAP ---------------- */

function MapPage({ team, jobs }) {
  const [selected, setSelected] = useState(null);
  const statusMeta = {
    on_job: { label: "At Job Site", color: C.accent },
    en_route: { label: "En Route", color: C.info },
    available: { label: "Available", color: C.success },
    offline: { label: "Offline", color: C.sub },
  };

  return (
    <>
      <SectionLabel>Team Location</SectionLabel>
      <div style={{ position: "relative", background: C.card, borderRadius: 20, boxShadow: "0 1px 2px rgba(0,0,0,0.04)", overflow: "hidden", height: 320, marginBottom: 16 }}>
        {/* Stylized mock map background, streets + blocks */}
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0 }}>
          <rect width="100" height="100" fill={C.bg} />
          {[12, 28, 44, 60, 76, 92].map((x) => <line key={"v"+x} x1={x} y1="0" x2={x} y2="100" stroke={C.border} strokeWidth="0.6" />)}
          {[10, 25, 40, 55, 70, 85].map((y) => <line key={"h"+y} x1="0" y1={y} x2="100" y2={y} stroke={C.border} strokeWidth="0.6" />)}
          <rect x="18" y="14" width="10" height="8" fill={C.border} opacity="0.5" rx="1" />
          <rect x="48" y="32" width="9" height="9" fill={C.border} opacity="0.5" rx="1" />
          <rect x="72" y="60" width="11" height="10" fill={C.border} opacity="0.5" rx="1" />
          <rect x="30" y="70" width="8" height="8" fill={C.border} opacity="0.5" rx="1" />
        </svg>

        {/* Job pins (small, muted) */}
        {jobs.filter((j) => j.status !== "done").map((j) => (
          <div key={j.id} title={j.job} style={{ position: "absolute", left: `${j.mapX}%`, top: `${j.mapY}%`, width: 8, height: 8, borderRadius: 4, background: C.sub, opacity: 0.5, transform: "translate(-50%,-50%)" }} />
        ))}

        {/* Technician live pins */}
        {team.map((t) => {
          const st = TECH_STATUS[t.id] || { mapX: 50, mapY: 50, status: "offline", label: "Offline", detail: "", updated: "" };
          const meta = statusMeta[st.status];
          const isSelected = selected === t.id;
          return (
            <div key={t.id} className="tap" onClick={() => setSelected(isSelected ? null : t.id)}
              style={{ position: "absolute", left: `${st.mapX}%`, top: `${st.mapY}%`, transform: "translate(-50%,-50%)", zIndex: isSelected ? 5 : 2 }}>
              <div style={{ position: "relative", width: 34, height: 34 }}>
                <div style={{ position: "absolute", inset: 0, borderRadius: 17, background: meta.color, opacity: 0.25, animation: "none" }} />
                <div style={{ position: "absolute", inset: 3, borderRadius: 14, background: meta.color, color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${C.card}`, boxShadow: "0 2px 6px rgba(0,0,0,0.2)" }}>
                  {t.initials}
                </div>
              </div>
              {isSelected && (
                <div style={{ position: "absolute", top: 40, left: "50%", transform: "translateX(-50%)", background: C.ink, color: C.bg, borderRadius: 10, padding: "8px 10px", fontSize: 11, whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(0,0,0,0.25)" }}>
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>{t.name}</div>
                  <div>{st.label} · {st.detail}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <SectionLabel>Status</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {team.map((t) => {
          const st = TECH_STATUS[t.id] || { status: "offline", label: "Offline", detail: "No shift active", updated: "" };
          const meta = statusMeta[st.status];
          return (
            <div key={t.id} className="tap" onClick={() => setSelected(t.id)} style={{ background: C.card, borderRadius: 14, padding: 12, boxShadow: "0 1px 2px rgba(0,0,0,0.04)", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: 17, background: meta.color, color: "#fff", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{t.initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: C.ink }}>{t.name}</div>
                <div style={{ fontSize: 11.5, color: C.sub }}>{st.detail || "No shift active"}</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <Badge bg={`${meta.color}22`} fg={meta.color}>{st.label}</Badge>
                <div style={{ fontSize: 10, color: C.sub, marginTop: 3 }}>{st.updated}</div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ---------------- SHARED: CALENDAR ---------------- */

function CalendarPage({ jobs, team, myTechId }) {
  const [viewMonth, setViewMonth] = useState(new Date(2026, 6, 1)); // July 2026
  const [selectedDate, setSelectedDate] = useState("2026-07-13");
  const [confirmState, setConfirmState] = useState({});
  const S = STATUS_META(); const U = URGENCY_STYLE();
  const TODAY = "2026-07-13";

  const relevantJobs = jobs.filter((j) => !myTechId || j.techId === myTechId);
  const jobCountByDate = useMemo(() => {
    const map = {};
    relevantJobs.forEach((j) => { map[j.date] = (map[j.date] || 0) + 1; });
    return map;
  }, [relevantJobs]);

  function toISO(y, m, d) { return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`; }

  const gridCells = useMemo(() => {
    const y = viewMonth.getFullYear(), m = viewMonth.getMonth();
    const firstDow = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(toISO(y, m, d));
    return cells;
  }, [viewMonth]);

  function changeMonth(delta) { setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + delta, 1)); }

  const dayJobs = relevantJobs.filter((j) => j.date === selectedDate).sort((a, b) => a.time.localeCompare(b.time));

  return (
    <>
      <SectionLabel>Calendar</SectionLabel>
      <div style={{ background: C.card, borderRadius: 16, padding: 14, boxShadow: "0 1px 2px rgba(0,0,0,0.04)", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div className="tap" onClick={() => changeMonth(-1)} style={{ width: 30, height: 30, borderRadius: 8, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}><ChevronLeft size={16} color={C.ink} /></div>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: C.ink }}>{viewMonth.toLocaleDateString("en-CA", { month: "long", year: "numeric" })}</div>
          <div className="tap" onClick={() => changeMonth(1)} style={{ width: 30, height: 30, borderRadius: 8, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}><ChevronRight size={16} color={C.ink} /></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, marginBottom: 4 }}>
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i} style={{ textAlign: "center", fontSize: 10.5, fontWeight: 700, color: C.sub, padding: "4px 0" }}>{d}</div>)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
          {gridCells.map((iso, i) => {
            if (!iso) return <div key={i} />;
            const dayNum = parseInt(iso.slice(-2), 10);
            const count = jobCountByDate[iso] || 0;
            const isSelected = iso === selectedDate;
            const isToday = iso === TODAY;
            return (
              <div key={i} className="tap" onClick={() => setSelectedDate(iso)} style={{
                aspectRatio: "1", borderRadius: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
                background: isSelected ? C.ink : "transparent", border: isToday && !isSelected ? `1.5px solid ${C.accent}` : "1.5px solid transparent",
              }}>
                <span style={{ fontSize: 12.5, fontWeight: isSelected ? 700 : 500, color: isSelected ? C.bg : C.ink }}>{dayNum}</span>
                {count > 0 && <div style={{ width: 4, height: 4, borderRadius: 2, background: isSelected ? C.accentSoft : C.accent }} />}
              </div>
            );
          })}
        </div>
      </div>

      <SectionLabel>{new Date(selectedDate + "T00:00:00").toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric" })}</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {dayJobs.map((j) => {
          const u = U[j.urgency]; const s = S[j.status]; const tech = team.find((t) => t.id === j.techId);
          const isUpcoming = j.date > TODAY && j.status !== "done";
          const confirm = confirmState[j.id];
          return (
            <div key={j.id} style={{ background: C.card, borderRadius: 16, padding: 14, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 54, flexShrink: 0, fontSize: 11.5, fontWeight: 700, color: C.sub, lineHeight: 1.3 }}>{j.time}</div>
                <div style={{ width: 1, alignSelf: "stretch", background: C.border }} />
                <div style={{ flex: 1, minWidth: 0, paddingLeft: 4 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{j.job}</div>
                  <div style={{ fontSize: 12, color: C.sub }}>{j.customer} · {tech ? tech.name : "Unassigned"}</div>
                </div>
                <Badge bg={s.bg} fg={s.fg}>{s.label}</Badge>
              </div>
              {isUpcoming && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px dashed ${C.border}` }}>
                  {!confirm && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ fontSize: 11, color: C.sub, display: "flex", alignItems: "center", gap: 4 }}><MessageCircle size={11} /> Confirmation SMS sent, awaiting reply</div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <div className="tap" onClick={() => setConfirmState({ ...confirmState, [j.id]: "confirmed" })} style={{ fontSize: 10.5, fontWeight: 600, color: C.success, border: `1px solid ${C.successSoft}`, borderRadius: 8, padding: "5px 9px" }}>Simulate Yes</div>
                        <div className="tap" onClick={() => setConfirmState({ ...confirmState, [j.id]: "reschedule" })} style={{ fontSize: 10.5, fontWeight: 600, color: C.alert, border: `1px solid ${C.alertSoft}`, borderRadius: 8, padding: "5px 9px" }}>Simulate Reschedule</div>
                      </div>
                    </div>
                  )}
                  {confirm === "confirmed" && <div style={{ fontSize: 11.5, color: C.success, display: "flex", alignItems: "center", gap: 4 }}><CheckCircle2 size={12} /> Customer confirmed, no action needed</div>}
                  {confirm === "reschedule" && <div style={{ fontSize: 11.5, color: C.alert, display: "flex", alignItems: "center", gap: 4 }}><RefreshCw size={12} /> Wants to reschedule, entered into the Reschedule Win-Back campaign</div>}
                </div>
              )}
            </div>
          );
        })}
        {dayJobs.length === 0 && <div style={{ fontSize: 13, color: C.sub, textAlign: "center", padding: "30px 0" }}>Nothing booked this day.</div>}
      </div>
    </>
  );
}

/* ---------------- OWNER: CLIENTS (CRM) ---------------- */

function ClientsPage({ jobs }) {
  const clients = useMemo(() => {
    const map = {};
    jobs.forEach((j) => {
      if (!map[j.customer]) map[j.customer] = { name: j.customer, address: j.address, jobsCount: 0, totalSpent: 0, lastService: j.time };
      map[j.customer].jobsCount += 1;
      map[j.customer].totalSpent += j.high;
      map[j.customer].lastService = j.time;
    });
    return Object.values(map).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [jobs]);

  const invoices = useMemo(() => jobs.filter((j) => j.status === "done").map((j) => ({ ...j, invoiceNo: "INV-" + j.id.slice(1).padStart(4, "0") })), [jobs]);
  const referrals = useMemo(() => clients.filter((c) => c.jobsCount > 1), [clients]);

  return (
    <>
      <div style={{ background: C.accentSoft, borderRadius: 16, padding: 14, marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: C.card, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Gift size={17} color={C.accent} /></div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>Referral rewards active</div>
          <div style={{ fontSize: 11.5, color: C.sub }}>Every client gets a code. $25 credit for them, $25 for whoever they refer.</div>
        </div>
      </div>

      <SectionLabel>Clients ({clients.length})</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
        {clients.map((c, i) => (
          <div key={i} style={{ background: C.card, borderRadius: 16, padding: 14, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 19, background: C.accentSoft, color: C.accent, fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{initialsOf(c.name)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{c.name}</div>
                  {c.jobsCount > 1 && <Badge bg={C.accentSoft} fg={C.accent}><Star size={9} style={{ marginRight: 2, verticalAlign: -1 }} />Repeat</Badge>}
                </div>
                <div style={{ fontSize: 12, color: C.sub }}>{c.address} · {c.jobsCount} job{c.jobsCount > 1 ? "s" : ""}</div>
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink, flexShrink: 0 }}>{money(c.totalSpent)}</div>
            </div>
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px dashed ${C.border}`, fontSize: 10.5, color: C.sub, fontFamily: "monospace" }}>
              Referral code: REF-{initialsOf(c.name)}{String(i + 1).padStart(2, "0")}
            </div>
          </div>
        ))}
      </div>

      <SectionLabel>Nurture Campaigns</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
        {NURTURE_CAMPAIGNS.map((c, i) => (
          <div key={i} style={{ background: C.card, borderRadius: 14, padding: 12, boxShadow: "0 1px 2px rgba(0,0,0,0.04)", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: C.accentSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Sparkles size={15} color={C.accent} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{c.name}</div>
              <div style={{ fontSize: 11, color: C.sub }}>Trigger: {c.trigger}</div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{c.enrolled}</div>
              <div style={{ fontSize: 9.5, color: C.sub }}>enrolled</div>
            </div>
          </div>
        ))}
      </div>

      <SectionLabel>Auto-Generated Invoices</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {invoices.map((inv) => (
          <div key={inv.id} style={{ background: C.card, borderRadius: 14, padding: 12, boxShadow: "0 1px 2px rgba(0,0,0,0.04)", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: C.successSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Receipt size={14} color={C.success} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: C.ink }}>{inv.invoiceNo} · {inv.customer}</div>
              <div style={{ fontSize: 11, color: C.sub }}>{inv.job} · sent automatically on completion</div>
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: C.ink }}>{money(inv.high)}</div>
          </div>
        ))}
        {invoices.length === 0 && <div style={{ fontSize: 12, color: C.sub }}>Invoices appear here automatically when jobs are marked complete.</div>}
      </div>
    </>
  );
}

/* ---------------- OWNER: ANALYTICS ---------------- */

function AnalyticsPage({ jobs }) {
  const jobTypeCounts = useMemo(() => {
    const map = {};
    jobs.forEach((j) => { map[j.job] = (map[j.job] || 0) + 1; });
    return Object.entries(map).map(([name, count]) => ({ name: name.split(" / ")[0].split(" ")[0], count }));
  }, [jobs]);
  const totalRevenue = jobs.reduce((s, j) => s + j.high, 0);
  const avgJob = Math.round(totalRevenue / jobs.length);
  const conversion = Math.round((jobs.filter((j) => j.status !== "unassigned").length / jobs.length) * 100);

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        <StatCard icon={DollarSign} label="Avg Job Value" value={money(avgJob)} sub="this week" subColor={C.sub} />
        <StatCard icon={Percent} label="Conversion" value={conversion + "%"} sub="calls to booked" subColor={C.success} />
      </div>

      <SectionLabel>Revenue This Week</SectionLabel>
      <div style={{ background: C.card, borderRadius: 16, padding: "16px 8px 8px 0", boxShadow: "0 1px 2px rgba(0,0,0,0.04)", marginBottom: 20, height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={WEEKLY_REVENUE} margin={{ top: 5, right: 16, left: -10, bottom: 0 }}>
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: C.sub }} axisLine={{ stroke: C.border }} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: C.sub }} axisLine={false} tickLine={false} width={40} />
            <Tooltip formatter={(v) => money(v)} contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} />
            <Line type="monotone" dataKey="revenue" stroke={C.accent} strokeWidth={2.5} dot={{ r: 3, fill: C.accent }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <SectionLabel>Jobs by Type</SectionLabel>
      <div style={{ background: C.card, borderRadius: 16, padding: "16px 8px 8px 0", boxShadow: "0 1px 2px rgba(0,0,0,0.04)", height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={jobTypeCounts} margin={{ top: 5, right: 16, left: -10, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fontSize: 10.5, fill: C.sub }} axisLine={{ stroke: C.border }} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: C.sub }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
            <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {jobTypeCounts.map((_, i) => <Cell key={i} fill={C.accent} fillOpacity={1 - i * 0.12} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

/* ---------------- OWNER: TEAM ---------------- */

function TeamPage({ team, jobs, companyCode, onRegenerateCode, onRemove }) {
  const [copied, setCopied] = useState(false);
  return (
    <>
      <SectionLabel>Join Code</SectionLabel>
      <div style={{ background: C.card, borderRadius: 16, padding: 18, boxShadow: "0 1px 2px rgba(0,0,0,0.04)", marginBottom: 20 }}>
        <div style={{ fontSize: 12.5, color: C.sub, marginBottom: 10 }}>Share this with employees. They enter it when creating their account.</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1, fontFamily: "monospace", fontSize: 16, fontWeight: 700, color: C.ink, background: C.bg, borderRadius: 10, padding: "10px 12px", letterSpacing: 1 }}>{companyCode}</div>
          <div className="tap" onClick={() => { navigator.clipboard && navigator.clipboard.writeText(companyCode); setCopied(true); setTimeout(() => setCopied(false), 1500); }} style={{ width: 40, height: 40, borderRadius: 10, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}><Copy size={16} color={C.ink} /></div>
          <div className="tap" onClick={onRegenerateCode} style={{ width: 40, height: 40, borderRadius: 10, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}><RefreshCw size={16} color={C.ink} /></div>
        </div>
        {copied && <div style={{ fontSize: 11.5, color: C.success, marginTop: 6 }}>Copied</div>}
      </div>
      <SectionLabel>Team ({team.length})</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {team.map((t) => {
          const completedToday = jobs.filter((j) => j.techId === t.id && j.status === "done").length;
          const active = jobs.filter((j) => j.techId === t.id && j.status !== "done").length;
          return (
            <div key={t.id} style={{ background: C.card, borderRadius: 16, padding: 14, boxShadow: "0 1px 2px rgba(0,0,0,0.04)", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 19, background: C.accentSoft, color: C.accent, fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{t.initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{t.name}</div><div style={{ fontSize: 12, color: C.sub }}>{active} active · {completedToday} completed today</div></div>
              <div className="tap" onClick={() => onRemove(t.id)} style={{ fontSize: 11.5, color: C.alert, fontWeight: 600 }}>Remove</div>
            </div>
          );
        })}
        {team.length === 0 && <div style={{ fontSize: 13, color: C.sub }}>No team members yet.</div>}
      </div>
    </>
  );
}

/* ---------------- TECH: HOME ---------------- */

function TechHome({ jobs, onAdvanceJob, onUpdateJobNotes, session }) {
  const U = URGENCY_STYLE();
  const [notifyFor, setNotifyFor] = useState(null);
  const [reportFor, setReportFor] = useState(null);
  const [detailFor, setDetailFor] = useState(null);
  const [clockedIn, setClockedIn] = useState(true);
  const [clockInTime] = useState("6:30 AM");

  function handleStart(job) {
    onAdvanceJob(job.id, "in_progress");
    setNotifyFor(job);
  }

  const completedToday = jobs.filter((j) => j.status === "done").length;
  const inProgress = jobs.filter((j) => j.status !== "done").length;
  const estimatedPay = jobs.filter((j) => j.status === "done").reduce((s, j) => s + Math.round(j.high * 0.15), 0);

  return (
    <>
      <div style={{ background: C.card, borderRadius: 16, padding: 14, boxShadow: "0 1px 2px rgba(0,0,0,0.04)", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: clockedIn ? C.successSoft : C.border, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Clock size={16} color={clockedIn ? C.success : C.sub} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{clockedIn ? "On shift" : "Off shift"}</div>
          <div style={{ fontSize: 11.5, color: C.sub }}>{clockedIn ? `Clocked in at ${clockInTime}` : "Not clocked in"}</div>
        </div>
        <div className="tap" onClick={() => setClockedIn(!clockedIn)} style={{ fontSize: 12, fontWeight: 600, color: clockedIn ? C.alert : C.success, border: `1px solid ${clockedIn ? C.alertSoft : C.successSoft}`, borderRadius: 8, padding: "7px 12px" }}>
          {clockedIn ? "Clock Out" : "Clock In"}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
        <MiniStat icon={CheckCircle2} value={completedToday} label="Done Today" />
        <MiniStat icon={Clock3} value={inProgress} label="Remaining" />
        <MiniStat icon={Wallet} value={money(estimatedPay)} label="Est. Pay" />
      </div>

      <SectionLabel>Today's Jobs</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {jobs.map((job) => {
          const u = U[job.urgency]; const isDone = job.status === "done"; const isInProgress = job.status === "in_progress";
          return (
            <div key={job.id} style={{ background: C.card, borderRadius: 18, padding: 16, boxShadow: "0 1px 2px rgba(0,0,0,0.04)", opacity: isDone ? 0.55 : 1 }}>
              <div className="tap" onClick={() => setDetailFor(job)}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><div style={{ fontSize: 12, color: C.sub, fontWeight: 600 }}>{job.time}</div><Badge bg={u.bg} fg={u.fg}>{u.label}</Badge></div>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.ink, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>{job.job} <ChevronRight size={15} color={C.sub} /></div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: C.sub, marginBottom: 14 }}><MapPin size={13} color={C.accent} /> {job.address}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <a href={`https://maps.google.com/?q=${encodeURIComponent(job.address + " Calgary AB")}`} target="_blank" rel="noopener noreferrer" style={{ flex: 1, textAlign: "center", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 0", fontSize: 13, color: C.ink, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, textDecoration: "none" }}><Navigation size={13} /> Navigate</a>
                {!isDone && !isInProgress && <div className="tap" onClick={() => handleStart(job)} style={{ flex: 1, textAlign: "center", borderRadius: 10, padding: "10px 0", fontSize: 13, fontWeight: 600, background: C.infoSoft, color: C.info, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Play size={13} /> Start Job</div>}
                {isInProgress && <div className="tap" onClick={() => setReportFor(job)} style={{ flex: 1, textAlign: "center", borderRadius: 10, padding: "10px 0", fontSize: 13, fontWeight: 600, background: C.ink, color: C.bg, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><CheckCircle2 size={13} /> Mark Complete</div>}
                {isDone && <div style={{ flex: 1, textAlign: "center", borderRadius: 10, padding: "10px 0", fontSize: 13, fontWeight: 600, background: C.successSoft, color: C.success, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><CheckCircle2 size={13} /> Done</div>}
              </div>
            </div>
          );
        })}
        {jobs.length === 0 && <div style={{ color: C.sub, fontSize: 13, textAlign: "center", padding: "40px 0" }}>No jobs assigned yet today.</div>}
      </div>
      {notifyFor && <OnTheWayPreview job={notifyFor} onClose={() => setNotifyFor(null)} />}
      {reportFor && <JobReportModal job={reportFor} onClose={() => setReportFor(null)} onComplete={() => { onAdvanceJob(reportFor.id, "done"); setReportFor(null); }} />}
      {detailFor && <JobDetailModal job={detailFor} onClose={() => setDetailFor(null)} onSaveNotes={(notes) => onUpdateJobNotes(detailFor.id, notes)} />}
    </>
  );
}

function JobDetailModal({ job, onClose, onSaveNotes }) {
  const [notes, setNotes] = useState(job.notes || "");
  const [saved, setSaved] = useState(false);
  const U = URGENCY_STYLE()[job.urgency];

  function save() {
    onSaveNotes(notes);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 60 }} onClick={onClose}>
      <div style={{ background: C.card, borderRadius: "20px 20px 0 0", padding: 22, width: "100%", maxWidth: 480, maxHeight: "88vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
          <div>
            <Badge bg={U.bg} fg={U.fg}>{U.label}</Badge>
            <div style={{ fontSize: 19, fontWeight: 700, color: C.ink, marginTop: 8 }}>{job.job}</div>
          </div>
          <div className="tap" onClick={onClose}><X size={20} color={C.sub} /></div>
        </div>
        <div style={{ fontSize: 13, color: C.sub, marginBottom: 18 }}>{job.time} · {job.date}</div>

        <div style={{ background: C.bg, borderRadius: 14, padding: 14, marginBottom: 16 }}>
          <DetailRow icon={Users} label="Customer" value={job.customer} />
          <DetailRow icon={MapPin} label="Address" value={job.address} />
          <DetailRow icon={DollarSign} label="Estimated" value={money(job.low) + " - " + money(job.high)} />
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          <a href={`tel:${(job.customerPhone || "").replace(/[^0-9]/g, "")}`} className="tap" style={{ flex: 1, textAlign: "center", background: C.success, color: "#fff", borderRadius: 10, padding: "12px 0", fontSize: 13.5, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, textDecoration: "none" }}>
            <Phone size={14} /> Call {job.customer.split(" ")[0]}
          </a>
          <a href={`https://maps.google.com/?q=${encodeURIComponent(job.address + " Calgary AB")}`} target="_blank" rel="noopener noreferrer" className="tap" style={{ flex: 1, textAlign: "center", border: `1px solid ${C.border}`, color: C.ink, borderRadius: 10, padding: "12px 0", fontSize: 13.5, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, textDecoration: "none" }}>
            <Navigation size={14} /> Navigate
          </a>
        </div>

        <FieldLabelDark>Job Notes</FieldLabelDark>
        <textarea
          value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything worth remembering about this job or customer, gate code, dog in the yard, parts needed next time..."
          rows={4}
          style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, padding: 12, color: C.ink, marginBottom: 10, resize: "none" }}
        />
        <div className="tap" onClick={save} style={{ textAlign: "center", background: C.ink, color: C.bg, borderRadius: 10, padding: "11px 0", fontSize: 13, fontWeight: 600 }}>
          {saved ? "Saved" : "Save Notes"}
        </div>
      </div>
    </div>
  );
}
function DetailRow({ icon: Icon, label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
      <Icon size={14} color={C.accent} style={{ flexShrink: 0 }} />
      <span style={{ fontSize: 11.5, color: C.sub, width: 76, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: C.ink, fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function JobReportModal({ job, onClose, onComplete }) {
  const [notes, setNotes] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  async function generateReport() {
    if (!notes.trim()) return;
    setLoading(true);
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 400,
          system: "You turn a plumbing technician's rough, shorthand job notes into a clean, professional job report for the customer's file. 3-5 short sentences. Plain language, no jargon a homeowner wouldn't know, no markdown, no headers. State what was found, what was done, and any recommendation, in that order.",
          messages: [{ role: "user", content: `Job: ${job.job} at ${job.address}.\nTech's rough notes: ${notes}` }],
        }),
      });
      const data = await response.json();
      const textBlock = (data.content || []).find((b) => b.type === "text");
      setReport(textBlock ? textBlock.text : "Could not generate a report, try again.");
    } catch (err) {
      setReport("Error generating report: " + err.message);
    }
    setLoading(false);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 20 }} onClick={onClose}>
      <div style={{ background: C.card, borderRadius: 20, padding: 20, maxWidth: 380, width: "100%", maxHeight: "85vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, marginBottom: 2 }}>Finish {job.job}</div>
        <div style={{ fontSize: 11.5, color: C.sub, marginBottom: 14 }}>Jot rough notes, Claude turns it into a clean report for the file</div>

        {!report && (
          <>
            <textarea
              value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. old wax ring failed, replaced ring + bolts, tested flush 3x no leak, customer has older cast iron flange, might need attention in a few years"
              rows={4}
              style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, padding: 12, color: C.ink, marginBottom: 10, resize: "none" }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, color: C.sub, marginBottom: 14 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}><Plug size={13} color={C.sub} /></div>
              2 photos attached (demo placeholder)
            </div>
            <div className="tap" onClick={generateReport} style={{ textAlign: "center", background: notes.trim() ? C.ink : C.border, color: C.bg, borderRadius: 10, padding: "12px 0", fontSize: 13.5, fontWeight: 600 }}>
              {loading ? "Generating…" : "Generate Report"}
            </div>
          </>
        )}

        {report && (
          <>
            <div style={{ background: C.bg, borderRadius: 12, padding: 14, fontSize: 13, color: C.ink, lineHeight: 1.5, marginBottom: 14 }}>{report}</div>
            <div className="tap" onClick={onComplete} style={{ textAlign: "center", background: C.success, color: "#fff", borderRadius: 10, padding: "12px 0", fontSize: 13.5, fontWeight: 600 }}>
              Confirm &amp; Complete Job
            </div>
          </>
        )}
      </div>
    </div>
  );
}
function MiniStat({ icon: Icon, value, label }) {
  return (
    <div style={{ background: C.card, borderRadius: 14, padding: 12, boxShadow: "0 1px 2px rgba(0,0,0,0.04)", textAlign: "center" }}>
      <Icon size={15} color={C.accent} style={{ marginBottom: 5 }} />
      <div style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>{value}</div>
      <div style={{ fontSize: 9.5, color: C.sub, fontWeight: 600, textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}

function TeamDirectory({ team, session }) {
  return (
    <>
      <SectionLabel>Your Team</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {team.map((t) => {
          const isMe = t.id === session.id;
          return (
            <div key={t.id} style={{ background: C.card, borderRadius: 16, padding: 14, boxShadow: "0 1px 2px rgba(0,0,0,0.04)", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 20, background: C.accentSoft, color: C.accent, fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{t.initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{t.name} {isMe && <span style={{ color: C.sub, fontWeight: 500 }}>(you)</span>}</div>
                <div style={{ fontSize: 12, color: C.sub }}>{t.phone || "No number on file"}</div>
              </div>
              {!isMe && t.phone && (
                <a href={`tel:${t.phone.replace(/[^0-9]/g, "")}`} style={{ width: 34, height: 34, borderRadius: 17, background: C.successSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Phone size={14} color={C.success} /></a>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function OnTheWayPreview({ job, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 20 }} onClick={onClose}>
      <div style={{ background: C.card, borderRadius: 20, padding: 20, maxWidth: 340, width: "100%" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <MessageCircle size={16} color={C.info} />
          <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>Text sent to {job.customer}</div>
        </div>
        <div style={{ fontSize: 11, color: C.sub, marginBottom: 14 }}>Sent to the number on file, appears in their regular Messages app</div>

        {/* iMessage-style bubble preview */}
        <div style={{ background: C.bg, borderRadius: 14, padding: 14 }}>
          <div style={{ display: "inline-block", maxWidth: "88%", background: C.info, color: "#fff", borderRadius: "16px 16px 16px 4px", overflow: "hidden" }}>
            <div style={{ padding: "10px 12px 8px 12px", fontSize: 13, lineHeight: 1.4 }}>
              Hi {job.customer.split(" ")[0]}, Dave from Mayfield Plumbing is on the way. ETA 18 min.
            </div>
            {/* Rich link preview card, this is what a plain Google Maps link auto-renders as in iMessage/Android Messages */}
            <div style={{ background: "rgba(255,255,255,0.12)", margin: "0 8px 8px 8px", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ height: 70, background: `linear-gradient(135deg, ${C.accentSoft}, ${C.infoSoft})`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                <MapPin size={22} color={C.accent} />
              </div>
              <div style={{ padding: "6px 8px", fontSize: 10.5, color: "#fff" }}>
                <div style={{ fontWeight: 600 }}>Live location · Dave M.</div>
                <div style={{ opacity: 0.8 }}>maps.google.com</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ fontSize: 11, color: C.sub, marginTop: 12, lineHeight: 1.5 }}>
          This works with a plain text message, no special app required. A Google or Apple Maps link auto-unfurls into a map card in both iMessage and Android Messages.
        </div>
        <div className="tap" onClick={onClose} style={{ textAlign: "center", background: C.ink, color: C.bg, borderRadius: 10, padding: "11px 0", fontSize: 13, fontWeight: 600, marginTop: 14 }}>Got it</div>
      </div>
    </div>
  );
}

/* ---------------- SETTINGS ---------------- */

function SettingsPage({ session, businessProfile, onSetTheme }) {
  const [mode, setMode] = useState("light");
  const [autoAssign, setAutoAssign] = useState(true);
  const [notifyEmergency, setNotifyEmergency] = useState(true);
  const [baseFee, setBaseFee] = useState(149);
  const [hourlyRate, setHourlyRate] = useState(135);
  const [depositPct, setDepositPct] = useState(20);
  const [sameDayMult, setSameDayMult] = useState(1.25);
  const [emergencyMult, setEmergencyMult] = useState(1.75);
  const [commissionPct, setCommissionPct] = useState(15);
  const integrations = [
    { name: "Google Calendar", desc: "Sync bookings both ways", icon: CalendarCheck },
    { name: "QuickBooks", desc: "Auto-send invoices after jobs", icon: DollarSign },
    { name: "Slack", desc: "Team alerts on emergency calls", icon: Bell },
    { name: "Stripe", desc: "Take card payments on the spot", icon: CreditCard },
  ];

  function changeMode(m) { setMode(m); onSetTheme(m); }

  return (
    <>
      {session.role === "owner" && (
        <>
          <SectionLabel>Pricing &amp; Revenue</SectionLabel>
          <div style={{ fontSize: 11.5, color: C.sub, marginBottom: 10, marginTop: -4 }}>These numbers directly change what customers are quoted and what you earn.</div>
          <div style={{ background: C.card, borderRadius: 16, padding: 4, boxShadow: "0 1px 2px rgba(0,0,0,0.04)", marginBottom: 20 }}>
            <NumberRow label="Base service call fee" sub="Charged on every job, before labor" value={baseFee} onChange={setBaseFee} prefix="$" />
            <NumberRow label="Standard hourly rate" sub="Per hour, before urgency multiplier" value={hourlyRate} onChange={setHourlyRate} prefix="$" />
            <NumberRow label="Same-day multiplier" sub="Applied on top of standard pricing" value={sameDayMult} onChange={setSameDayMult} step={0.05} suffix="x" />
            <NumberRow label="Emergency multiplier" sub="Applied for after-hours and urgent calls" value={emergencyMult} onChange={setEmergencyMult} step={0.05} suffix="x" />
            <NumberRow label="Deposit on jobs over $800" sub="Percent of quote collected at booking" value={depositPct} onChange={setDepositPct} suffix="%" />
            <NumberRow label="Technician commission" sub="Used to estimate tech pay per job" value={commissionPct} onChange={setCommissionPct} suffix="%" />
          </div>
        </>
      )}

      <SectionLabel>Profile</SectionLabel>
      <div style={{ background: C.card, borderRadius: 16, padding: 4, boxShadow: "0 1px 2px rgba(0,0,0,0.04)", marginBottom: 20 }}>
        <div style={{ padding: "12px 14px" }}>
          <FieldLabelDark>Name</FieldLabelDark><TextInputDark defaultValue={session.name} />
          <FieldLabelDark>Email</FieldLabelDark><TextInputDark defaultValue="owner@mayfieldplumbing.ca" />
        </div>
      </div>

      <SectionLabel>Password</SectionLabel>
      <div style={{ background: C.card, borderRadius: 16, padding: 4, boxShadow: "0 1px 2px rgba(0,0,0,0.04)", marginBottom: 20 }}>
        <div style={{ padding: "12px 14px" }}>
          <FieldLabelDark>Current password</FieldLabelDark><TextInputDark type="password" placeholder="••••••••" />
          <FieldLabelDark>New password</FieldLabelDark><TextInputDark type="password" placeholder="••••••••" />
          <div className="tap" style={{ textAlign: "center", background: C.ink, color: C.bg, borderRadius: 10, padding: "11px 0", fontSize: 13, fontWeight: 600, marginTop: 4 }}>Update Password</div>
        </div>
      </div>

      <SectionLabel>Appearance</SectionLabel>
      <div style={{ background: C.card, borderRadius: 16, padding: 6, boxShadow: "0 1px 2px rgba(0,0,0,0.04)", marginBottom: 20, display: "flex", gap: 6 }}>
        <div className="tap" onClick={() => changeMode("light")} style={{ flex: 1, textAlign: "center", padding: "10px 0", borderRadius: 10, background: mode === "light" ? C.accentSoft : "transparent", color: mode === "light" ? C.accent : C.sub, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Sun size={14} /> Light</div>
        <div className="tap" onClick={() => changeMode("dark")} style={{ flex: 1, textAlign: "center", padding: "10px 0", borderRadius: 10, background: mode === "dark" ? C.accentSoft : "transparent", color: mode === "dark" ? C.accent : C.sub, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Moon size={14} /> Dark</div>
      </div>

      {session.role === "owner" && (
        <>
          <SectionLabel>Business</SectionLabel>
          <div style={{ background: C.card, borderRadius: 16, padding: 4, boxShadow: "0 1px 2px rgba(0,0,0,0.04)", marginBottom: 20 }}>
            <ToggleRow label="Auto-assign new jobs by zone" sub="Suggests the closest available tech first" value={autoAssign} onChange={setAutoAssign} />
            <ToggleRow label="Notify me on emergency calls" sub="Push + SMS the moment one comes in" value={notifyEmergency} onChange={setNotifyEmergency} />
          </div>

          <SectionLabel>Integrations</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            {integrations.map((it) => {
              const Icon = it.icon;
              return (
                <div key={it.name} style={{ background: C.card, borderRadius: 14, padding: 12, boxShadow: "0 1px 2px rgba(0,0,0,0.04)", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon size={15} color={C.accent} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{it.name}</div><div style={{ fontSize: 11.5, color: C.sub }}>{it.desc}</div></div>
                  <div className="tap" style={{ fontSize: 11.5, fontWeight: 600, color: C.accent, border: `1px solid ${C.accentSoft}`, borderRadius: 8, padding: "6px 10px" }}>Connect</div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <SectionLabel>About</SectionLabel>
      <div style={{ background: C.card, borderRadius: 16, padding: 16, boxShadow: "0 1px 2px rgba(0,0,0,0.04)", fontSize: 12.5, color: C.sub }}>Mayfield AI Receptionist · Demo Build</div>
    </>
  );
}
function NumberRow({ label, sub, value, onChange, prefix, suffix, step = 1 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderBottom: `1px solid ${C.bg}` }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{label}</div>
        <div style={{ fontSize: 11, color: C.sub }}>{sub}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, background: C.bg, borderRadius: 8, padding: "4px 8px", flexShrink: 0 }}>
        {prefix && <span style={{ fontSize: 12.5, color: C.sub }}>{prefix}</span>}
        <input
          type="number" value={value} step={step}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          style={{ width: 50, background: "transparent", border: "none", fontSize: 13, fontWeight: 700, color: C.ink, textAlign: "right" }}
        />
        {suffix && <span style={{ fontSize: 12.5, color: C.sub }}>{suffix}</span>}
      </div>
    </div>
  );
}
function FieldLabelDark({ children }) { return <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 5, marginTop: 10 }}>{children}</div>; }
function TextInputDark({ defaultValue, placeholder, type = "text" }) {
  return <input type={type} defaultValue={defaultValue} placeholder={placeholder} style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13.5, padding: "9px 11px", color: C.ink }} />;
}
function ToggleRow({ label, sub, value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px" }}>
      <div style={{ flex: 1 }}><div style={{ fontSize: 13.5, fontWeight: 600, color: C.ink }}>{label}</div><div style={{ fontSize: 11.5, color: C.sub }}>{sub}</div></div>
      <div className="tap" onClick={() => onChange(!value)} style={{ width: 42, height: 24, borderRadius: 12, background: value ? C.accent : C.border, position: "relative", flexShrink: 0 }}>
        <div style={{ position: "absolute", top: 2, left: value ? 20 : 2, width: 20, height: 20, borderRadius: 10, background: "#fff" }} />
      </div>
    </div>
  );
}

/* ---------------- PLAN MODAL ---------------- */

function PlanModal({ currentPlan, onClose }) {
  const tiers = [
    { id: "starter", name: "Starter", price: 149, features: ["AI receptionist", "Instant phone quoting", "Basic call log"] },
    { id: "growth", name: "Growth", price: 349, features: ["Everything in Starter", "Booking & scheduling", "Job assignment & team accounts", "Google review texts"] },
    { id: "pro", name: "Pro", price: 649, features: ["Everything in Growth", "Multi-location support", "Analytics & CRM", "Priority support"] },
  ];
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 50 }} onClick={onClose}>
      <div style={{ background: C.card, borderRadius: 20, padding: 24, maxWidth: 420, width: "100%", maxHeight: "85vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: C.ink, display: "flex", alignItems: "center", gap: 6 }}><Sparkles size={16} color={C.accent} /> Plans</div>
          <div className="tap" onClick={onClose}><X size={18} color={C.sub} /></div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {tiers.map((t) => {
            const active = t.id === currentPlan;
            return (
              <div key={t.id} style={{ border: `1.5px solid ${active ? C.accent : C.border}`, borderRadius: 14, padding: 16, background: active ? C.accentSoft : "transparent" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: C.ink }}>{t.name}</div>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: C.ink }}>${t.price}<span style={{ fontSize: 11, color: C.sub, fontWeight: 500 }}>/mo</span></div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 12 }}>
                  {t.features.map((f, i) => <div key={i} style={{ fontSize: 12.5, color: C.sub, display: "flex", alignItems: "center", gap: 6 }}><CheckCircle2 size={12} color={C.success} /> {f}</div>)}
                </div>
                {!active && <div className="tap" style={{ textAlign: "center", background: C.ink, color: C.bg, borderRadius: 8, padding: "8px 0", fontSize: 12.5, fontWeight: 600 }}>{PLANS[currentPlan].price < t.price ? "Upgrade" : "Downgrade"}</div>}
                {active && <div style={{ textAlign: "center", fontSize: 12, color: C.accent, fontWeight: 600 }}>Current Plan</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------------- SHARED ---------------- */

function SectionLabel({ children }) { return <div style={{ fontSize: 12, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10, marginLeft: 2 }}>{children}</div>; }
function StatCard({ icon: Icon, label, value, sub, subColor }) {
  return (
    <div style={{ background: C.card, borderRadius: 16, padding: 16, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
      <Icon size={16} color={C.accent} style={{ marginBottom: 8 }} />
      <div style={{ fontSize: 22, fontWeight: 700, color: C.ink, marginBottom: 2 }}>{value}</div>
      <div style={{ fontSize: 11.5, color: C.sub, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 11, color: subColor, fontWeight: 600 }}>{sub}</div>
    </div>
  );
}
function Badge({ children, bg, fg }) { return <span style={{ background: bg, color: fg, padding: "3px 9px", borderRadius: 20, fontSize: 10.5, fontWeight: 700, whiteSpace: "nowrap" }}>{children}</span>; }
