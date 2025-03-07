export const EdgeVertShader = /* glsl */ `
precision highp int;
precision highp float;
precision highp sampler2D;

#ifndef GROUP_COUNT
  #define GROUP_COUNT 1
#endif

// Transform
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

// RenderTarget behaviour
uniform float uVisible[ GROUP_COUNT ]; // interp from JS

// Texture props
uniform float uTexNodeSz;
uniform float uTexNodeInvSz;
uniform float uTexEdgeLineSz;
uniform float uTexEdgeLineInvSz;

// Texture inputs
uniform sampler2D uTexEdgeLines;
uniform sampler2D uTexNodePos;
uniform sampler2D uTexNodeDesc;

// Varying
out float vEdge0;
out float vEdge1;
out float vHidden;
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
  /* Compute coords */
  //
  // NOTE:
  //  - The idea here is to treat 2x verts as 1x edge, querying the uTexNodePos sampler to derive the vert positions
  //
  //  - This should generate a series of sampler coords such that:
  //
  //    | gl_VertexID | EdgeId | Texel XY/ZW | Line A/B | NodeId (e.g.) |  DOT  |
  //    |-------------|--------|-------------|----------|---------------|-------|
  //    |           0 |      0 | xy          | A        |             0 |  0->1 |
  //    |           1 |      0 | zw          | B        |             1 |  1->0 |
  //    |           2 |      1 | xy          | A        |             0 |  0->3 |
  //    |           3 |      1 | zw          | B        |             3 |  3->0 |
  //    |           4 |      2 | xy          | A        |             2 |  4->3 |
  //    |           5 |      2 | zw          | B        |             3 |  3->4 |
  //
  float vertId = float(gl_VertexID);
  float edgeSd = mod(vertId, 2.0);
  float edgeId = (vertId - 1.0*edgeSd)*0.5;

  vec3 texCoordsEdge = getTexelCoords(edgeId, uTexEdgeLineSz, uTexEdgeLineInvSz);
  vec4 texelEdge = texture(uTexEdgeLines, texCoordsEdge.xy);

  vec3 nodeCoords = getTexelCoords((edgeSd >= 0.5 ? texelEdge.y : texelEdge.x), uTexNodeSz, uTexNodeInvSz);
  vec4 texelNode = texture(uTexNodePos, nodeCoords.xy);
  if (texelNode.w <= 0.0 || texelEdge.z <= 0.0) {
    vHidden = 1.0;
    return;
  }

  vec3 relCoords = getTexelCoords((edgeSd >= 0.5 ? texelEdge.x : texelEdge.y), uTexNodeSz, uTexNodeInvSz);
  vec4 texelRel = texture(uTexNodePos, relCoords.xy);

  int groupE0 = int(texelNode.z);
  float visE0 = uVisible[groupE0];

  int groupE1 = int(texelRel.z);
  float visE1 = uVisible[groupE1];

  if (visE0 < 0.5 || visE1 < 0.5) {
    vHidden = 1.0;
    return;
  }

  /* Compute position */
  gl_Position = projectionMatrix*modelViewMatrix*vec4(texelNode.xy, 0.0, 1.0);

  /* Target variants */
  vEdge0 = texelEdge.x;
  vEdge1 = texelEdge.y;
  vHidden = 0.0;
  vColor = texture(uTexNodeDesc, nodeCoords.xy);
}
`;

export const EdgeFragShader = /* glsl */ `
precision highp float;
precision highp sampler2D;

// RenderTarget behaviour
uniform float uNodeHighlighted;

// Edge props
uniform float uEdgeOpacity;
uniform float uEdgeUseColors;
uniform vec4  uEdgeColor;

// Varying
in float vEdge0;
in float vEdge1;
in float vHidden;
in vec4  vColor;

// Targets
out vec4 outColor;

void main() {
  if (vHidden > 0.5) {
    discard;
    return;
  }

  vec4 col = mix(uEdgeColor, vColor, uEdgeUseColors);
  if (uNodeHighlighted > 0.0) {
    if (uNodeHighlighted != vEdge0 && uNodeHighlighted != vEdge1) {
      col.w = 0.2*uEdgeOpacity;
    } else {
      col.w = 1.0;
    }
  } else {
    col.w *= uEdgeOpacity;
  }

  if (col.w <= 0.0) {
    discard;
    return;
  }

  outColor = col;
}
`;
