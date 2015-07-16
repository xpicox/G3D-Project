uniform float offset;
uniform float darkness;

uniform sampler2D tDiffuse;

varying vec2 uVv;

void main() {

	vec4 color = texture2D( tDiffuse, uVv );
	float dist = distance( uVv, vec2( 0.5 ) );
	color.rgb *= smoothstep( 0.8, offset * 0.799, dist *( darkness + offset ) );
	gl_FragColor = color;

}