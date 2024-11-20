varying highp vec2  vUv;
varying highp vec4  vColor;
varying highp float vSize;
varying  lowp float vVisible;
varying  lowp float vFocused;
varying  lowp float vSelected;

const highp vec3  lum            = vec3(0.2126, 0.7152, 0.0722);
const highp float edgeThickness  = 10.0;
const highp float borderGradient = 1.1;

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
  highp vec2 cxy = vUv - vec2(0.5, 0.5);
  highp float d = length(cxy);
  if (d > 0.5) {
    discard;
  }

  // Lighting
  highp float radius = dot(cxy, cxy);

  const highp vec3 ambient = vec3(1.0, 1.0, 1.0)*0.75;
  const highp vec3 lightDiffuse = vec3(1.0, 0.5, 0.2);

  highp vec3 normal = vec3(cxy, sqrt(1.0 - radius));
  highp vec3 lightDir = normalize(vec3(0.0, -1.0, 0.5));
  highp float col = max(dot(normal, lightDir), 0.0);

  highp float delta = fwidth(radius);
  highp float alpha = 1.0 - smoothstep(1.0 - delta, 1.0 + delta, radius);

  // Border gradient
  highp vec4 comp = vec4((vColor.xyz*ambient + lightDiffuse * col).xyz, alpha);
  highp float t0 = 1.0 - smoothstep(1.0-borderGradient, 1.0, d);
  highp float t1 = 1.0 - smoothstep(1.0, 1.0+borderGradient, d);
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
    highp float chan = smoothstep(edgeThickness, fade, d);
    chan *= smoothstep(edgeThickness + fade, edgeThickness, d);
    comp = mix(comp, outlineColor, chan);
  }

  gl_FragColor = comp;

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
