import PerspectiveWarpButton from './PerspectiveWarpButton'

export default function Header({ isDark = false }) {
  return (
    <header className="w-full flex items-center justify-between z-20 pointer-events-auto">
      <div>
        <PerspectiveWarpButton
          text="WORK"
          isDark={isDark}
          className={isDark ? 'shadow-md shadow-white/5' : ''}
        />
      </div>
      <nav className="flex items-center gap-2.5" aria-label="Main Navigation">
        <PerspectiveWarpButton
          text="ABOUT"
          isDark={isDark}
          className={isDark ? 'shadow-md shadow-white/5' : ''}
        />
        <PerspectiveWarpButton
          text="CONTACT"
          isDark={isDark}
          className={isDark ? 'shadow-md shadow-white/5' : ''}
        />
      </nav>
    </header>
  )
}
