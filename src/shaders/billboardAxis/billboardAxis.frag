uniform highp vec3  uColor;
uniform highp vec3  uScale;
uniform highp float uWidth;
uniform highp float uOpacity;

varying highp vec2  vUv;

highp float line(in highp vec2 uv, in highp float lineWidth) {
  return smoothstep(lineWidth, lineWidth*0.8, abs(uv.x - lineWidth));
}

void main() {
  vec2 uv = vUv - vec2(0.5, 0.5) + vec2(uWidth, 0.0);

  highp float shape = line(uv, uWidth);
  gl_FragColor = vec4(uColor.xyz, uOpacity)*shape;

  // Incl. atlas tone mapping & color spaces; see `../../explorer/constants.ts`
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
