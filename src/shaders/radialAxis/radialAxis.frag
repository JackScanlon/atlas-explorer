#define MAX_RADIUS float(0.50)

uniform highp vec3  uColor;
uniform highp vec3  uScale;
uniform highp float uWidth;
uniform highp float uOpacity;

varying highp vec2  vUv;

highp float circle(in highp vec2 uv, in lowp float radius, in lowp float width) {
  return smoothstep(width, width * 0.5, abs(radius - length(uv)));
}

void main() {
  vec2 uv = vUv - vec2(0.5, 0.5);

  highp float alpha  = 0.0;
  highp float shape  = 0.0;
  highp float radius = MAX_RADIUS - uWidth;

  // Draw concentric circle(s)
  highp float i = uScale.x;
  while (i <= uScale.y) {
    alpha = i / uScale.y;
    if (alpha > 0.0001) {
      shape += circle(uv, radius*alpha, uWidth);
    }

    i += uScale.z;
  }

  gl_FragColor = vec4(uColor.xyz, uOpacity)*shape;

  // Incl. atlas tone mapping & color spaces; see `../../explorer/constants.ts`
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
