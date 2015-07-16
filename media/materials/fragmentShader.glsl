#define PI 3.14159
#define RECIPROCAL_PI 0.31831
#define GAMMA 2.2

#extension GL_OES_standard_derivatives : enable
// #define DIFFUSE_MAP 	true/false
// #define NORMAL_MAP	true/false
// #define DIFFUSE :
// 0 Lambert
// 1 Disney diffuse
// 2 Oren-Nayar

varying vec3 worldPosition; // vertex position in world space
varying vec3 viewPosition; // vertex position in view space
varying vec3 viewNormal; // normal in view space
varying vec3 worldNormal;
#if DIFFUSEMAP || NORMALMAP
	varying vec2 uVu;
#endif

uniform float repeat;

#if DIFFUSEMAP
uniform sampler2D DiffuseMap;
#else
uniform vec3 diffuse_color;
#endif

#if NORMALMAP
uniform sampler2D NormalMap;
#endif


uniform float roughness;
uniform float metallic;
uniform float specular;
uniform samplerCube environment;
uniform float reflectivity;
uniform float ambientIntensity;

#if MAX_SPOT_LIGHTS > 0
	uniform vec3 spotLightColor[ MAX_SPOT_LIGHTS ];
	uniform vec3 spotLightPosition[ MAX_SPOT_LIGHTS ]; // WORLD SPACE POSITION
	uniform vec3 spotLightDirection[ MAX_SPOT_LIGHTS ];
	uniform float spotLightAngleCos[ MAX_SPOT_LIGHTS ];
	uniform float spotLightExponent[ MAX_SPOT_LIGHTS ];
	uniform float spotLightDistance[ MAX_SPOT_LIGHTS ];
	uniform float spotLightDecay[ MAX_SPOT_LIGHTS ];
#endif

#if MAX_DIR_LIGHTS > 0
	uniform vec3 directionalLightColor[ MAX_DIR_LIGHTS ];
	uniform vec3 directionalLightDirection[ MAX_DIR_LIGHTS ];
#endif

#ifdef USE_SHADOWMAP

	uniform sampler2D shadowMap[ MAX_SHADOWS ];
	uniform vec2 shadowMapSize[ MAX_SHADOWS ];

	uniform float shadowDarkness[ MAX_SHADOWS ];
	uniform float shadowBias[ MAX_SHADOWS ];

	varying vec4 vShadowCoord[ MAX_SHADOWS ];

	float unpackDepth( const in vec4 rgba_depth ) {

		const vec4 bit_shift = vec4( 1.0 / ( 256.0 * 256.0 * 256.0 ), 1.0 / ( 256.0 * 256.0 ), 1.0 / 256.0, 1.0 );
		float depth = dot( rgba_depth, bit_shift );
		return depth;

	}

#endif

float saturate(float v)
{
	return clamp(v, 0.0, 1.0);
}

vec2 saturate(vec2 v)
{
	return clamp(v, 0.0, 1.0);
}

vec3 saturate(vec3 v)
{
	return clamp(v, 0.0, 1.0);
}

vec4 saturate(vec4 v)
{
	return clamp(v, 0.0, 1.0);
}

#if NORMALMAP
vec3 perturbNormal2Arb( vec3 eye_pos, vec3 surf_norm ) {

	vec3 q0 = dFdx( eye_pos.xyz );
	vec3 q1 = dFdy( eye_pos.xyz );
	vec2 st0 = dFdx( uVu.st );
	vec2 st1 = dFdy( uVu.st );
	vec3 S = normalize(  q0 * st1.t - q1 * st0.t );
	vec3 T = normalize( -q0 * st1.s + q1 * st0.s );
	vec3 N =  surf_norm ;
	vec3 mapN = texture2D( NormalMap, repeat * uVu ).xyz * 2.0 - 1.0;
	mat3 tsn = mat3( S, T, N );
	return normalize( tsn * mapN );
}
#endif

// Lambert
vec3 diffuse(vec3 albedo, float NdL, float NdV, float VdH, float roughness)
{
	return albedo / PI;
}


// GGX: Microfacet Models for Refraction through Rough Surfaces [Walter07]
float distribution(float alpha, float NdH)
{
	float alpha_square = alpha * alpha;
	float NdH_square = NdH * NdH;
	float den = NdH_square * (alpha_square - 1.0) + 1.0;
	den = pow(den, 2.0) * PI;
	return alpha_square / den;
}


// Schlick Approximation: An Inexpensive BRDF Model for Physically-based Rendering [Schlick94]
vec3 fresnel(vec3 specular, float VdH)
{
	return specular + (1.0 - specular) * pow(1.0 - VdH, 5.0);
}


// Epic Games: Real Shading in Unreal Engine 4 [Siggraph13]
float roughness_remap(float roughness)
{
	return max(roughness * roughness, 0.0001);
}


float G1(float NdV, float k)
{
	return NdV / (NdV * (1.0 - k) + k);
}

// Smith-Schlick: An Inexpensive BRDF Model for Physically-based Rendering [Schlick94]
float shadowing(float alpha, float NdV, float NdL, float NdH, float VdH, float LdV)
{
	//float k = alpha * sqrt(2.0 / PI); // Schlick remap
	float k = alpha / 2.0; // Epic remap
	//float k = pow(0.8 + 0.5 * alpha, 2.0) / 2.0; // Crytek remap
	return G1(NdL, k) * G1(NdV, k);
}


void main()
{

#if DIFFUSEMAP
	vec3 albedo = pow(texture2D(DiffuseMap, repeat * uVu), vec4(GAMMA)).xyz;
#else
	vec3 albedo = diffuse_color;
#endif

#if NORMALMAP
	vec3 normal = perturbNormal2Arb(viewPosition, normalize(viewNormal));
#else
	vec3 normal = normalize(viewNormal);
#endif

	vec3 view_vector = normalize(-viewPosition);
	float alpha = roughness_remap(roughness);
	vec3 color = vec3(0.0);

	// NdV used also to compensate reflection at gracing angles
	float NdV = saturate(dot(normal, view_vector));

	// Distinction between metallic and dieletric materials
    // https://seblagarde.wordpress.com/2011/08/17/feeding-a-physical-based-lighting-mode/
    // Linearly interpolate to get the right albedo and specular
    vec3 real_albedo = mix(albedo, vec3(0.0), metallic);
    float dieletric_specular = mix(0.02, 0.05, specular);
    vec3 real_specular = mix(vec3(dieletric_specular), albedo, metallic);

#if MAX_SPOT_LIGHTS > 0
	
	for (int i = 0; i < MAX_SPOT_LIGHTS; i++)
	{
		vec3 lightPosition = (viewMatrix * vec4(spotLightPosition[i], 1.0)).xyz;
		vec3 light_vector = lightPosition - viewPosition;

		float attenuation = 1.0;
		if (spotLightDecay[i] > 0.0)
			attenuation = pow ( clamp(1.0 - length(light_vector) / spotLightDistance[i], 0.0, 1.0) , spotLightDecay[i]);

		light_vector = normalize(light_vector);

		float beta = dot(spotLightDirection[i], normalize(spotLightPosition[i] - worldPosition));

		if (beta > spotLightAngleCos[i])
		{
			float fallOffEffect = max( pow(max(beta, 0.0), spotLightExponent[i]), 0.0);

			vec3 half_vector = normalize(light_vector + view_vector);

			float NdL = saturate(dot(normal, light_vector));
    		float NdH = saturate(dot(normal, half_vector));
    		float VdH = saturate(dot(view_vector, half_vector));
    		float LdV = saturate(dot(light_vector, view_vector));

    		vec3 diffuse_comp = diffuse(real_albedo, NdL, NdV, VdH, roughness);
    		vec3 specular_comp = distribution(alpha, NdH) * shadowing(alpha, NdV, NdL, NdH, VdH, LdV) * fresnel(real_specular, VdH) / (4.0 * NdL * NdV + 0.0001);

    		color += (diffuse_comp * (1.0 - specular_comp) + specular_comp) * spotLightColor[i] * NdL * fallOffEffect * attenuation;

		}

	}

#endif

#if ENVMAP
	
	vec3 world_ViewVector = worldPosition - cameraPosition;
	vec3 reflect_vector = reflect(normalize(world_ViewVector), normalize(worldNormal));
    reflect_vector.x *= -1.0;
    float mipIndex =  alpha * 8.0;
    vec3 reflection = textureCube(environment, reflect_vector, mipIndex).rgb;
    reflection = pow(reflection, vec3(GAMMA)) * 1.2;

    vec3 env_fresnel = real_specular + (max(real_specular, 1.0 - alpha) - real_specular) * pow((1.0 - NdV), 15.0);

    color += env_fresnel * reflectivity * reflection;
	
#endif

	color += real_albedo * ambientIntensity;

//////////////// 		SHADOW MAPPING        ///////////////////

#ifdef USE_SHADOWMAP


	float fDepth;
	
	vec3 shadowColor = vec3( 1.0 );
	
	for(int i = 0; i < MAX_SHADOWS; i++)
	{
		vec3 shadowCoord = vShadowCoord[ i ].xyz / vShadowCoord[ i ].w;
		bvec4 inFrustumVec = bvec4 ( shadowCoord.x>= 0.0, shadowCoord.x <= 1.0, shadowCoord.y>= 0.0, shadowCoord.y <= 1.0 );
		bool inFrustum = all( inFrustumVec );
		bvec2 frustumTestVec = bvec2( inFrustum, shadowCoord.z <= 1.0 );
		bool frustumTest = all( frustumTestVec );
		
		if (frustumTest)
		{
			shadowCoord.z += shadowBias[ i ];
			float shadow = 0.0;
			
			float xPixelOffset = 1.0 / shadowMapSize[ i ].x;
			float yPixelOffset = 1.0 / shadowMapSize[ i ].y;
			
			float dx0 = -1.0 * xPixelOffset;
			float dy0 = -1.0 * yPixelOffset;
			float dx1 = 1.0 * xPixelOffset;
			float dy1 = 1.0 * yPixelOffset;
			
			mat3 shadowKernel;
			mat3 depthKernel;
			
			depthKernel[0][0] = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( dx0, dy0 ) ) );
			depthKernel[0][1] = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( dx0, 0.0 ) ) );
			depthKernel[0][2] = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( dx0, dy1 ) ) );
			depthKernel[1][0] = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( 0.0, dy0 ) ) );
			depthKernel[1][1] = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy ) );
			depthKernel[1][2] = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( 0.0, dy1 ) ) );
			depthKernel[2][0] = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( dx1, dy0 ) ) );
			depthKernel[2][1] = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( dx1, 0.0 ) ) );
			depthKernel[2][2] = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( dx1, dy1 ) ) );
			
			vec3 shadowZ = vec3( shadowCoord.z );
			
			shadowKernel[0] = vec3(lessThan(depthKernel[0], shadowZ ));
			shadowKernel[0] *= vec3(0.25);
			shadowKernel[1] = vec3(lessThan(depthKernel[1], shadowZ ));
			shadowKernel[1] *= vec3(0.25);
			shadowKernel[2] = vec3(lessThan(depthKernel[2], shadowZ ));
			shadowKernel[2] *= vec3(0.25);
			
			vec2 fractionalCoord = 1.0 - fract( shadowCoord.xy * shadowMapSize[i].xy );
			
			shadowKernel[0] = mix( shadowKernel[1], shadowKernel[0], fractionalCoord.x );
			shadowKernel[1] = mix( shadowKernel[2], shadowKernel[1], fractionalCoord.x );
			
			vec4 shadowValues;
			shadowValues.x = mix( shadowKernel[0][1], shadowKernel[0][0], fractionalCoord.y );
			shadowValues.y = mix( shadowKernel[0][2], shadowKernel[0][1], fractionalCoord.y );
			shadowValues.z = mix( shadowKernel[1][1], shadowKernel[1][0], fractionalCoord.y );
			shadowValues.w = mix( shadowKernel[1][2], shadowKernel[1][1], fractionalCoord.y );
			
			shadow = dot( shadowValues, vec4( 1.0 ) );
			
			shadowColor *= vec3( ( 1.0 - shadowDarkness[ i ] * shadow ) );
		
		} else {

			// shadowColor *= vec3(shadowDarkness[ i ]);
		}
	
	}
	
	color *= shadowColor;

#endif


//////////////// 		END SHADOW MAPPING        ///////////////////

	gl_FragColor = pow(vec4(color, 1.0), vec4(1.0/ GAMMA));

}



