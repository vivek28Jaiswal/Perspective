import { useEffect, useRef, useState } from 'react'
import SideScroller from './SideScroller'
import { HERO_VERTEX_SHADER, HERO_FRAGMENT_SHADER } from '../gl/shaders/heroShaders'
import { createShader, createProgram, createGridMesh } from '../gl/utils/webglUtils'

export default function PerspectiveWarp({ onStateChange }) {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const [isHovered, setIsHovered] = useState(false)
  const [mouseY, setMouseY] = useState(0.5)
  const [isWebDesigner, setIsWebDesigner] = useState(false)
  const settleTimerRef = useRef(null)

  const stateRef = useRef({
    hover: 0,
    targetHover: 0,
    curve: 0,
    targetCurve: 0,
    isWebDesigner: false,
    mouseX: 0,
    mouseY: 0,
    targetMouseX: 0,
    targetMouseY: 0,
    gl: null,
    program: null,
    textureInfo0: null,
    textureInfo1: null,
    mesh: null,
    animationFrameId: null,
    lastTime: performance.now(),
  })

  // Single-gesture scroll listener: flips state on a single deliberate scroll
  useEffect(() => {
    let lastToggleTime = 0

    const handleWheel = (e) => {
      const now = performance.now()
      if (now - lastToggleTime < 450) return // cooldown to prevent double-trigger

      if (e.deltaY > 15) {
        // One scroll down -> flip to WEB DESIGNER (stays warped)
        if (!stateRef.current.isWebDesigner) {
          if (settleTimerRef.current) clearTimeout(settleTimerRef.current)
          stateRef.current.isWebDesigner = true
          stateRef.current.targetCurve = 1.0
          stateRef.current.targetHover = 1.0
          setIsWebDesigner(true)
          setIsHovered(true)
          onStateChange?.(true)
          lastToggleTime = now
        }
      } else if (e.deltaY < -15) {
        // One scroll up -> first morph to VIVEK VISUALSS 3D curve animation, then settle to initial state
        if (stateRef.current.isWebDesigner) {
          if (settleTimerRef.current) clearTimeout(settleTimerRef.current)
          stateRef.current.isWebDesigner = false
          stateRef.current.targetCurve = 0.0
          stateRef.current.targetHover = 1.0 // Keep 3D curve active during transition
          setIsWebDesigner(false)
          setIsHovered(true)
          onStateChange?.(false)
          lastToggleTime = now

          // Stage 2: After the VIVEK VISUALSS 3D curve is shown, settle down to flat initial state
          settleTimerRef.current = setTimeout(() => {
            if (!stateRef.current.isWebDesigner) {
              stateRef.current.targetHover = 0.0
              stateRef.current.targetMouseX = 0
              stateRef.current.targetMouseY = 0
              setIsHovered(false)
            }
          }, 480)
        }
      }
    }

    let touchStartY = 0
    let isTouching = false

    const isInteractiveNavTouch = (e) => {
      const target = e.target
      if (!target) return false
      return !!(
        target.closest('header') ||
        target.closest('nav') ||
        target.closest('button') ||
        target.closest('[role="button"]') ||
        target.closest('a')
      )
    }

    const handleTouchStart = (e) => {
      if (isInteractiveNavTouch(e)) {
        isTouching = false
        return
      }

      if (e.touches && e.touches.length > 0) {
        touchStartY = e.touches[0].clientY
        isTouching = true
        setIsHovered(true)
        stateRef.current.targetHover = 1.0

        const container = containerRef.current
        if (container) {
          const rect = container.getBoundingClientRect()
          const x = ((e.touches[0].clientX - rect.left) / rect.width) * 2 - 1
          const y = -(((e.touches[0].clientY - rect.top) / rect.height) * 2 - 1)
          stateRef.current.targetMouseX = Math.max(-1, Math.min(1, x))
          stateRef.current.targetMouseY = Math.max(-1, Math.min(1, y))
        }
      }
    }

    const handleTouchMove = (e) => {
      if (!isTouching || isInteractiveNavTouch(e)) return

      if (e.touches && e.touches.length > 0) {
        const container = containerRef.current
        if (container) {
          const rect = container.getBoundingClientRect()
          const x = ((e.touches[0].clientX - rect.left) / rect.width) * 2 - 1
          const y = -(((e.touches[0].clientY - rect.top) / rect.height) * 2 - 1)
          stateRef.current.targetMouseX = Math.max(-1, Math.min(1, x))
          stateRef.current.targetMouseY = Math.max(-1, Math.min(1, y))
        }
      }
    }

    const handleTouchEnd = (e) => {
      if (!isTouching || isInteractiveNavTouch(e)) {
        isTouching = false
        return
      }
      isTouching = false

      const deltaY = touchStartY - (e.changedTouches[0]?.clientY || touchStartY)
      const now = performance.now()

      if (now - lastToggleTime >= 450) {
        if (deltaY > 35) {
          // Swipe up -> flip to WEB DESIGNER
          if (!stateRef.current.isWebDesigner) {
            if (settleTimerRef.current) clearTimeout(settleTimerRef.current)
            stateRef.current.isWebDesigner = true
            stateRef.current.targetCurve = 1.0
            stateRef.current.targetHover = 1.0
            setIsWebDesigner(true)
            setIsHovered(true)
            onStateChange?.(true)
            lastToggleTime = now
            return
          }
        } else if (deltaY < -35) {
          // Swipe down -> flip back to VIVEK VISUALSS
          if (stateRef.current.isWebDesigner) {
            if (settleTimerRef.current) clearTimeout(settleTimerRef.current)
            stateRef.current.isWebDesigner = false
            stateRef.current.targetCurve = 0.0
            stateRef.current.targetHover = 1.0
            setIsWebDesigner(false)
            setIsHovered(true)
            onStateChange?.(false)
            lastToggleTime = now

            settleTimerRef.current = setTimeout(() => {
              if (!stateRef.current.isWebDesigner) {
                stateRef.current.targetHover = 0.0
                stateRef.current.targetMouseX = 0
                stateRef.current.targetMouseY = 0
                setIsHovered(false)
              }
            }, 480)
            return
          }
        }
      }

      // If in VIVEK VISUALSS mode, ease back to flat after release
      if (!stateRef.current.isWebDesigner) {
        settleTimerRef.current = setTimeout(() => {
          if (!stateRef.current.isWebDesigner && !isTouching) {
            stateRef.current.targetHover = 0.0
            stateRef.current.targetMouseX = 0
            stateRef.current.targetMouseY = 0
            setIsHovered(false)
          }
        }, 300)
      }
    }

    window.addEventListener('wheel', handleWheel, { passive: true })
    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: true })
    window.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current)
      window.removeEventListener('wheel', handleWheel)
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [onStateChange])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const gl =
      canvas.getContext('webgl', { antialias: true, alpha: true }) ||
      canvas.getContext('experimental-webgl')

    if (!gl) {
      console.warn('WebGL is not supported in this environment')
      return
    }

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    gl.clearColor(0.0, 0.0, 0.0, 0.0)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    const vertShader = createShader(gl, gl.VERTEX_SHADER, HERO_VERTEX_SHADER)
    const fragShader = createShader(gl, gl.FRAGMENT_SHADER, HERO_FRAGMENT_SHADER)
    const program = createProgram(gl, vertShader, fragShader)

    if (!program) return

    gl.useProgram(program)

    const mesh = createGridMesh(gl, 200, 30)
    stateRef.current.mesh = mesh

    const aGrid = gl.getAttribLocation(program, 'a_grid')
    gl.enableVertexAttribArray(aGrid)
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.posBuffer)
    gl.vertexAttribPointer(aGrid, 2, gl.FLOAT, false, 0, 0)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer)

    function renderTextTexture(label, fontSize = 160, letterSpacing = '-4px') {
      const offCanvas = document.createElement('canvas')
      const width = 3072
      const height = 512
      offCanvas.width = width
      offCanvas.height = height
      const ctx = offCanvas.getContext('2d')

      ctx.clearRect(0, 0, width, height)

      ctx.fillStyle = '#000000'
      ctx.font = `900 ${fontSize}px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
      if ('letterSpacing' in ctx) {
        ctx.letterSpacing = letterSpacing
      }
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      ctx.fillText(label, width / 2, height / 2)

      const metrics = ctx.measureText(label)
      const textWidth = metrics.width
      const ascent = metrics.actualBoundingBoxAscent || 120
      const descent = metrics.actualBoundingBoxDescent || 32
      const textHeight = ascent + descent

      const padX = 28
      const padY = 28

      const minX = (width / 2 - textWidth / 2 - padX) / width
      const maxX = (width / 2 + textWidth / 2 + padX) / width
      const topY = height / 2 - ascent - padY
      const botY = height / 2 + descent + padY

      const vTop = 1.0 - topY / height
      const vBot = 1.0 - botY / height

      const texture = gl.createTexture()
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, offCanvas)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

      return {
        texture,
        bounds: [minX, maxX, vBot, vTop],
        aspect: textWidth / textHeight,
      }
    }

    stateRef.current.textureInfo0 = renderTextTexture('VIVEK VISUALSS', 160, '-4px')
    stateRef.current.textureInfo1 = renderTextTexture('WEB DESIGNER', 160, '-2px')

    if (document.fonts) {
      document.fonts.load('900 160px Inter').then(() => {
        stateRef.current.textureInfo0 = renderTextTexture('VIVEK VISUALSS', 160, '-4px')
        stateRef.current.textureInfo1 = renderTextTexture('WEB DESIGNER', 160, '-2px')
      }).catch(() => {})
    }

    stateRef.current.gl = gl
    stateRef.current.program = program

    const uResolution = gl.getUniformLocation(program, 'u_resolution')
    const uHover = gl.getUniformLocation(program, 'u_hover')
    const uMouse = gl.getUniformLocation(program, 'u_mouse')
    const uCurve = gl.getUniformLocation(program, 'u_curve')

    const uTextAspect0 = gl.getUniformLocation(program, 'u_textAspect0')
    const uTextBounds0 = gl.getUniformLocation(program, 'u_textBounds0')
    const uTextAspect1 = gl.getUniformLocation(program, 'u_textAspect1')
    const uTextBounds1 = gl.getUniformLocation(program, 'u_textBounds1')

    const uTexture0 = gl.getUniformLocation(program, 'u_texture0')
    const uTexture1 = gl.getUniformLocation(program, 'u_texture1')

    function resizeCanvas() {
      const rect = container.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const width = Math.floor(rect.width * dpr)
      const height = Math.floor(rect.height * dpr)

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
        gl.viewport(0, 0, width, height)
      }
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    function renderLoop(now) {
      const state = stateRef.current
      const dt = Math.min((now - state.lastTime) / 1000, 0.1)
      state.lastTime = now

      const hoverSpeed = 5.2
      state.hover += (state.targetHover - state.hover) * (1.0 - Math.exp(-hoverSpeed * dt))

      // Snappy smooth curve transition between inside and outside curve
      const curveSpeed = 6.0
      state.curve += (state.targetCurve - state.curve) * (1.0 - Math.exp(-curveSpeed * dt))

      const mouseSpeed = 6.5
      state.mouseX += (state.targetMouseX - state.mouseX) * (1.0 - Math.exp(-mouseSpeed * dt))
      state.mouseY += (state.targetMouseY - state.mouseY) * (1.0 - Math.exp(-mouseSpeed * dt))

      gl.clear(gl.COLOR_BUFFER_BIT)

      gl.uniform2f(uResolution, canvas.width, canvas.height)
      gl.uniform1f(uHover, state.hover)
      gl.uniform1f(uCurve, state.curve)
      gl.uniform2f(uMouse, state.mouseX, state.mouseY)

      if (state.textureInfo0) {
        gl.uniform1f(uTextAspect0, state.textureInfo0.aspect)
        gl.uniform4f(
          uTextBounds0,
          state.textureInfo0.bounds[0],
          state.textureInfo0.bounds[1],
          state.textureInfo0.bounds[2],
          state.textureInfo0.bounds[3]
        )
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, state.textureInfo0.texture)
        gl.uniform1i(uTexture0, 0)
      }

      if (state.textureInfo1) {
        gl.uniform1f(uTextAspect1, state.textureInfo1.aspect)
        gl.uniform4f(
          uTextBounds1,
          state.textureInfo1.bounds[0],
          state.textureInfo1.bounds[1],
          state.textureInfo1.bounds[2],
          state.textureInfo1.bounds[3]
        )
        gl.activeTexture(gl.TEXTURE1)
        gl.bindTexture(gl.TEXTURE_2D, state.textureInfo1.texture)
        gl.uniform1i(uTexture1, 1)
      }

      gl.drawElements(gl.TRIANGLES, state.mesh.indexCount, gl.UNSIGNED_SHORT, 0)

      state.animationFrameId = requestAnimationFrame(renderLoop)
    }

    stateRef.current.lastTime = performance.now()
    stateRef.current.animationFrameId = requestAnimationFrame(renderLoop)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (stateRef.current.animationFrameId) {
        cancelAnimationFrame(stateRef.current.animationFrameId)
      }
    }
  }, [])

  useEffect(() => {
    stateRef.current.targetHover = isHovered ? 1.0 : 0.0
    if (!isHovered) {
      stateRef.current.targetMouseX = 0
      stateRef.current.targetMouseY = 0
    }
  }, [isHovered])

  const handleMouseMove = (e) => {
    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1)

    // In WEB DESIGNER screen, it stays active and warped; track mouse parallax smoothly
    if (isWebDesigner) {
      setIsHovered(true)
      stateRef.current.targetMouseX = Math.max(-1, Math.min(1, x))
      stateRef.current.targetMouseY = Math.max(-1, Math.min(1, y))
      setMouseY((e.clientY - rect.top) / rect.height)
      return
    }

    // In VIVEK VISUALSS screen, normal hover-in/out logic
    const inInitialZone = Math.abs(x) < 0.38 && Math.abs(y) < 0.28
    const inWarpedZone = Math.abs(x) < 0.98 && Math.abs(y) < 0.84

    if (isHovered) {
      if (inWarpedZone) {
        stateRef.current.targetMouseX = Math.max(-1, Math.min(1, x))
        stateRef.current.targetMouseY = Math.max(-1, Math.min(1, y))
        setMouseY((e.clientY - rect.top) / rect.height)
      } else {
        setIsHovered(false)
        setMouseY(0.5)
      }
    } else {
      if (inInitialZone) {
        setIsHovered(true)
        stateRef.current.targetMouseX = Math.max(-1, Math.min(1, x))
        stateRef.current.targetMouseY = Math.max(-1, Math.min(1, y))
        setMouseY((e.clientY - rect.top) / rect.height)
      }
    }
  }

  const handleMouseLeave = () => {
    if (!isWebDesigner) {
      // VIVEK VISUALSS screen: unhover and reset
      setIsHovered(false)
      setMouseY(0.5)
    } else {
      // WEB DESIGNER screen: do NOT hover out, just ease mouse parallax back to center
      stateRef.current.targetMouseX = 0
      stateRef.current.targetMouseY = 0
    }
  }

  const handleToggleState = (targetIndex) => {
    const targetState = targetIndex === 1
    if (targetState === stateRef.current.isWebDesigner) return

    if (settleTimerRef.current) clearTimeout(settleTimerRef.current)

    if (targetState) {
      stateRef.current.isWebDesigner = true
      stateRef.current.targetCurve = 1.0
      stateRef.current.targetHover = 1.0
      setIsWebDesigner(true)
      setIsHovered(true)
      onStateChange?.(true)
    } else {
      // First show VIVEK VISUALSS 3D curve animation, then settle to initial state
      stateRef.current.isWebDesigner = false
      stateRef.current.targetCurve = 0.0
      stateRef.current.targetHover = 1.0
      setIsWebDesigner(false)
      setIsHovered(true)
      onStateChange?.(false)

      settleTimerRef.current = setTimeout(() => {
        if (!stateRef.current.isWebDesigner) {
          stateRef.current.targetHover = 0.0
          stateRef.current.targetMouseX = 0
          stateRef.current.targetMouseY = 0
          setIsHovered(false)
        }
      }, 480)
    }
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full h-full flex items-center justify-center cursor-default overflow-hidden select-none"
      role="img"
      aria-label={!isWebDesigner ? 'VIVEK VISUALSS' : 'WEB DESIGNER'}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ touchAction: 'none' }}
      />

      {/* Subtitle paragraph under typography - ONLY shown on VIVEK VISUALSS screen when unhovered */}
      {!isWebDesigner && (
        <div
          className={`absolute top-[calc(50%+20px)] sm:top-[calc(50%+24px)] md:top-[calc(50%+30px)] px-3 flex flex-col items-center justify-center text-center pointer-events-none transition-all duration-300 ${
            isHovered ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <p className="text-[12.5px] sm:text-[12.5px] md:text-[13px] font-black text-black uppercase tracking-tight leading-[1.12]">
            (DON'T JUST LOOK.)<br />
            MOVE AROUND. SOMETHING MIGHT HAPPEN.<br />
            A LITTLE EXPERIMENT WITH TYPE, MOTION,<br />
            AND THE WAY WE INTERACT WITH DIGITAL SPACES.
          </p>
        </div>
      )}

      {/* Side Tick Scrollers (Left & Right) - Visible on hover, always visible in WEB DESIGNER mode */}
      <SideScroller
        side="left"
        visible={isWebDesigner || isHovered}
        mouseY={mouseY}
        scrollProgress={isWebDesigner ? 1 : 0}
        onSelectProgress={handleToggleState}
      />
      <SideScroller
        side="right"
        visible={isWebDesigner || isHovered}
        mouseY={mouseY}
        scrollProgress={isWebDesigner ? 1 : 0}
        onSelectProgress={handleToggleState}
      />

      <h1 className="sr-only">{!isWebDesigner ? 'VIVEK VISUALSS' : 'WEB DESIGNER'}</h1>
    </div>
  )
}
