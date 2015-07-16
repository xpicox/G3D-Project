# G3D-Project
Project for the Interactive 3D course.<br/>Written by Valentino **Picotti** and Michele **Collevati**

Preview: http://xpicox.github.io/G3D-Project/
##Goal
Develop a Web page based on 3D graphics, using three.js, that showcases a product using realistic materials and illumination.
##Scene Composition
The scene is composed by a garage, a car and 5 lights.<br/>
The car model was taken from https://clara.io <br/>
The garage model and the environment, diffuse and normal textures were realized by http://www.rtview.it <br/>
##Light Staging
We have placed 3 *spotlights* in the following positions:

1. First Light : ```new THREE.Vector3(0.0, 500.0, 0.0);```
2. Second Light : ```new THREE.Vector3(0.0, 400.0, 400.0);```
3. Third Light : ```new THREE.Vector3(0.0, 400.0, -400.0);```

The fourth and fifth light are the lights of the car. <br/>
The 3 main spotlights cast shadows.
##Materials
All the objects in the scene have a ```THREE.ShaderMaterial``` with our [*Shader*](https://github.com/xpicox/G3D-Project/blob/master/media/materials/fragmentShader.glsl).<br/>
The *Fragment shader* implements the following techniques:
- Microfacets based BRDF with Lambertian diffuse and Cook-Torrance specular model with the following terms:
 - GGX Normal Distribution Function
 - Schlick approximation for the Fresnel terms
 - Schlick approximation of the Smith Geometric Shadowing
- Environment Mapping
- Diffuse Mapping
- Normal Mapping
- Shadow Mapping

The *shader* has the following paramenters:
- **Diffuse Color** (RGB)
- **Metallic** : A ```float``` in the range ```[0.0, 1.0]```. 0.0 means dielectric materials (such as plastic) and 1.0 means conductor (metallic) materials. See this [post](https://seblagarde.wordpress.com/2011/08/17/feeding-a-physical-based-lighting-mode/) by Sébastien Lagarde for more details.
- **Specular Color** : A ```float``` in the range ```[0.0, 1.0]```. Remapped in the range ```[0.02, 0.05]``` for the reasons explained in the link above.
For dielectric materials this float feeds the Fresnel term as a ```vec3(specular)```; for metallic materials this term is ignored and the diffuse color is taken as the specular color of the material.
- **Reflectivity** : A ```float``` int the range ```[0.0, 1.0]```. Attenuates the reflection of the environment on the material.

According to Disney BRDF model, metallic materials have no diffuse: the *metallic* parameter that let us switch between dielectric and conductor materials is used to linearly interpolate the *diffuse* and the *specular* terms of the material to match one or the other model.

##Interaction
At the beginning of the presentation we animated the car and the camera in a fancy way to highlight the presented product. Only when the animation ends, the user can interact with the scene. <br/>
The user is able to inspect the object using the three.js camera controls, chose the car's main body color, turn on/off the car's lights with ```L``` key and let the car go out the scene with the ```S``` key.

##Post-Processing
For the post-processing effect we evaluated different effects but for the lack of time our choice fell on a simple vignetting.
##Project Structure
The project is composed by three files:
- *Project.js* : contains all the functions and object required to initialize the scene.
- *main.js* : contains the scene initialization.
- *assets.json* : specifies the assets and materials required by the scene

We wrote an **Asset Manager** that first loads all the assets required by the scene, then builds our materials according to what we have specified in the *assets.json* file and finally stores them in the **Shader Manager**.
##References
1. [ Physically-Based Shading at Disney ](https://disney-animation.s3.amazonaws.com/library/s2012_pbs_disney_brdf_notes_v2.pdf) by **Brent Burley**
2. [Real Shading in Unreal Engine 4 ](https://de45xmedrsdbp.cloudfront.net/Resources/files/2013SiggraphPresentationsNotes-26915738.pdf) by **Brian Karis**
3. [Moving Frostbite to Physically Based Rendering]( http://www.frostbite.com/wp-content/uploads/2014/11/course_notes_moving_frostbite_to_pbr.pdf) by **Sébastien Lagarde** and **Charles de Rousiers**
4. Random reads from the following **SIGGRAPH Courses**:
 1. [SIGGRAPH 2010 Course: Physically-Based Shading Models in Film and Game Production](http://renderwonk.com/publications/s2010-shading-course/)
 2. [SIGGRAPH 2012 Course : Practical Physically Based Shading in Film and Game Production](http://blog.selfshadow.com/publications/s2012-shading-course/)
 3. [SIGGRAPH 2013 Course: Physically Based Shading in Theory and Practice](http://blog.selfshadow.com/publications/s2013-shading-course/)
 4. [SIGGRAPH 2014 Course: Physically Based Shading in Theory and Practice](http://blog.selfshadow.com/publications/s2014-shading-course/#course_content)
5. Blogs:
  1. [Sébastien Lagarde](https://seblagarde.wordpress.com)
  2. [Brian Karis](http://graphicrants.blogspot.it)
  3. [Naty Hoffman](http://renderwonk.com/blog/)
  4. [Aras Pranckevičius](http://aras-p.info)
  5. [Stephen Hill](http://blog.selfshadow.com)
