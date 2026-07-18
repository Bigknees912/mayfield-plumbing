import { Wrench, Zap, Wind, Home, KeyRound, Hammer } from 'lucide-react'

// Maps a company's free-text `trade` column to a representative icon, used
// wherever the UI shows a generic "this is your line of work" glyph (see
// AppShell's header). Keyed on the same trade names offered by the
// onboarding trade picker (OwnerOnboardingScreen.jsx's ChipRow) and the
// trade starter templates (migration 044) - `trade` itself stays free
// text, so an unrecognized value (hand-typed via the super-admin panel, or
// "Other") just falls back to a generic tools icon rather than erroring.
const TRADE_ICONS = {
  Plumbing: Wrench,
  Electrical: Zap,
  HVAC: Wind,
  Roofing: Home,
  Locksmith: KeyRound,
}

export function tradeIcon(trade) {
  return TRADE_ICONS[trade] || Hammer
}
