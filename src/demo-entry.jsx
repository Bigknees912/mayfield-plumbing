// Entry point for the standalone combined demo (public marketing site +
// logged-in product in one React app, see ../app-demo.jsx). This is the
// "single real website" build: served at demo.html, it opens on the public
// homepage and only reveals the dashboard after an explicit sign-in. Kept
// separate from src/main.jsx, which mounts the real Supabase-backed app.
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '../app-demo.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
