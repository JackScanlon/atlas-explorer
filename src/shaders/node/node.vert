attribute highp uint  data;
attribute highp float scale;
attribute highp vec3  offset;

uniform   highp float uFocused;
uniform   highp vec3  uColors [ MAP_COUNT ]; // interp from JS
uniform   lowp  uint  uVisible[ MAP_COUNT ]; // interp from JS

varying   highp vec2  vUv;
varying   highp float vSize;
varying   highp vec4  vColor;
varying   lowp  float vVisible;
varying   lowp  float vFocused;
varying   lowp  float vSelected;

const highp uint m0     = uint(0xFFFF);
const highp uint m1     = uint(0x0000FF);
const highp uint m2     = uint(0x000000FF);
const highp vec2 center = vec2(0.5, 0.5);

void main() {
  vUv = uv;
  vSize = scale;

  // Unpack bit packed data attr
  highp uint index = ((data >> 16) & m0);
  lowp  uint colId = ((data >> 8) & m1);
  lowp  uint state = (data & m2);

  // Lookup col. from uniform by specialityId
  vColor = vec4(uColors[colId].xyz, 1.0);

  // Resize on selection & apply variant
  lowp float grow = 1.0;
  if (state == uint(1)) {
    grow = 2.0;
    vSelected = 1.0;
  } else {
    vSelected = 0.0;
  }

  // Resize on focus & apply variant
  if (uFocused >= 0.0) {
    highp uint target = uint(uFocused);
    if (target == index) {
      vFocused = 1.1;
    } else {
      vFocused = 0.0;
    }
  }

  // Det. if visible from uniform lookup
  lowp uint chk = uint(1);
  lowp uint vis = uVisible[colId];
  if (vis != chk) {
    vVisible = 0.0;
  } else {
    vVisible = 1.0;
  }

  highp vec2 pos = (position.xy - (center - vec2(0.5))) * grow * scale;
  gl_Position = projectionMatrix * (modelViewMatrix * vec4(offset, 1) + vec4(pos, 0, 0));
}