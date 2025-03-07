export const ComputeVertShader = /* glsl */ `
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

export const ComputeFragShader = /* glsl */ `
precision highp float;

uniform sampler2D uTex;

// Varying
in vec2 vUv;

// Targets
out vec4 outColor;

void main() {
  outColor = texture(uTex, vUv);
}
`;
