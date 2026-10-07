import { useEffect, useRef, useState } from 'react'
import { BUTTON_VERTEX_SHADER, BUTTON_FRAGMENT_SHADER } from '../gl/shaders/buttonShaders'
import { createShader, createProgram, createGridMesh } from '../gl/utils/webglUtils'

export default function PerspectiveWarpButton({
  text = 'WORK',
  onClick,
  className = '',
  ariaLabel,
  isDark = false,
}) {
  const buttonRef = useRef(null)
  const textSpanRef = useRef(null)
  const canvasRef = useRef(null)
  const [isHovered, setIsHovered] = useState(false)

  const stateRef = useRef({
    isHovered: false,
    hover: 0,
    targetHover: 0,
    mouseX: 0,
    mouseY: 0,
    targetMouseX: 0,
    targetMouseY: 0,
    flatHalfW: 0.35,
    flatHalfH: 0.30,
    gl: null,
    program: null,
    textureInfo: null,
    mesh: null,
    renderTextTexture: null,
    drawFrame: null,
    animationFrameId: null,
    lastTime: performance.now(),
    uResolution: null,
    uHover: null,
    uMouse: null,
    uTextBounds: null,
    uFlatHalfW: null,
    uFlatHalfH: null,
  })

  useEffect(() => {
    const canvas = canvasRef.current
    const button = buttonRef.current
    const span = textSpanRef.current
    if (!canvas || !button) return

    const gl =
      canvas.getContext('webgl', { antialias: true, alpha: false }) ||
      canvas.getContext('experimental-webgl')

    if (!gl) {
      console.warn('WebGL is not supported in this environment')
      return
    }

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    if (isDark) {
      gl.clearColor(1.0, 1.0, 1.0, 1.0)
    } else {
      gl.clearColor(17 / 255, 17 / 255, 17 / 255, 1.0)
    }

    const vertShader = createShader(gl, gl.VERTEX_SHADER, BUTTON_VERTEX_SHADER)
    const fragShader = createShader(gl, gl.FRAGMENT_SHADER, BUTTON_FRAGMENT_SHADER)
    const program = createProgram(gl, vertShader, fragShader)

    if (!program) return

    gl.useProgram(program)

    const mesh = createGridMesh(gl, 80, 20)
    stateRef.current.mesh = mesh

    const aGrid = gl.getAttribLocation(program, 'a_grid')
    gl.enableVertexAttribArray(aGrid)
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.posBuffer)
    gl.vertexAttribPointer(aGrid, 2, gl.FLOAT, false, 0, 0)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer)

    function renderTextTexture(label, dark = false) {
      const offCanvas = document.createElement('canvas')
      const width = 1024
      const height = 256
      offCanvas.width = width
      offCanvas.height = height
      const ctx = offCanvas.getContext('2d')

      // Solid background matching button theme
      ctx.fillStyle = dark ? '#FFFFFF' : '#111111'
      ctx.fillRect(0, 0, width, height)

      // Crisp bold typography: black text on white button (dark), white text on dark button (!dark)
      ctx.fillStyle = dark ? '#000000' : '#FFFFFF'
      ctx.font = '600 110px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      if ('letterSpacing' in ctx) {
        ctx.letterSpacing = '5px'
      }
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      ctx.fillText(label, width / 2, height / 2)

      const metrics = ctx.measureText(label)
      const textWidth = metrics.width
      const ascent = metrics.actualBoundingBoxAscent || 75
      const descent = metrics.actualBoundingBoxDescent || 25

      const pad = 4
      const minX = Math.max(0, (width / 2 - textWidth / 2 - pad) / width)
      const maxX = Math.min(1, (width / 2 + textWidth / 2 + pad) / width)
      const topY = Math.max(0, height / 2 - ascent - pad)
      const botY = Math.min(height, height / 2 + descent + pad)

      const vTop = 1.0 - topY / height
      const vBot = 1.0 - botY / height

      const texture = gl.createTexture()
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, offCanvas)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.generateMipmap(gl.TEXTURE_2D)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

      return {
        texture,
        bounds: [minX, maxX, vBot, vTop],
      }
    }

    stateRef.current.renderTextTexture = renderTextTexture

    function updateFlatMetrics() {
      if (!button || !span) return
      const buttonRect = button.getBoundingClientRect()
      const spanRect = span.getBoundingClientRect()

      if (buttonRect.width > 0 && buttonRect.height > 0) {
        stateRef.current.flatHalfW = Math.min(0.48, spanRect.width / buttonRect.width)
        stateRef.current.flatHalfH = Math.min(0.45, spanRect.height / buttonRect.height)
      }
    }

    updateFlatMetrics()

    let textureInfo = renderTextTexture(text, isDark)
    stateRef.current.textureInfo = textureInfo

    if (document.fonts) {
      document.fonts.load('600 110px Inter').then(() => {
        if (!stateRef.current.gl) return
        updateFlatMetrics()
        stateRef.current.textureInfo = renderTextTexture(text, isDark)
        drawFrame()
      }).catch(() => {})
    }

    stateRef.current.gl = gl
    stateRef.current.program = program

    const uResolution = gl.getUniformLocation(program, 'u_resolution')
    const uHover = gl.getUniformLocation(program, 'u_hover')
    const uMouse = gl.getUniformLocation(program, 'u_mouse')
    const uTextBounds = gl.getUniformLocation(program, 'u_textBounds')
    const uFlatHalfW = gl.getUniformLocation(program, 'u_flatHalfW')
    const uFlatHalfH = gl.getUniformLocation(program, 'u_flatHalfH')

    stateRef.current.uResolution = uResolution
    stateRef.current.uHover = uHover
    stateRef.current.uMouse = uMouse
    stateRef.current.uTextBounds = uTextBounds
    stateRef.current.uFlatHalfW = uFlatHalfW
    stateRef.current.uFlatHalfH = uFlatHalfH

    function drawFrame() {
      const state = stateRef.current
      if (!state.gl || !state.program) return

      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.uniform2f(uResolution, canvas.width, canvas.height)
      gl.uniform1f(uHover, state.hover)
      gl.uniform2f(uMouse, state.mouseX, state.mouseY)
      gl.uniform1f(uFlatHalfW, state.flatHalfW)
      gl.uniform1f(uFlatHalfH, state.flatHalfH)

      if (state.textureInfo) {
        gl.uniform4f(
          uTextBounds,
          state.textureInfo.bounds[0],
          state.textureInfo.bounds[1],
          state.textureInfo.bounds[2],
          state.textureInfo.bounds[3]
        )
      }

      gl.drawElements(gl.TRIANGLES, state.mesh.indexCount, gl.UNSIGNED_SHORT, 0)
    }

    function resizeCanvas() {
      const rect = button.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const width = Math.floor(rect.width * dpr)
      const height = Math.floor(rect.height * dpr)

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
        gl.viewport(0, 0, width, height)
      }
      updateFlatMetrics()
      drawFrame()
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    function renderLoop(now) {
      const state = stateRef.current
      if (!state.gl || !state.program) return

      const dt = Math.min((now - state.lastTime) / 1000, 0.1)
      state.lastTime = now

      const hoverSpeed = 6.0
      const mouseSpeed = 7.5

      state.hover += (state.targetHover - state.hover) * (1.0 - Math.exp(-hoverSpeed * dt))
      state.mouseX += (state.targetMouseX - state.mouseX) * (1.0 - Math.exp(-mouseSpeed * dt))
      state.mouseY += (state.targetMouseY - state.mouseY) * (1.0 - Math.exp(-mouseSpeed * dt))

      drawFrame()

      const isStillAnimating =
        state.isHovered ||
        state.hover > 0.001 ||
        Math.abs(state.mouseX) > 0.005 ||
        Math.abs(state.mouseY) > 0.005

      if (isStillAnimating) {
        state.animationFrameId = requestAnimationFrame(renderLoop)
      } else {
        state.hover = 0
        state.mouseX = 0
        state.mouseY = 0
        drawFrame()
        state.animationFrameId = null
      }
    }

    stateRef.current.startLoop = () => {
      if (!stateRef.current.animationFrameId) {
        stateRef.current.lastTime = performance.now()
        stateRef.current.animationFrameId = requestAnimationFrame(renderLoop)
      }
    }

    stateRef.current.drawFrame = drawFrame

    // Initial frame render
    drawFrame()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (stateRef.current.animationFrameId) {
        cancelAnimationFrame(stateRef.current.animationFrameId)
      }
      if (stateRef.current.textureInfo?.texture) {
        gl.deleteTexture(stateRef.current.textureInfo.texture)
      }
      if (mesh.posBuffer) gl.deleteBuffer(mesh.posBuffer)
      if (mesh.indexBuffer) gl.deleteBuffer(mesh.indexBuffer)
      if (program) gl.deleteProgram(program)
      if (vertShader) gl.deleteShader(vertShader)
      if (fragShader) gl.deleteShader(fragShader)
      stateRef.current.gl = null
      stateRef.current.program = null
    }
  }, [text])

  // Dynamically update clearColor and text texture when dark mode changes
  useEffect(() => {
    const gl = stateRef.current.gl
    if (!gl || !stateRef.current.renderTextTexture) return

    if (isDark) {
      gl.clearColor(1.0, 1.0, 1.0, 1.0)
    } else {
      gl.clearColor(17 / 255, 17 / 255, 17 / 255, 1.0)
    }

    if (stateRef.current.textureInfo?.texture) {
      gl.deleteTexture(stateRef.current.textureInfo.texture)
    }

    stateRef.current.textureInfo = stateRef.current.renderTextTexture(text, isDark)
    if (stateRef.current.drawFrame) {
      stateRef.current.drawFrame()
    }
  }, [isDark, text])

  const handleMouseEnter = () => {
    setIsHovered(true)
    stateRef.current.isHovered = true
    stateRef.current.targetHover = 1.0
    if (stateRef.current.startLoop) {
      stateRef.current.startLoop()
    }
  }

  const handleMouseMove = (e) => {
    const button = buttonRef.current
    if (!button) return

    const rect = button.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1)

    stateRef.current.targetMouseX = Math.max(-1, Math.min(1, x))
    stateRef.current.targetMouseY = Math.max(-1, Math.min(1, y))

    if (stateRef.current.startLoop) {
      stateRef.current.startLoop()
    }
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    stateRef.current.isHovered = false
    stateRef.current.targetHover = 0.0
    stateRef.current.targetMouseX = 0
    stateRef.current.targetMouseY = 0
    if (stateRef.current.startLoop) {
      stateRef.current.startLoop()
    }
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative inline-flex items-center justify-center text-xs font-semibold px-5 py-2.5 rounded-[4px] tracking-wider uppercase overflow-hidden cursor-pointer select-none transition-colors duration-300 ${
        isDark ? 'bg-white text-black' : 'bg-[#111111] text-white'
      } ${className}`}
      aria-label={ariaLabel || text}
    >
      {/* 100% native vector text: ensures razor-sharp text quality, exact original font size & design */}
      <span
        ref={textSpanRef}
        className={`tracking-wider pointer-events-none transition-opacity duration-150 ${
          isHovered ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {text}
      </span>

      {/* WebGL Canvas activates on hover with the 3D perspective warp ribbon animation */}
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full pointer-events-none block transition-opacity duration-150 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </button>
  )
}
