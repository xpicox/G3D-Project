varying vec3 worldPosition; // vertex position in world space
varying vec3 viewPosition; // vertex position in view space
varying vec3 viewNormal; // view space normal
varying vec3 worldNormal; // world space normal
varying vec2 uVu;

#ifdef USE_SHADOWMAP

	varying vec4 vShadowCoord[ MAX_SHADOWS ];
	uniform mat4 shadowMatrix[ MAX_SHADOWS ];

#endif


void main() {
        
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
	viewNormal = normalMatrix * normal;
	worldNormal = mat3(modelMatrix) * normal;
	uVu = uv;
	viewPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
	worldPosition = (modelMatrix*vec4(position,1.0)).xyz;

#ifdef USE_SHADOWMAP

	for( int i = 0; i < MAX_SHADOWS; i ++ ) {

		vShadowCoord[ i ] = shadowMatrix[ i ] * vec4(worldPosition, 1.0);

	}

#endif

}
