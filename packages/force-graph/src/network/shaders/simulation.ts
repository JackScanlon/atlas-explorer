export const SimForcesVertShader = /* glsl */ `
precision highp float;

#ifndef MAX_DBL
  #define MAX_DBL 1.7976931348623158e+308
#endif

#ifndef MIN_DBL
  #define MIN_DBL 2.2250738585072014e-308
#endif

// Texture inputs
uniform float uTexNodeSz;
uniform float uTexNodeInvSz;

// Texture inputs
uniform sampler2D uTexNodePos;

// Attributes
in vec3 position;
in vec2 uv;

// Varying
out vec2 vUv;
out vec4 vBounds;

/**
 * Retrieves texels from a texture given some pixel id
 * @see https://registry.khronos.org/OpenGL-Refpages/gl4/html/texture.xhtml
 *
 * @todo append to some shared/utils.glsl file?
 *
 * @param[in] tex        specifies the sampler to which the texels are bound
 * @param[in] id         the id of the obj (vertex id or sequential obj id)
 * @param[in] texSize    cached size (width or height) of the texture
 * @param[in] invTexSize cached inverse of the aforementioned size, i.e. 1 / size; used to avoid DIV instructions
 *
 * @return a vec4 describing a texel, i.e. some rgba value of the texture at the given coords
 *
 */
vec4 sampleTex(in sampler2D tex, in float id, in float texSize, in float invTexSize) {
  return texture(
    tex,
    vec2(
      invTexSize*mod(id, texSize),
      invTexSize*floor(id*invTexSize)
    )
  );
}

void main() {
  vec2 minPos = vec2(MAX_DBL);
  vec2 maxPos = vec2(MIN_DBL);

  vec4 pos;
  vec2 centre;
  for (float i = 0.0; i < NODE_COUNT; i += 1.0) {
    pos = sampleTex(uTexNodePos, i, uTexNodeSz, uTexNodeInvSz);
    minPos = min(minPos, pos.xy);
    maxPos = max(maxPos, pos.xy);
    centre += pos.xy;
  }

  vBounds = vec4((centre / NODE_COUNT).xy, (maxPos - minPos).xy);

  vUv = uv;
  gl_Position = vec4(position.xyz, 1.0);
}
`;

export const SimForcesFragShader = /* glsl */ `
precision highp float;
precision highp sampler2D;

// Runtime
uniform float uTimeStep;
uniform float uTimeDelta;

// Behaviour
uniform float uCentre;
uniform float uGravity;
uniform float uFriction;
uniform float uDistance;
uniform float uRepulsion;
uniform float uStiffness;
uniform float uTemperature;

// Texture props
uniform float uTexNodeSz;
uniform float uTexNodeInvSz;
uniform float uTexEdgeDataSz;
uniform float uTexEdgeDataInvSz;

// Texture inputs
uniform sampler2D uTexNodePos;
uniform sampler2D uTexEdgeSrcAdjMap;
uniform sampler2D uTexEdgeTrgAdjMap;
uniform sampler2D uTexEdgeSrcAdjIdx;
uniform sampler2D uTexEdgeTrgAdjIdx;
uniform sampler2D uTexNodeVel;

// Varying
in vec2 vUv;
in vec4 vBounds;

// Targets
out vec4 outColor;

/**
 * Retrieves texels from a texture given some pixel id
 * @see https://registry.khronos.org/OpenGL-Refpages/gl4/html/texture.xhtml
 *
 * @todo append to some shared/utils.glsl file?
 *
 * @param[in] tex        specifies the sampler to which the texels are bound
 * @param[in] id         the id of the obj (vertex id or sequential obj id)
 * @param[in] texSize    cached size (width or height) of the texture
 * @param[in] invTexSize cached inverse of the aforementioned size, i.e. 1 / size; used to avoid DIV instructions
 *
 * @return a vec4 describing a texel, i.e. some rgba value of the texture at the given coords
 *
 */
vec4 sampleTex(in sampler2D tex, in float id, in float texSize, in float invTexSize) {
  return texture(
    tex,
    vec2(
      invTexSize*mod(id, texSize),
      invTexSize*floor(id*invTexSize)
    )
  );
}

/**
 * Computes the index (ID) associated with a texel
 * @note beware: this function does _NOT_ check for index validity
 *
 * @todo append to some shared/utils.glsl file?
 *
 * @param[in] coord specifies the texture sampling coords
 * @param[in] size  the length of the width/height
 *
 * @return some float specifying the sampled index index
 *
 */
float getIndex(in vec2 coord, in float size) {
  return trunc((coord.x*size) + (coord.y*size)*size);
}

void main()	{
  vec2 uv = gl_FragCoord.xy*uTexNodeInvSz;

  vec4 velTexel = texture(uTexNodeVel, uv); // Vel: [x, y, z] | Staticity: [w]
  vec4 posTexel = texture(uTexNodePos, uv); // Pos: [x, y, z] |      Size: [w]
  if (velTexel.w >= 1.0) {
    outColor = velTexel;
    return;
  }

  vec4 srcMapTexel = texture(uTexEdgeSrcAdjMap, uv); // Index: [r: col, g: row, b: len] | RNG: [a: d]
  vec4 trgMapTexel = texture(uTexEdgeTrgAdjMap, uv); // Index: [r: col, g: row, b: len] | RNG: [a: d]

  float index = getIndex(uv, uTexNodeSz);
  float deltaTime = uTimeStep*uTimeDelta;

  float srcRndDis = srcMapTexel.w;
  float trgRndDis = trgMapTexel.w;
  float maxRndDis = max(srcRndDis, trgRndDis);

  vec2 velocity = vec2(0.0);
  vec2 position = vec2(posTexel.xy);

  float len;
  float dist;
  float angle;

  vec2 disp;
  vec2 texCoord;
  vec4 nodeTexel;

  // Towards centre mass + towards world origin (gravity)
  disp = vec2(0.0) - position;
  dist = length(disp);
  if (dist > 0.0) {
    angle = atan(disp.y, disp.x);
    // velocity += (disp/dist)*(uFriction*uTemperature*uGravity*dist);
    velocity += uFriction*uTemperature*uGravity*dist*vec2(cos(angle), sin(angle));
  }

  disp = vBounds.xy - position;
  dist = length(disp);
  if (dist > 0.0) {
    angle = atan(disp.y, disp.x);
    // velocity += (disp/dist)*(uFriction*uTemperature*uCentre*dist);
    velocity += uFriction*uTemperature*uCentre*dist*vec2(cos(angle), sin(angle));
  }

  // Repulsion
  for (float i = 0.0; i < NODE_COUNT; i += 1.0) {
    if (i != index) {
      nodeTexel = sampleTex(uTexNodePos, i, uTexNodeSz, uTexNodeInvSz);

      disp = position - nodeTexel.xy;
      len = dot(disp, disp);
      if (len <= 0.0) {
        disp = max(nodeTexel.xy, vec2(maxRndDis, maxRndDis));
        len = dot(disp, disp);
      }

      velocity += uFriction*((uTemperature*uRepulsion) / len)*normalize(disp);
    }
  }

  // Attraction
  float srcLen = srcMapTexel.z;
  float trgLen = trgMapTexel.z;
  if (srcLen + trgLen > 0.0) {
    float srcOffset = srcMapTexel.x;
    float srcDisOff = uDistance*(1.0 + 0.2*srcRndDis);

    float trgOffset = trgMapTexel.x;
    float trgDisOff = uDistance*(1.0 + 0.2*trgRndDis);

    float iSrc = srcMapTexel.x;
    float jSrc = srcMapTexel.y;

    float iTrg = trgMapTexel.x;
    float jTrg = trgMapTexel.y;

    vec4 edgeTexel;
    for (float i = 0.0; i < EDGE_COUNT; i += 1.0) {
      if (i < srcLen) {
        edgeTexel = sampleTex(uTexEdgeSrcAdjIdx, srcOffset + i, uTexEdgeDataSz, uTexEdgeDataInvSz);
        nodeTexel = sampleTex(uTexNodePos, edgeTexel.x, uTexNodeSz, uTexNodeInvSz);

        disp = nodeTexel.xy - (position.xy + velocity.xy);
        len = max(length(disp), srcDisOff);
        len = ((len - srcDisOff) / len)*uStiffness*uTemperature*edgeTexel.z*max(edgeTexel.w, 0.1); // where z = strength, w = bias

        velocity += uFriction*disp*len;
      }

      if (i < trgLen) {
        edgeTexel = sampleTex(uTexEdgeTrgAdjIdx, trgOffset + i, uTexEdgeDataSz, uTexEdgeDataInvSz);
        nodeTexel = sampleTex(uTexNodePos, edgeTexel.x, uTexNodeSz, uTexNodeInvSz);

        disp = nodeTexel.xy - (position.xy + velocity.xy);
        len = max(length(disp), trgDisOff);
        len = ((len - trgDisOff) / len)*uStiffness*uTemperature*edgeTexel.z*max(edgeTexel.w, 0.1); // where z = strength, w = bias

        velocity += uFriction*disp*len;
      }
    }
  }

  outColor = vec4(velocity.xy, 0.0, velTexel.w);
}
`;

export const SimPosFragShader = /* glsl */ `
precision highp float;
precision highp sampler2D;

// Behaviour
uniform float uTemperature;

// Texture inputs
uniform float     uTexNodeInvSz;
uniform sampler2D uTexNodePos;
uniform sampler2D uTexNodeVel;

// Varying
in vec2 vUv;

// Targets
out vec4 outColor;

void main()	{
  vec2 uv = gl_FragCoord.xy*vec2(uTexNodeInvSz, uTexNodeInvSz).xy;

  vec4 posTexel = texture(uTexNodePos, uv); // Pos: [x, y, z] |      Size: [w]
  vec4 velTexel = texture(uTexNodeVel, uv); // Vel: [x, y, z] | Staticity: [w]

  outColor = vec4(posTexel.xyz + velTexel.xyz*(1.0 - velTexel.w), posTexel.w);
}
`;

export const SimPaintVertShader = /* glsl */ `
precision highp float;

// Attributes
in vec3 position;
in vec2 uv;

// Varying
out vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xyz, 1.0);
}
`;

export const SimPaintFragShader = /* glsl */ `
precision highp float;

// Texture props
uniform float     uTexTrgInvSz;
uniform sampler2D uTexTarget;
uniform sampler2D uTexPainter;

// Varying
in vec2 vUv;

// Targets
out vec4 outColor;

void main() {
  vec2 uv = gl_FragCoord.xy*uTexTrgInvSz;
  outColor = texture(uTexTarget, uv);
}
`;
