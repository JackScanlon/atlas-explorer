varying highp vec2  vUv;
varying highp vec4  vColor;
varying highp float vSize;
varying  lowp float vSelected;
varying  lowp float vVisible;
varying  lowp float vFocused;

const highp vec3  lum = vec3(0.2126, 0.7152, 0.0722);
const lowp  float borderThickness = 0.3;

highp vec4 selectColor(in highp vec3 col, in highp float hueShift, in highp float satShift) {
  highp vec3 p = vec3(0.55735)*dot(vec3(0.55735), col);
  highp vec3 u = col - p;
  highp vec3 v = cross(vec3(0.55735), u);
  col = u*cos(hueShift*6.2832) + v*sin(hueShift*6.2832) + p;

  highp vec3 grayscale = vec3(dot(col, lum));
  return vec4(mix(grayscale, col, 1.0 + satShift), 1.0);
}

void main() {
  if (vVisible < 0.5) {
    discard;
  }

  // Discard outer area
  lowp vec2 cxy = 2.0 * gl_PointCoord.xy - 1.0;
  lowp float d = distance(cxy, vUv);
  if (d > 0.9) {
    discard;
  }

  // Fake lighting
  lowp float radius = dot(cxy, cxy);

  const lowp vec3 ambient = vec3(1.0, 1.0, 1.0)*0.75;
  const lowp vec3 lightDiffuse = vec3(1.0, 0.5, 0.2);

  lowp vec3 normal = vec3(cxy, sqrt(1.0 - radius));
  lowp vec3 lightDir = normalize(vec3(0.0, -1.0, 0.5));
  lowp float col = max(dot(normal, lightDir), 0.0);

  lowp float delta = fwidth(radius);
  lowp float alpha = 1.0 - smoothstep(1.0 - delta, 1.0 + delta, radius);

  // Border gradient
  highp vec4 comp = vec4((vColor.xyz*ambient + lightDiffuse * col).xyz, alpha);
  highp float t0 = 1.0 - smoothstep(1.0-borderThickness, 1.0, d);
  highp float t1 = 1.0 - smoothstep(1.0, 1.0+borderThickness, d);
  comp = vec4(mix(vec3(0.0, 0.0, 0.0), comp.xyz, t0), t1);

  // Outline on selected / focused
  if (vFocused + vSelected > 0.5) {
    highp vec4 outlineColor = vec4(0.0);
    if (vFocused > 0.5) {
      outlineColor = selectColor(vColor.xyz, -0.25, 1.0);
    } else {
      outlineColor = selectColor(vColor.xyz, -0.5, 0.5);
    }

    highp float fade = 1.0 / (radius * 0.5);
    highp float chan = smoothstep(3.0, fade, d);
    chan *= smoothstep(3.0 + fade, 3.0, d);
    comp = mix(comp, outlineColor, chan);
  }

  gl_FragColor = comp;

  // Incl. atlas tone mapping & color spaces; see `../../explorer/constants.ts`
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
