export const BUTTON_VERTEX_SHADER = `
  attribute vec2 a_grid; // u in [-1, 1], v in [-1, 1]
  varying vec2 v_uv;

  uniform float u_hover;
  uniform vec2 u_mouse;
  uniform vec2 u_resolution;
  uniform vec4 u_textBounds; // x: minU, y: maxU, z: minV, w: maxV
  uniform float u_flatHalfW;
  uniform float u_flatHalfH;

  const float PI_HALF = 1.57079632679;

  void main() {
    float screenAspect = u_resolution.x / u_resolution.y;

    // Map [-1, 1] grid to texture UVs
    float texU = mix(u_textBounds.x, u_textBounds.y, (a_grid.x + 1.0) * 0.5);
    float texV = mix(u_textBounds.z, u_textBounds.w, (a_grid.y + 1.0) * 0.5);
    v_uv = vec2(texU, texV);

    // Smooth cubic easing for hover transition
    float h = u_hover * u_hover * (3.0 - 2.0 * u_hover);

    // -------------------------------------------------------------
    // 1. DEFAULT (UNDISTORTED 2D) STATE - EXACT 1:1 NATIVE PIXEL RATIO
    // -------------------------------------------------------------
    vec2 posFlat = vec2(a_grid.x * u_flatHalfW, a_grid.y * u_flatHalfH);

    // -------------------------------------------------------------
    // 2. 3D WARPED STATE: IDENTICAL SHADER MATH TO HERO
    // -------------------------------------------------------------
    float mx = clamp(u_mouse.x, -1.0, 1.0);
    float my = clamp(u_mouse.y, -1.0, 1.0);

    float u = a_grid.x; // along word [-1 to +1]
    float v = a_grid.y; // across letter height [-1 to +1]

    // Pure trigonometric functions for silky smooth round center
    float sinU = sin(u * PI_HALF);
    float cosU = cos(u * PI_HALF);
    float cosSqU = cosU * cosU;

    // Smooth non-linear horizontal curve: smooth in center, wide stretch on sides
    float u_curve = 0.72 * sinU + 0.28 * (sinU * sinU * sinU);

    // Dynamic asymmetry pulled by mouse
    float sideBias = 1.0 + mx * sinU * 0.40;

    // 3D Depth (Z):
    // Center is pushed deep into background
    // Edges come close to camera for massive sides
    float zNear = 1.15;
    float zFar = 4.20;
    float zBase = zNear + (zFar - zNear) * cosSqU;

    // Moving mouse brings active side closer to camera
    float zMouseShift = -mx * sinU * 0.48;
    float Z = max(0.80, zBase + zMouseShift);

    // Camera focal length
    float focal = 2.0;

    // 3D Horizontal (X):
    // Stretches towards the edges of the button
    float targetSpan = 0.86;
    float halfWidth3D = (targetSpan * zNear) / focal;
    float X_base = u_curve * halfWidth3D * sideBias;

    // 3D Ribbon Height:
    float targetEdgeHalfH = 0.72;
    float halfHeight3D = (targetEdgeHalfH * zNear) / (focal * screenAspect);

    // 3D Vertical Center (Y):
    float pitchTilt = (mx * 0.14 - my * 0.12) * sinU;
    float Y_center = pitchTilt;

    // Perspective stem slant
    float coneSlant = 0.24 * sinU;
    float X_3D = X_base + v * coneSlant * (halfHeight3D * screenAspect);
    float Y_3D = Y_center + v * halfHeight3D;

    // 3D Perspective Projection to NDC
    float x_proj = (X_3D * focal) / Z;
    float y_proj = (Y_3D * focal * screenAspect) / Z;

    vec2 posWarp = vec2(x_proj, y_proj);

    // Smooth blend between flat 2D and 3D curve
    vec2 posFinal = mix(posFlat, posWarp, h);

    gl_Position = vec4(posFinal.x, posFinal.y, 0.0, 1.0);
  }
`

export const BUTTON_FRAGMENT_SHADER = `
  precision highp float;
  varying vec2 v_uv;

  uniform sampler2D u_texture;

  void main() {
    vec4 color = texture2D(u_texture, v_uv);
    gl_FragColor = color;
  }
`
