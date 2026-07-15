import { useState } from 'react'
import { Home, KanbanSquare, Calendar, LogOut } from 'lucide-react'
import { LIGHT } from '../theme'
import { GlobalStyle } from '../auth/ui'
import OwnerHome from './OwnerHome'
import JobsBoard from './JobsBoard'
import CalendarPage from './CalendarPage'
import TechHome from './TechHome'

const OWNER_TABS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'jobs', label: 'Jobs', icon: KanbanSquare },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
]
const TECH_TABS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
]

// Trimmed-down version of app-demo.jsx's AppShell: only Home, Jobs, and
// Calendar are wired to real data so far, so those are the only tabs
// shown. Map, Clients, Insights, Team, and Settings from the demo aren't
// part of this pass.
export default function AppShell({ session, profile, onSignOut }) {
  const [tab, setTab] = useState('home')
  const isOwner = profile.role === 'owner'
  const tabs = isOwner ? OWNER_TABS : TECH_TABS
  const company = profile.companies

  return (
    <div style={{ minHeight: '100vh', background: LIGHT.bg, paddingBottom: 76 }}>
      <GlobalStyle />
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: LIGHT.ink }}>{company?.name || 'Mayfield'}</div>
            <div style={{ fontSize: 12, color: LIGHT.sub }}>{profile.name} · {isOwner ? 'Owner' : 'Technician'}</div>
          </div>
          <button className="tap" onClick={onSignOut} style={{ width: 36, height: 36, borderRadius: 18, background: LIGHT.card, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
            <LogOut size={16} color={LIGHT.ink} />
          </button>
        </div>

        {tab === 'home' && isOwner && <OwnerHome businessProfile={company} />}
        {tab === 'home' && !isOwner && <TechHome techId={session.user.id} />}
        {tab === 'jobs' && isOwner && <JobsBoard company={company} />}
        {tab === 'calendar' && <CalendarPage myTechId={isOwner ? null : session.user.id} />}
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: LIGHT.card, borderTop: `1px solid ${LIGHT.border}`, display: 'flex', justifyContent: 'center', padding: '8px 0 max(8px, env(safe-area-inset-bottom))' }}>
        <div style={{ display: 'flex', gap: 2, width: '100%', maxWidth: 720, padding: '0 8px' }}>
          {tabs.map((t) => {
            const Icon = t.icon
            const isActive = tab === t.id
            return (
              <button key={t.id} className="tap" onClick={() => setTab(t.id)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '6px 0' }}>
                <Icon size={19} color={isActive ? LIGHT.accent : LIGHT.sub} />
                <span style={{ fontSize: 9.5, fontWeight: 600, color: isActive ? LIGHT.accent : LIGHT.sub }}>{t.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
