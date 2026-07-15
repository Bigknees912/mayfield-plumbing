// Shared with src/auth/ui.jsx (which re-exports these) so the auth screens
// and the dashboard screens use one definition instead of two copies.
export const LIGHT = {
  bg: '#F5F4ED', card: '#FFFFFF', ink: '#1F1E1D', sub: '#83807A', border: '#E5E1D8',
  accent: '#DA7756', accentSoft: '#F3E3DB', success: '#3D7A5C', successSoft: '#E4EEE7',
  alert: '#BF4C3C', alertSoft: '#F5E2DE', info: '#5B7A8C', infoSoft: '#E4EBEE',
}

export function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
      * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif; }
      .tap { cursor: pointer; transition: opacity 0.12s ease, transform 0.12s ease; border: none; background: none; }
      .tap:active { transform: scale(0.98); }
      .tap:disabled { opacity: 0.6; cursor: default; }
      input::placeholder, textarea::placeholder { color: #AEAEB2; }
      input, select, textarea { font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif; }
      body { margin: 0; background: ${LIGHT.bg}; }
    `}</style>
  )
}
