uniform highp vec3  uColor;
uniform highp float uOpacity;
uniform highp vec2  uAxisLine;
uniform highp vec2  uTickLine;

varying highp vec2  vUv;

highp float axisGrid(in highp vec2 uv, in highp vec2 gridSpaces, in highp float lineWidth) {
  uv = mod(uv, gridSpaces) - gridSpaces * 0.5;

  float verticalLines = smoothstep(lineWidth, lineWidth * 0.5, abs(lineWidth*0.5 - uv.x));
  float horizontalLines = smoothstep(lineWidth, lineWidth * 0.5, abs(lineWidth*0.5 - uv.y));
  return verticalLines + horizontalLines;
}

void main() {
  highp float shape = axisGrid(vUv - vec2(uTickLine.x)*0.5 + uTickLine.y*0.5, vec2(uTickLine.x), uTickLine.y);
  shape += axisGrid(vUv - vec2(uAxisLine.x)*0.5  + uAxisLine.y*0.5, vec2(uAxisLine.x), uAxisLine.y);

  gl_FragColor = vec4(uColor.xyz, clamp(shape, 0.0, 1.0)*uOpacity);

  // Incl. atlas tone mapping & color spaces; see `../../explorer/constants.ts`
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
