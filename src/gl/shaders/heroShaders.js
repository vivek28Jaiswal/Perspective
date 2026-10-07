export const HERO_VERTEX_SHADER = `
  attribute vec2 a_grid; // u in [-1, 1], v in [-1, 1]
  varying vec2 v_uv0;
  varying vec2 v_uv1;
  varying float v_curve;

  uniform float u_hover;
  uniform vec2 u_mouse;
  uniform vec2 u_resolution;
  uniform float u_curve; // 0.0 = inside concave curve (VIVEK VISUALSS), 1.0 = outside front V-curve (WEB DESIGNER)

  uniform float u_textAspect0;
  uniform vec4 u_textBounds0;
  uniform float u_textAspect1;
  uniform vec4 u_textBounds1;

  const float PI_HALF = 1.57079632679;

  void main() {
    float screenAspect = u_resolution.x / u_resolution.y;
    v_curve = u_curve;

    // UV coordinates for both textures
    v_uv0 = vec2(
      mix(u_textBounds0.x, u_textBounds0.y, (a_grid.x + 1.0) * 0.5),
      mix(u_textBounds0.z, u_textBounds0.w, (a_grid.y + 1.0) * 0.5)
    );
    v_uv1 = vec2(
      mix(u_textBounds1.x, u_textBounds1.y, (a_grid.x + 1.0) * 0.5),
      mix(u_textBounds1.z, u_textBounds1.w, (a_grid.y + 1.0) * 0.5)
    );

    // Smooth hover easing
    float h = u_hover * u_hover * (3.0 - 2.0 * u_hover);

    float mx = clamp(u_mouse.x, -1.0, 1.0);
    float my = clamp(u_mouse.y, -1.0, 1.0);

    float u = a_grid.x;
    float v = a_grid.y;

    float sinU = sin(u * PI_HALF);
    float cosU = cos(u * PI_HALF);
    float cosSqU = cosU * cosU;
    float sinSqU = sinU * sinU;

    // ============================================================
    // 1. STATE 0: INSIDE CONCAVE WARP (VIVEK VISUALSS - UNDER KE SIDE)
    // ============================================================
    float defHalfW0 = 0.24;
    float defHalfH0 = (defHalfW0 * screenAspect) / u_textAspect0;
    vec2 posFlat0 = vec2(a_grid.x * defHalfW0, a_grid.y * defHalfH0);

    float u_curve0 = 0.72 * sinU + 0.28 * (sinU * sinU * sinU);
    float sideBias0 = 1.0 + mx * sinU * 0.40;
    float zNear0 = 1.15;
    float zFar0 = 4.20;
    float zBase0 = zNear0 + (zFar0 - zNear0) * cosSqU;
    float zMouseShift0 = -mx * sinU * 0.48;
    float Z0 = max(0.80, zBase0 + zMouseShift0);

    float focal0 = 2.0;
    float targetSpan0 = 0.96;
    float halfWidth3D_0 = (targetSpan0 * zNear0) / focal0;
    float X_base0 = u_curve0 * halfWidth3D_0 * sideBias0;

    float targetEdgeHalfH0 = 0.84;
    float halfHeight3D_0 = (targetEdgeHalfH0 * zNear0) / (focal0 * screenAspect);
    float pitchTilt0 = (mx * 0.14 - my * 0.12) * sinU;
    float Y_center0 = pitchTilt0;
    float coneSlant0 = 0.24 * sinU;
    float X_3D_0 = X_base0 + v * coneSlant0 * (halfHeight3D_0 * screenAspect);
    float Y_3D_0 = Y_center0 + v * halfHeight3D_0;

    vec2 posWarp0 = vec2((X_3D_0 * focal0) / Z0, (Y_3D_0 * focal0 * screenAspect) / Z0);
    vec2 posFinal0 = mix(posFlat0, posWarp0, h);

    // ============================================================
    // 2. STATE 1: EXACT SMOOTH 3D PERSPECTIVE WARP (MATCHING SHOWREEL REFERENCE)
    // ============================================================
    float defHalfW1 = 0.26;
    float defHalfH1 = (defHalfW1 * screenAspect) / u_textAspect1;
    vec2 posFlat1 = vec2(a_grid.x * defHalfW1, a_grid.y * defHalfH1);

    // Smooth hyperbolic fold profile:
    // Seamless rounded apex in center (zero creases/edges), smooth linear perspective slope on wings
    float rawFold = sqrt(u * u + 0.04) - 0.20;
    float fold = clamp(rawFold / 0.8198, 0.0, 1.0);

    // 3D perspective depth matching SHOWREEL (center is closest, wings recede smoothly)
    float zNear1 = 1.15;
    float zFar1 = 1.68;
    float zBase1 = zNear1 + (zFar1 - zNear1) * fold;
    float zMouseShift1 = -mx * u * 0.16;
    float Z1 = max(0.85, zBase1 + zMouseShift1);

    // Clean horizontal spread: occupies ~93% screen width with perspective spacing
    float targetSpan1 = 0.93;
    float sideBias1 = 1.0 + mx * u * 0.10;

    // Outward perspective fanning matching SHOWREEL (tops fan outward along the wings)
    float fanSlant1 = 0.07 * u;
    float x_proj1 = u * targetSpan1 * sideBias1 + v * fanSlant1;

    // Symmetrical perspective rise:
    // Center dips softly into trough (-0.13), wings rise smoothly (+0.19)
    float yTrough1 = -0.13;
    float vRise1 = 0.32 * fold;
    float halfH1 = 0.34 * (zNear1 / Z1);
    float pitchTilt1 = (mx * 0.08 - my * 0.06) * u;
    float y_proj1 = yTrough1 + vRise1 + v * halfH1 + pitchTilt1;

    vec2 posWarp1 = vec2(x_proj1, y_proj1);
    vec2 posFinal1 = mix(posFlat1, posWarp1, h);

    // Smoothly morph between inside concave curve and smooth SHOWREEL perspective
    vec2 posFinal = mix(posFinal0, posFinal1, u_curve);

    gl_Position = vec4(posFinal.x, posFinal.y, 0.0, 1.0);
  }
`

export const HERO_FRAGMENT_SHADER = `
  precision highp float;
  varying vec2 v_uv0;
  varying vec2 v_uv1;
  varying float v_curve;

  uniform sampler2D u_texture0;
  uniform sampler2D u_texture1;

  void main() {
    // Zero text-overlap: only one text is rendered at a time!
    // v_curve < 0.5: renders pure black "VIVEK VISUALSS"
    // v_curve >= 0.5: renders pure white "WEB DESIGNER"
    float alpha0 = clamp((0.55 - v_curve) / 0.15, 0.0, 1.0);
    float alpha1 = clamp((v_curve - 0.45) / 0.15, 0.0, 1.0);

    vec4 col = vec4(0.0);

    if (v_curve < 0.5) {
      vec4 t0 = texture2D(u_texture0, v_uv0);
      col = vec4(0.0, 0.0, 0.0, t0.a * alpha0);
    } else {
      vec4 t1 = texture2D(u_texture1, v_uv1);
      col = vec4(1.0, 1.0, 1.0, t1.a * alpha1);
    }

    if (col.a < 0.02) discard;
    gl_FragColor = col;
  }
`
