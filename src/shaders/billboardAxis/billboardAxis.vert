#define XZ_VEC vec3(1.0, 0.0, 1.0)

varying lowp vec2 vUv;

void main() {
  vUv = uv;

  // Billboard
  //  - mesh should always face camera
  //  - we're maintaining up vec to avoid spherical billboard behaviour
  //
  mat4 modelView = modelViewMatrix;
  modelView[0][0] = 1.0; // Right
  modelView[0][1] = 0.0;
  modelView[0][2] = 0.0;
  modelView[2][0] = 0.0; // Look
  modelView[2][1] = 0.0;
  modelView[2][2] = 1.0;

  gl_Position = projectionMatrix * modelView * vec4(position.xyz, 1.0);
}
