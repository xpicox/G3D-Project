uniform float exposure;
uniform float decay;
uniform float density;
uniform float weight;
uniform vec2 lightPosOnScreen;
uniform sampler2D tDiffuse;
varying vec2 vUv;
varying vec4 sslightpos;

#if MAX_SPOT_LIGHTS > 0
	uniform vec3 spotLightColor[ MAX_SPOT_LIGHTS ];
	uniform vec3 spotLightPosition[ MAX_SPOT_LIGHTS ]; // WORLD SPACE POSITION
	uniform vec3 spotLightDirection[ MAX_SPOT_LIGHTS ];
	uniform float spotLightAngleCos[ MAX_SPOT_LIGHTS ];
	uniform float spotLightExponent[ MAX_SPOT_LIGHTS ];
	uniform float spotLightDistance[ MAX_SPOT_LIGHTS ];
	uniform float spotLightDecay[ MAX_SPOT_LIGHTS ];
#endif


const int NUM_SAMPLES = 100 ;


void main()
{	
	vec2 l = sslightpos.xy / sslightpos.w;
	l.x = l.x + 1.0;
	l.y = l.y + 1.0;
	l.x *= 0.5;
	l.y *= 0.5;
	vec2 deltaTextCoord = vec2( vUv - l.xy );
	vec2 textCoo = vUv;
	deltaTextCoord *= 1.0 /  float(NUM_SAMPLES) * density;
	float illuminationDecay = 1.0;
	
	
	for(int i=0; i < NUM_SAMPLES ; i++)
	{
			textCoo -= deltaTextCoord;
			vec4 sample = texture2D(tDiffuse, textCoo );
			
			sample *= illuminationDecay * weight;
			
			gl_FragColor += sample;
			
			illuminationDecay *= decay;
	}
	
	
	gl_FragColor *= exposure;
}
