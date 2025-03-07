export const EmptyVertShader = /* glsl */ `
precision highp float;

// Transform
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

// Attributes
in vec3 position;

void main() {
	gl_Position = projectionMatrix*modelViewMatrix*vec4(position, 1.0);
}
`;

export const EmptyFragShader = /* glsl */ `
precision highp float;

void main() {
	gl_FragColor = vec4(1.0);
}
`;
