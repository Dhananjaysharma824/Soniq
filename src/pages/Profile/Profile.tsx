import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { clsx } from 'clsx'
import MusicPlayer from '@/components/MusicPlayer/MusicPlayer'
import SettingsPanel from '@/components/VisualizerSettings/SettingsPanel'
import { useStore, type WorldId } from '@/store/useStore'
import { syncUserData } from '@/services/userSync'
import { API_BASE_URL } from '@/services/apiConfig'

export default function Profile() {
  const world = useStore((s) => s.world)
  const setWorld = useStore((s) => s.setWorld)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<{ email: string; name?: string } | null>(null)

  useEffect(() => {
    // Check localStorage session or try /api/auth/me
    const stored = localStorage.getItem('soniq-user')
    if (stored) {
      try {
        setUser(JSON.parse(stored))
      } catch {
        /* ignore */
      }
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    setStatus(null)

    // Try backend auth if available
    try {
      const endpoint = `${API_BASE_URL}${isRegister ? '/api/auth/register' : '/api/auth/login'}`
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: password || 'default123', name: email.split('@')[0] }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.token) localStorage.setItem('soniq-token', data.token)
        const u = data.user || { email, name: email.split('@')[0] }
        localStorage.setItem('soniq-user', JSON.stringify(u))
        setUser(u)
        syncUserData().catch(() => {})
        setStatus('Signed in successfully via SONIQ API.')
        setLoading(false)
        return
      }
    } catch {
      // Backend not running or offline
    }

    // Guest / local fallback
    const localUser = { email: email.trim(), name: email.split('@')[0], guest: true }
    localStorage.setItem('soniq-user', JSON.stringify(localUser))
    setUser(localUser)
    setStatus('Signed in in local session mode.')
    setLoading(false)
  }

  const handleSignOut = () => {
    localStorage.removeItem('soniq-user')
    localStorage.removeItem('soniq-token')
    setUser(null)
    setStatus('Signed out.')
  }

  return (
    <div className="min-h-screen bg-bg-primary pb-32">
      <main className="mx-auto max-w-4xl px-6 py-10 md:px-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-champagne">
            Profile & Controls
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl text-text-primary">
            Settings & Account
          </h1>
          <p className="mt-2 text-sm text-text-secondary max-w-xl">
            Configure your audio rendering pipeline, preferences, and account synchronization.
          </p>
        </motion.div>

        {/* Account Box */}
        <section className="mt-10 rounded-2xl border border-white/[0.06] bg-bg-secondary/40 p-6 md:p-8">
          <h2 className="font-display text-lg font-medium text-text-primary">Account Session</h2>
          {user ? (
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="font-sans text-sm text-text-primary font-medium">{user.name || user.email}</div>
                <div className="font-mono text-xs text-text-secondary mt-0.5">{user.email}</div>
              </div>
              <button
                onClick={handleSignOut}
                className="rounded-full border border-white/[0.1] px-5 py-2 text-xs font-sans text-text-secondary hover:text-text-primary hover:border-white/30 transition-colors"
              >
                Sign out
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-5 space-y-3 max-w-md">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
                required
                className="w-full rounded-xl border border-white/[0.08] bg-surface px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/60 outline-none focus:border-champagne/50"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (optional for guest)"
                className="w-full rounded-xl border border-white/[0.08] bg-surface px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/60 outline-none focus:border-champagne/50"
              />
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-full bg-text-primary px-6 py-2.5 font-display text-xs font-semibold text-bg-primary hover:bg-white transition-all disabled:opacity-50"
                >
                  {loading ? 'Processing...' : isRegister ? 'Register' : 'Sign in'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsRegister((v) => !v)}
                  className="text-xs text-text-secondary hover:text-text-primary"
                >
                  {isRegister ? 'Already have an account? Sign in' : 'Create new account'}
                </button>
              </div>
            </form>
          )}

          {status && <p className="mt-4 text-xs font-mono text-champagne">{status}</p>}
        </section>

        {/* Saved World */}
        <section className="mt-6 rounded-2xl border border-white/[0.06] bg-bg-secondary/40 p-6 md:p-8">
          <h2 className="font-display text-lg font-medium text-text-primary">Default 3D Dimension</h2>
          <p className="mt-1 text-xs text-text-secondary">
            Select the primary environment loaded when opening the Experience portal.
          </p>
          <div className="mt-4 flex flex-wrap gap-2.5">
            {(['space', 'ocean', 'dream', 'tunnel'] as WorldId[]).map((w) => (
              <button
                key={w}
                onClick={() => setWorld(w)}
                className={clsx(
                  'rounded-full px-5 py-2 font-display text-xs font-medium capitalize tracking-wide transition-all',
                  world === w
                    ? 'bg-text-primary text-bg-primary shadow-lg'
                    : 'border border-white/[0.08] bg-surface text-text-secondary hover:text-text-primary hover:border-white/20',
                )}
              >
                {w}
              </button>
            ))}
          </div>
        </section>

        {/* Visualizer Tuning Settings */}
        <section className="mt-6 rounded-2xl border border-white/[0.06] bg-bg-secondary/40 p-6 md:p-8">
          <h2 className="font-display text-lg font-medium text-text-primary">Visualizer DSP Parameters</h2>
          <p className="mt-1 text-xs text-text-secondary mb-5">
            Fine-tune Web Audio frequency gain response, deformation coefficients, and rendering fidelity.
          </p>
          <div className="max-w-md">
            <SettingsPanel />
          </div>
        </section>
      </main>

      <MusicPlayer />
    </div>
  )
}
