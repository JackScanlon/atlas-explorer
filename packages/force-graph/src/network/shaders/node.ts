export const NodeVertShader = /* glsl */ `
precision highp int;
precision highp float;
precision highp sampler2D;

#ifndef PT_SCALE
  #define PT_SCALE 64.0
#endif

#ifndef GROUP_COUNT
  #define GROUP_COUNT 1
#endif

// Transform
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

// Runtime
uniform float uZoom;
uniform float uAspectRatio;
uniform vec2  uResolution;

// RenderTarget behaviour
uniform float uNodePicking;
uniform float uVisible[ GROUP_COUNT ]; // interp from JS

// Node appearance
uniform float uNodeOpacity;
uniform float uNodeUseColors;
uniform vec4  uNodeColor;

// Texture inputs
uniform float     uTexNodeSz;
uniform float     uTexNodeInvSz;
uniform sampler2D uTexNodePos;
uniform sampler2D uTexNodeVel;
uniform sampler2D uTexNodeDesc;

// Varying
out float vHidden;
out vec2  vPos;
out vec3  vId;
out vec4  vColor;

/**
 * Computes the texel coords of some obj at the given sequential ID (derived from gl_VertexID)
 *
 * @todo append to some shared/utils.glsl file?
 *
 * @param[in] id         the id of the obj (vertex id or sequential obj id)
 * @param[in] texSize    cached size (width or height) of the texture
 * @param[in] invTexSize cached inverse of the aforementioned size, i.e. 1 / size; used to avoid DIV instructions
 *
 * @return a vec3 such that:
 *   1. x: specifies the col (i.e. horizontal offset from {0 + x, 0} at lower-left)
 *   2. y: specifies the row (i.e. vertical offset from {0, 0 + y} at lower-left)
 *   3. z: specifies the input ID
 *
 */
vec3 getTexelCoords(in float id, in float texSize, in float invTexSize) {
  return vec3(
    invTexSize*mod(id, texSize),
    invTexSize*floor(id*invTexSize),
    id
  );
}

void main() {
  /* Compute node coords */
  // NOTE:
  //  - Instead of subbing an attr we're relying on gl::drawArray's index to query nodes at some
  //    texel coord;
  //  - This allows us to reduce the num. buffers we have to manage + reduces the data sent to the GPU
  //
  // REF:
  //  - See ref @ https://registry.khronos.org/OpenGL-Refpages/gl4/html/gl_VertexID.xhtml
  //
  float nodeId = float(gl_VertexID);
  vec3 texCoords = getTexelCoords(nodeId, uTexNodeSz, uTexNodeInvSz);

  /* Compute position & size */
  vec4 posTexel = texture(uTexNodePos, texCoords.xy);
  vec4 velTexel = texture(uTexNodeVel, texCoords.xy);
  vec4 dscTexel = texture(uTexNodeDesc, texCoords.xy);

  int groupId = int(posTexel.z);
  float isVisible = uVisible[groupId];
  if (velTexel.w < 0.0 || isVisible < 0.5) {
    vHidden = 1.0;
    return;
  }

  vec4 mvPosition = modelViewMatrix*vec4(posTexel.xy, 0.0, 1.0);
  gl_Position = projectionMatrix*mvPosition;

  float ptSize = posTexel.a + posTexel.a*uAspectRatio*uZoom;
  ptSize = mix(ptSize, ptSize*2.0, uNodePicking);
  gl_PointSize = min(ptSize, PT_SCALE*uAspectRatio);

  /* Target variants */
  vId = texCoords.xyz;
  vPos = posTexel.xy;
  vColor = dscTexel;
  vHidden = 0.0;
}
`;

export const NodeFragShader = /* glsl */ `
precision highp float;
precision highp sampler2D;

// Node appearance
uniform float uNodeScale;
uniform float uNodeRadius;
uniform float uNodeOpacity;
uniform float uNodeSmoothness;
uniform float uAspectRatio;
uniform float uNodeUseColors;
uniform vec4  uNodeColor;

// RenderTarget behaviour
uniform float     uNodePicking;
uniform float     uNodeHighlighted;
uniform sampler2D uTexPicker;

// Varying
in float vHidden;
in vec2  vPos;
in vec3  vId;
in vec4  vColor;

// Targets
out vec4 outColor;

// Utils
const highp vec3 lum = vec3(0.2126, 0.7152, 0.0722);

/**
 * Shifts the hue and saturation of some color with the specified opacity
 *
 * @param[in] col      the base colour
 * @param[in] hueShift the hue shift amount (-1, 1)
 * @param[in] satShift the sat shift amount (-1, 1)
 * @param[in] alpha    the desired opacity
 *
 * @return a vec4 describing the resulting colour
 *
 */
vec4 selectColor(in vec3 col, in float hueShift, in float satShift, in float alpha) {
  vec3 p = vec3(0.55735)*dot(vec3(0.55735), col);
  vec3 u = col - p;
  vec3 v = cross(vec3(0.55735), u);
  col = u*cos(hueShift*6.2832) + v*sin(hueShift*6.2832) + p;

  vec3 grayscale = vec3(dot(col, lum));
  return vec4(mix(grayscale, col, 1.0 + satShift), alpha);
}

/**
 * Draws a circle
 *
 * @param[in] uv tex coords
 * @param[in] r  circle radius
 * @param[in] s  border smoothing
 *
 * @return a float describing the alpha channel of the circle
 *
 */
float circle(in vec2 uv, in float r, in float s) {
  vec2 d = uv - vec2(0.5);
  return 1.0 - smoothstep(
    s,
    1.0,
    dot(d, d)*4.0
  );
}

void main() {
  /* Hide if vert flags */
  if (vHidden > 0.5) {
    discard;
    return;
  }

  /* Draw circle, discard if completely transparent */
  float t = circle(gl_PointCoord, 1.0, uNodeSmoothness);
  t *= mix(uNodeOpacity, vColor.a, uNodeUseColors);
  if (t <= 0.0) {
    discard;
    return;
  }

  /* Target variants */
  if (uNodePicking > 0.5) {
    outColor = vec4(vId.x, vId.y, 0.0, 1.0);
  } else if (uNodeHighlighted >= 0.0) {
    if (uNodeHighlighted == vId.z) {
      outColor = selectColor(vColor.xyz, -0.25, 1.0, t);
    } else {
      outColor = vec4(vColor.xyz, t*0.5);
    }
  } else {
    outColor = vec4(vColor.xyz, t);
  }
}
`;
