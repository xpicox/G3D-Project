#define PI 3.14159
#define RECIPROCAL_PI 0.31831

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
uniform vec3 specular_color;
uniform float metallic;
uniform float specular;
// MAX_SPOT_LIGHTS defined by three.js
// uniforms passed by three.js to the shader
#if MAX_DIR_LIGHTS > 0
	uniform vec3 directionalLightColor[ MAX_DIR_LIGHTS ];
	uniform vec3 directionalLightDirection[ MAX_DIR_LIGHTS ];
#endif

#if MAX_SPOT_LIGHTS > 0
	uniform vec3 spotLightColor[ MAX_SPOT_LIGHTS ];
	uniform vec3 spotLightPosition[ MAX_SPOT_LIGHTS ]; // WORLD SPACE POSITION
	uniform vec3 spotLightDirection[ MAX_SPOT_LIGHTS ];
	uniform float spotLightAngleCos[ MAX_SPOT_LIGHTS ];
	uniform float spotLightExponent[ MAX_SPOT_LIGHTS ];
	uniform float spotLightDistance[ MAX_SPOT_LIGHTS ];
	uniform float spotLightDecay[ MAX_SPOT_LIGHTS ];
#endif

// alpha = (Roughness remapping)^2

vec3 DiffuseLambert(vec3 diffuseColor)
{
	return diffuseColor / PI;
}

vec3 DiffuseDisney(vec3 lightColor, float roughness, float NdotL, float NdotV, float VdotH)
{

	float FD90 = (0.5 + 2.0 * VdotH * VdotH) * roughness;
	FD90 -= 1.0;
	float inv = 1.0 - NdotL;
	float pow5 = inv * inv;
	pow5 = pow5 * pow5 * inv;
	float FL = 1.0 + FD90 * pow5;
	float FV = 1.0 + FD90 * pow5;
	return lightColor * FL * FV / PI;

}

// ADD ALSO OREN-NAYAR
vec3 Diffuse(vec3 lightColor, float roughness, float NdotL, float NdotV, float VdotH)
{
#if DIFFUSE == 0
	return DiffuseLambert(lightColor);
#elif DIFFUSE == 1
	return DiffuseDisney(lightColor, roughness, NdotL, NdotV, VdotH);
#endif
}

// http://digibug.ugr.es/bitstream/10481/19751/1/rmontes_LSI-2012-001TR.pdf
// Retro-reflection of the material
// vec3 DiffuseOrenNayar(vec3 lightColor, float roughness, float NdotL, float NdotV, float VdotH)
// {
// 	// a bit complicated
// 	// find a simplified
// 	// UE4 IMPLEMENETATION
// 	// float VoL = 2 * VoH - 1;
// 	// float m = Roughness * Roughness;
// 	// float m2 = m * m;
// 	// float C1 = 1 - 0.5 * m2 / (m2 + 0.33);
// 	// float Cosri = VoL - NoV * NoL;
// 	// float C2 = 0.45 * m2 / (m2 + 0.09) * Cosri * ( Cosri >= 0 ? min( 1, NoL / NoV ) : NoL );
// 	// return DiffuseColor / PI * ( NoL * C1 + C2 );


// 	float alpha = roughness * roughness;
// 	alpha = alpha * alpha;
// 	float A = 1.0 - 0.5 alpha / (alpha + 0.33) ;
// 	float B = 0.45 * alpha / (alpha + 0.09);
// 	float a = max();
// 	float b = min();
// }

// http://graphicrants.blogspot.it/2013/08/specular-brdf-reference.html
// NORMAL DISTRIBUTION FUNCTIONS
// NDF determines the size and shape of the highlight.
// GGX - Trowbridge-Reitz
float DGGX(float roughness, float NdotH)
{

	float alpha = roughness * roughness;
	alpha = alpha * alpha;
	float pow2 = NdotH * NdotH;
	// (NdotH*(a2-1.0)+1.0) = NdotH * alpha - NdotH + 1.0 => espresso nella forma multiply then add
	float d = pow2 * alpha - pow2 + 1.0;
	return alpha / (PI * d * d);

}

float DBeckman(float roughness, float NdotH)
{
	
	float alpha = roughness * roughness;
	alpha = alpha * alpha;
	float pow2 = NdotH * NdotH;
	float expo =  - (1.0 - pow2) / (alpha * pow2);

	return 1.0 / (PI * alpha * pow2 * pow2) * pow(2.7182, expo);

}

// The geometric term is calculated following the Smith method:
// G(l,v,h) = G1(l)G1(v)

// float GKelemen (float VdotH) 
// {
// 	return 1.0 / (VdotH * VdotH);
// }

// Schlick Approximation of Beckmann equation
float GSchlickBeckmann (float roughness, float NdotL, float NdotV)
{

	roughness += 1.0;
	float alpha = roughness * roughness;
	// Brian Karis aproximated k as follows
	// Real Shading in Unreal Engine 4 by Brian Karis
	// https://de45xmedrsdbp.cloudfront.net/Resources/files/2013SiggraphPresentationsNotes-26915738.pdf
	float k = alpha / 8.0;

	float schlickL = NdotL * (1.0 - k) + k;
	float schlickV = NdotV * (1.0 - k) + k;

	return 1.0 / (schlickV * schlickL);

}

// Fresnell term
vec3 FSchlick(vec3 specularColor, float VdotH)
{

	float inv = 1.0 - VdotH;
	float pow5 = inv * inv;
	pow5 = pow5 * pow5 * inv;

	return specularColor + (1.0 - specularColor) * pow5;

}

void main() {

	vec3 totalDiffuseLight = vec3(0.0);
	vec3 totalSpecularLight = vec3(0.0);
	vec3 color = vec3(1.0);
	
	// Roughness remapping
	// according to Physically Based Shading at Disney by Brent Burley
	// http://blog.selfshadow.com/publications/s2012-shading-course/burley/s2012_pbs_disney_brdf_notes_v3.pdf
	float roughness = (roughness + 1.0)/2.0;

	vec3 v = normalize(-viewPosition);
	vec3 n = normalize(n_);

#if MAX_SPOT_LIGHTS > 0
	for (int i = 0; i < MAX_SPOT_LIGHTS; i++)
	{
		vec3 lightPosition = (viewMatrix * vec4(spotLightPosition[i], 1.0)).xyz;
		vec3 l = lightPosition - viewPosition; // LIGHT VECTOR

		l = normalize(l);

		// angle between light direction and light vector
		float beta = dot(spotLightDirection[i], normalize(spotLightPosition[i] - worldPosition));
		color = vec3(0.0,1.0,0.0);
		// make the light computation only if the fragment is in the spotlight cone
		if (beta > spotLightAngleCos[i]) {

			float fallOffEffect = max( pow(max(beta, 0.0), spotLightExponent[i]), 0.0);

			vec3 h = normalize(l+v);
			float VdotH = dot(v,h); // = LdotH
			float NdotL = dot(n, l);
			float NdotV = dot(n, v);
			float NdotH = dot(n, h);

			totalDiffuseLight += Diffuse(spotLightColor[i], roughness, NdotL, NdotV, VdotH) * fallOffEffect * max(NdotL, 0.0);

			// Microfacets model

			vec3 BRDF = DGGX(roughness, NdotH) * GSchlickBeckmann(roughness, NdotL, NdotV) * FSchlick(specular_color, VdotH) * 0.25;

			totalSpecularLight +=  BRDF * spotLightColor[i] * fallOffEffect * max(NdotL, 0.0);

		}
	}
#endif

#if MAX_DIR_LIGHTS > 0

	for( int i = 0; i < MAX_DIR_LIGHTS; i ++ ) {

		vec3 l = normalize( (viewMatrix * vec4(directionalLightDirection[ i ], 0.0 )).xyz );

		vec3 h = normalize(l+v); 	// Halfway vector
		float VdotH = max(dot(v,h), 0.0001); 	// LdotH
		float NdotL = max(dot(n, l), 0.0001);
		float NdotV = max(dot(n, v), 0.0001);
		float NdotH = max(dot(n, h), 0.0001);

		// Diffuse
		totalDiffuseLight += Diffuse(directionalLightColor[i], roughness, NdotL, NdotV, VdotH) * max(NdotL, 0.0);

		// Microfacets model

		vec3 BRDF = DGGX(roughness, NdotH) * GSchlickBeckmann(roughness, NdotL, NdotV) * FSchlick(specular_color, VdotH) * 0.25;

		totalSpecularLight += BRDF * directionalLightColor[i] * max(NdotL, 0.0);

	}

#endif
	// metallic = nodiffuse + specular is base color
	//color = mix(diffuse_color/PI * totalDiffuseLight, diffuse_color/PI * totalDiffuseLight +totalSpecularLight, metallic);

	color = mix(diffuse_color * totalDiffuseLight, totalSpecularLight, specular);

	gl_FragColor = vec4(pow(color, vec3(1.0)), 1.0);

}