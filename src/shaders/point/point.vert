attribute highp float scale;
attribute lowp  uint  data;

uniform   highp float uFocused;
uniform   highp vec3  uColors [ MAP_COUNT ]; // interp from JS
uniform   lowp  uint  uVisible[ MAP_COUNT ]; // interp from JS

varying   highp vec2  vUv;
varying   highp float vSize;
varying   highp vec4  vColor;
varying   lowp  float vVisible;
varying   lowp  float vFocused;
varying   lowp  float vSelected;

void main() {
  vUv = uv;

  // Unpack bit packed data attr
  highp uint index = ((data >> 16) & uint(0xFFFF));
  lowp  uint colId = ((data >> 8) & uint(0x0000FF));
  lowp  uint state = (data & uint(0x000000FF));

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

  vSize = scale;

  // Det. if visible from uniform lookup
  lowp uint chk = uint(1);
  lowp uint vis = uVisible[colId];
  if (vis != chk) {
    vVisible = 0.0;
  } else {
    vVisible = 1.0;
  }

  // Draw point
  vec4 pPos = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = grow * scale * (300.0 / - pPos.z);
  gl_Position = projectionMatrix * pPos;
}
