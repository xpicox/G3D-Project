varying vec3 worldPosition; // vertex position in world space
varying vec3 viewPosition; // vertex position in view space
varying vec3 n_; // normal
varying vec2 uVu;
// all the vectors must be in view space!


void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
	n_ = normalMatrix * normal;
	uVu = uv;
	viewPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
	worldPosition = (modelMatrix*vec4(position,1.0)).xyz;
}
