#define PI 3.14159
#define RECIPROCAL_PI 0.31831
#define GAMMA 2.2

// #define DIFFUSE_MAP 	true/false
// #define NORMAL_MAP	true/false
// #define DIFFUSE :
// 0 Lambert
// 1 Disney diffuse
// 2 Oren-Nayar

varying vec3 worldPosition; // vertex position in world space
varying vec3 viewPosition; // vertex position in view space
varying vec3 n_; // normal in view space

uniform vec3 diffuse_color;
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
	vec3 normal = normalize(n_);
	vec3 view_vector = normalize(-viewPosition);
	float alpha = roughness_remap(roughness);
	vec3 color = vec3(0.0);

	// NdV used also to compensate reflection at gracing angles
	float NdV = saturate(dot(normal, view_vector));

	// Distinction between metallic and dieletric materials
    // https://seblagarde.wordpress.com/2011/08/17/feeding-a-physical-based-lighting-mode/
    // Linearly interpolate to get the right albedo and specular
    vec3 real_albedo = mix(diffuse_color, vec3(0.0), metallic);
    float dieletric_specular = mix(0.02, 0.05, specular);
    vec3 real_specular = mix(vec3(dieletric_specular), diffuse_color, metallic);

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
	vec3 reflect_vector = reflect(-view_vector, normal);
    reflect_vector.x *= -1.0;
    float mipIndex =  alpha * 8.0;
    vec3 reflection = textureCube(environment, reflect_vector, mipIndex).rgb;
    reflection = pow(reflection, vec3(GAMMA));

    vec3 env_fresnel = real_specular + (max(real_specular, 1.0 - alpha) - real_specular) * pow((1.0 - NdV), 15.0);

    color += env_fresnel * reflectivity * reflection;
	
#endif
	
	color += real_albedo * ambientIntensity;

	gl_FragColor = pow(vec4(color, 1.0), vec4(1.0/ GAMMA));

}



