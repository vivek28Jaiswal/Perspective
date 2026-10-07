import { useState } from 'react'
import { Header, PerspectiveWarp } from './components'

export default function App() {
  const [isDark, setIsDark] = useState(false)

  return (
    <div
      className="relative w-screen h-screen min-h-screen flex flex-col justify-between p-6 sm:p-8 overflow-hidden select-none transition-colors duration-500 ease-out"
      style={{ backgroundColor: isDark ? '#000000' : '#FFFFFF' }}
    >
      {/* Top Header / Navigation */}
      <Header isDark={isDark} />

      {/* Center Interactive Hero Typography */}
      <main className="absolute inset-0 flex items-center justify-center z-10 pointer-events-auto">
        <PerspectiveWarp onStateChange={setIsDark} />
      </main>
    </div>
  )
}
