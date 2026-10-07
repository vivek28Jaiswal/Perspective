/**
 * WebGL utility helpers for shader compilation, program linking, and quad mesh generation.
 */

export function createShader(gl, type, source) {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }
  return shader
}

export function createProgram(gl, vertShader, fragShader) {
  const program = gl.createProgram()
  gl.attachShader(program, vertShader)
  gl.attachShader(program, fragShader)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program))
    return null
  }
  return program
}

export function createGridMesh(gl, cols = 200, rows = 30) {
  const positions = []
  const indices = []

  for (let r = 0; r <= rows; r++) {
    const v = (r / rows) * 2 - 1
    for (let c = 0; c <= cols; c++) {
      const u = (c / cols) * 2 - 1
      positions.push(u, v)
    }
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i0 = r * (cols + 1) + c
      const i1 = i0 + 1
      const i2 = (r + 1) * (cols + 1) + c
      const i3 = i2 + 1

      indices.push(i0, i1, i2)
      indices.push(i1, i3, i2)
    }
  }

  const posBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW)

  const indexBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW)

  return {
    posBuffer,
    indexBuffer,
    indexCount: indices.length,
  }
}
