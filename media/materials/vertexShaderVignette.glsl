varying vec2 uVv;

void main() {

	uVv = uv;
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

}