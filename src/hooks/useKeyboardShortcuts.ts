import { useEffect } from 'react'
import { useStore } from '@/store/useStore'

export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement)?.isContentEditable) return
      const s = useStore.getState()
      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault()
          s.togglePlay()
          break
        case 'arrowright':
          e.preventDefault()
          s.seek(Math.min((s.duration || 0), s.currentTime + (e.shiftKey ? 10 : 5)))
          break
        case 'arrowleft':
          e.preventDefault()
          s.seek(Math.max(0, s.currentTime - (e.shiftKey ? 10 : 5)))
          break
        case 'arrowup':
          e.preventDefault()
          s.setVolume(Math.min(1, s.volume + 0.05))
          break
        case 'arrowdown':
          e.preventDefault()
          s.setVolume(Math.max(0, s.volume - 0.05))
          break
        case 'm':
          s.toggleMute()
          break
        case 'n':
          s.next()
          break
        case 'p':
          s.prev()
          break
        case 's':
          if (!e.metaKey && !e.ctrlKey) s.toggleShuffle()
          break
        case 'r':
          s.cycleRepeat()
          break
        case '?':
          window.dispatchEvent(new CustomEvent('toggle-shortcuts-modal'))
          break
        case 'l':
          {
            const cur = s.queue[s.currentIndex]
            if (cur) s.toggleFavourite(cur.id, cur)
          }
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
