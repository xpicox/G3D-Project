#extension GL_EXT_frag_depth : enable

varying vec3 worldPosition; // vertex position in world space

#if MAX_SPOT_LIGHTS > 0
	uniform vec3 spotLightColor[ MAX_SPOT_LIGHTS ];
	uniform vec3 spotLightPosition[ MAX_SPOT_LIGHTS ]; // WORLD SPACE POSITION
	uniform vec3 spotLightDirection[ MAX_SPOT_LIGHTS ];
	uniform float spotLightAngleCos[ MAX_SPOT_LIGHTS ];
	uniform float spotLightExponent[ MAX_SPOT_LIGHTS ];
	uniform float spotLightDistance[ MAX_SPOT_LIGHTS ];
	uniform float spotLightDecay[ MAX_SPOT_LIGHTS ];
#endif


void main ()
{	
	float alpha = 0.1;
	// Angle between view and direction
	vec3 spotLightPos = spotLightPosition[ lightIndex ];
	vec3 v = cameraPosition - spotLightPos;
	vec3 light_vector = spotLightPos - worldPosition;
	float dist = length(v);
	// -(viewMatrix * vec4(spotLightPosition[ lightIndex ], 1.0)).xyz;

	vec3 d = normalize(- spotLightDirection[ lightIndex ]);
	v = normalize(v);
	// d = normalize(d);
	float VdotD = dot(v, d);
    
   float attenuation = 1.0;
   if (spotLightDecay[lightIndex] > 0.0)
       attenuation = pow ( clamp(1.0 - length(light_vector) / spotLightDistance[lightIndex], 0.0, 1.0) , spotLightDecay[lightIndex]);

	if ( VdotD > spotLightAngleCos[ lightIndex ] )
	{
		// Discard front faces if we are inside the cone light
		if(gl_FrontFacing)
			discard;
		
		vec3 viewVector = worldPosition - spotLightPos;
		// alpha += 0.8 * (1.0 - clamp(length(viewVector), 0.0, dist)/dist) * pow(VdotD, 3.4);
		alpha = mix(1.0, 0.3, clamp(length(viewVector), 0.0, dist)/dist) * pow(VdotD, 3.3);
		#ifdef GL_EXT_frag_depth
			gl_FragDepthEXT = -1.0;
		#endif
	} else {
		if(!gl_FrontFacing)
			discard;
		#ifdef GL_EXT_frag_depth
			gl_FragDepthEXT = gl_FragCoord.z;
			attenuation *= 2.0;
		#endif
	}

	
	vec3 color = vec3(VdotD); // vec3(1.0,1.0,0.0)
	gl_FragColor = vec4(pow( spotLightColor[lightIndex] , vec3(0.45)), alpha * attenuation);
}