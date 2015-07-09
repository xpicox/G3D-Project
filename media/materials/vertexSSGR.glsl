uniform vec3 lightpos;
varying vec2 vUv;
varying vec4 sslightpos;

void main() {
	vUv = uv;
	sslightpos = projectionMatrix * modelViewMatrix * vec4( lightpos, 1.0 );
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}