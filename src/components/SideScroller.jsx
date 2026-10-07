import { useMemo } from 'react'

export default function SideScroller({
  side = 'left',
  visible = false,
  mouseY = 0.5,
  scrollProgress = 0, // 0 = initial (top), 1 = scrolled (bottom)
  onSelectProgress,
  totalBars = 36,
}) {
  const bars = useMemo(() => {
    // Bulge moves down the ladder indicating scroll amount: 0.25 (top) to 0.75 (bottom)
    const baseCenterY = 0.25 + scrollProgress * 0.50
    const clampedY = Math.max(0.12, Math.min(0.88, baseCenterY + (mouseY - 0.5) * 0.14))
    const activeCenter = clampedY * (totalBars - 1)

    return Array.from({ length: totalBars }, (_, i) => {
      const dist = Math.abs(i - activeCenter)

      // Compact widths: base 14px, max bulge 26px
      let width = 14

      if (dist <= 1.5) {
        width = 26
      } else if (dist <= 2.5) {
        width = 22
      } else if (dist <= 3.5) {
        width = 18
      }

      return { index: i, width }
    })
  }, [mouseY, scrollProgress, totalBars])

  const isLeft = side === 'left'

  const handleClick = (e) => {
    if (!onSelectProgress) return
    const rect = e.currentTarget.getBoundingClientRect()
    const clickY = (e.clientY - rect.top) / rect.height
    onSelectProgress(clickY < 0.5 ? 0 : 1)
  }

  return (
    <div
      role="navigation"
      aria-label="Scroll indicator"
      onClick={handleClick}
      className={`fixed top-1/2 -translate-y-1/2 z-50 mix-blend-difference cursor-pointer transition-all duration-300 ease-out ${
        visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      } ${
        isLeft
          ? `left-4 sm:left-8 md:left-10 ${visible ? 'translate-x-0' : '-translate-x-3'}`
          : `right-4 sm:right-8 md:right-10 ${visible ? 'translate-x-0' : 'translate-x-3'}`
      }`}
    >
      <div
        className={`flex flex-col gap-[3.5px] select-none py-2 ${
          isLeft ? 'items-start' : 'items-end'
        }`}
      >
        {bars.map((bar) => (
          <div
            key={bar.index}
            className="h-[1.5px] sm:h-[2px] bg-white rounded-[0.5px] transition-all duration-150 ease-out"
            style={{
              width: `${bar.width}px`,
            }}
          />
        ))}
      </div>
    </div>
  )
}
