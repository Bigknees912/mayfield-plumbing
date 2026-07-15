import { useEffect, useRef, useState } from 'react'

// Standardizes the loading/error handling every dashboard screen needs
// around its main data fetch, so a failure is never a blank screen and
// never silently destroys data that was already showing successfully.
//
// Key behavior: `loading` only ever becomes true before the *first*
// successful load. Once `hasLoadedOnce` is true, a later failure (e.g. a
// realtime-triggered background refresh) sets `error` without wiping
// `loading` back to true - callers should render that as a small
// non-blocking banner (ErrorBanner) over the existing content instead of
// replacing the whole screen (ErrorState), which is reserved for a first
// load that never succeeded at all.
export function useAsyncData(loadFn, deps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const loadFnRef = useRef(loadFn)
  loadFnRef.current = loadFn

  async function load() {
    setError('')
    if (!hasLoadedOnce) setLoading(true)
    try {
      await loadFnRef.current()
      setHasLoadedOnce(true)
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { loading, error, hasLoadedOnce, reload: load }
}
