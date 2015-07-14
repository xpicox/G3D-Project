varying vec3 worldPosition; // vertex position in world space


void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
	worldPosition = (modelMatrix*vec4(position,1.0)).xyz;
}
