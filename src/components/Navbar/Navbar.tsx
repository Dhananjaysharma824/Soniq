import { useState } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { clsx } from 'clsx'
import { useStore, type WorldId } from '@/store/useStore'

const navLinks = [
  { to: '/discover', label: 'Discover' },
  { to: '/experience', label: 'Experience' },
  { to: '/library', label: 'Library' },
]

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const isPlaying = useStore((s) => s.isPlaying)
  const [mobileOpen, setMobileOpen] = useState(false)

  const isHome = location.pathname === '/'
  const isExperience = location.pathname === '/experience'

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-3.5 md:px-8 bg-bg-primary/85 backdrop-blur-2xl border-b border-white/[0.06] shadow-lg transition-all"
    >
      {/* Left — Logo */}
      <Link to="/" className="flex items-center gap-2.5 group" aria-label="SONIQ home">
        <SoniqMark playing={isPlaying} />
        <span className="font-display text-[17px] sm:text-[19px] font-bold tracking-tight text-text-primary">
          SONIQ
        </span>
      </Link>

      {/* Center — Navigation Pill */}
      <nav className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex items-center justify-center pointer-events-auto">
        <div className="flex items-center gap-1 rounded-full bg-white/[0.04] p-1 border border-white/[0.06] backdrop-blur-xl">
          {navLinks.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                clsx(
                  'rounded-full px-4 py-1.5 font-sans text-[11px] font-medium tracking-wide transition-colors duration-200',
                  isActive
                    ? 'bg-white/[0.1] text-text-primary shadow-sm font-semibold'
                    : 'text-text-secondary hover:text-text-primary',
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Right — Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-quick-search'))}
          className="flex items-center gap-1.5 rounded-full border border-champagne/40 bg-champagne/10 px-3 py-1 font-mono text-[11px] text-champagne hover:bg-champagne hover:text-bg-primary transition-all"
          title="Search and play songs in 3D"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span>Search</span>
        </button>
        {isExperience && (
          <button
            onClick={() => document.documentElement.requestFullscreen?.()}
            className="hidden md:block font-sans text-[11px] font-medium tracking-wide text-text-secondary transition-colors hover:text-text-primary"
          >
            Fullscreen
          </button>
        )}
        <button
          onClick={() => navigate('/profile')}
          className="font-sans text-xs sm:text-[13px] font-medium tracking-wide text-text-secondary hover:text-text-primary px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-all"
        >
          Profile
        </button>
        {/* Mobile menu toggle */}
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="md:hidden flex flex-col justify-center items-center gap-[4px] p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] active:scale-95 transition-all w-9 h-9"
          aria-label="Toggle menu"
        >
          <span className={clsx('h-[2px] w-[18px] bg-text-primary rounded-full transition-all duration-200', mobileOpen && 'translate-y-[6px] rotate-45')} />
          <span className={clsx('h-[2px] w-[18px] bg-text-primary rounded-full transition-all duration-200', mobileOpen && 'opacity-0')} />
          <span className={clsx('h-[2px] w-[18px] bg-text-primary rounded-full transition-all duration-200', mobileOpen && '-translate-y-[6px] -rotate-45')} />
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="absolute left-0 right-0 top-full z-50 border-b border-white/[0.04] bg-bg-primary/95 backdrop-blur-xl md:hidden">
          <nav className="flex flex-col px-5 py-4 gap-1">
            {navLinks.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  clsx(
                    'rounded-lg px-3 py-2.5 font-sans text-sm transition-colors',
                    isActive ? 'text-text-primary bg-white/[0.04] font-medium' : 'text-text-secondary',
                  )
                }
              >
                {l.label}
              </NavLink>
            ))}
            <NavLink
              to="/profile"
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                clsx(
                  'rounded-lg px-3 py-2.5 font-sans text-sm transition-colors',
                  isActive ? 'text-text-primary bg-white/[0.04] font-medium' : 'text-text-secondary',
                )
              }
            >
              Profile
            </NavLink>
          </nav>
        </div>
      )}
    </header>
  )
}

function SoniqMark({ playing }: { playing: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true" className="text-text-primary flex-shrink-0">
      <rect x="2" y="8" width="2.2" height="6" rx="1.1" fill="currentColor" className={playing ? 'animate-pulse' : ''} />
      <rect x="6" y="5" width="2.2" height="12" rx="1.1" fill="currentColor" style={{ opacity: 0.8 }} />
      <rect x="10" y="3" width="2.2" height="16" rx="1.1" fill="currentColor" />
      <rect x="14" y="5" width="2.2" height="12" rx="1.1" fill="currentColor" style={{ opacity: 0.8 }} />
      <rect x="18" y="8" width="2.2" height="6" rx="1.1" fill="currentColor" className={playing ? 'animate-pulse' : ''} />
    </svg>
  )
}
