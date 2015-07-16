var PROJECT = { 
	NAME: "Saul's Garage",
	STUDENTS: "Picotti V. & Collevati M.",
}

//////// PROJECT CONSTANTS AND TYPES
// ASSET TYPE
PROJECT.MODEL = 0;
PROJECT.TGATEXTURE = 1;
PROJECT.JPGTEXTURE = 2;
PROJECT.SHADER = 3;
PROJECT.MATERIAL = 4;

//////// PROJECT CONSTANTS AND TYPES



//////// SHADER MANAGER

PROJECT.ShaderManager = function() {
	this.materialLoader = new THREE.MaterialLoader();
}

PROJECT.ShaderManager.prototype = {
	constructor: PROJECT.ShaderManager,


	addShader : function (shaderMaterial) {
		if (shaderMaterial instanceof THREE.ShaderMaterial) {
			if(shaderMaterial.name !== "")
				this[shaderMaterial.name] = shaderMaterial;
			else
				console.error("Material with invalid name");
		} else {
			console.error("Not a THREE.ShaderMaterial");
		}
	},

	getShader : function (name) {
		if (this[name] !== undefined)
			return this[name];
		else
			console.error("Invalid shader name");
	},

	initMaterial: function (material) {
		var mat = this.materialLoader.parse(material);
		mat.vertexShader = PROJECT.assetsManager.assets[mat.vertexShader];
		mat.fragmentShader = PROJECT.assetsManager.assets[mat.fragmentShader];
		mat.defines = material.defines;
		mat.lights = material.lights;
		if(mat.lights) {
			mat.uniforms = THREE.UniformsUtils.merge([
			THREE.UniformsLib['lights'],
			THREE.UniformsLib['shadowmap'],
			mat.uniforms
			]);
		}
		mat.name = material.name;
		this[mat.name] = mat;
	},

	initMaterials: function (materials) {
		if(materials instanceof Array)
			for (var mat of materials) {
				this.initMaterial(mat);
			}
		else
			console.warn("Not an array!");
	}

}

//////// END OF SHADER MANAGER

/////// ASSET MANAGER / LOADER

PROJECT.Asset = function (params, type, name) {
	if (arguments.length === 1) {
		this.url = params.url !== undefined ? params.url : "";
		this.type = params.type !== undefined ? PROJECT[params.type] : "";
		this.name = params.name !== undefined ? params.name : "";
	} else if (arguments.length === 3) {
		this.url = params;
		this.type = type;
		this.name = name;
	}
}

PROJECT.Asset.fromJSON = function(json){
	var asset = new PROJECT[json.constructor](json);
	return asset;
}

PROJECT.Asset.prototype = {
	constructor: PROJECT.Asset
}

PROJECT.AssetManager = function () {
	this.assimpLoader = new THREE.AssimpJSONLoader();
	this.imageLoader = new THREE.ImageLoader();
	this.TGALoader = new THREE.TGALoader();
	this.assetsCount = 0;
	this.loadedAssets = 0;
	this.assets = {};
	this.materials = {};
	this.callback = function (asset, callback, object) {
		this.assets[asset.name] = object;
		$( "#progressbar" ).progressbar( "value", ++this.loadedAssets );
		if(this.loadedAssets == this.assetsCount) {
			callback();
		}
	}

}


PROJECT.AssetManager.prototype = {
	constructor: PROJECT.AssetManager,

	addAsset: function (asset) {
		if ( asset instanceof PROJECT.Asset) {
			this.assets[asset.name] = asset;
			this.assetsCount++;
		}
		else
			console.warn("Not an instance of PROJECT.Asset");
	},

	addAssets: function (assets) {
		if (assets instanceof Array)
		{
			$( "#progressbar" ).progressbar( "option", "max", assets.length );
			for (var asset of assets)
				this.addAsset(new PROJECT.Asset(asset));
		}
		else
			console.warn("Invalid argument");
	},

	load : function (name, callback) {
		var ass = this.assets[name];
		var cb = callback === undefined ? ass.callback : callback
		if (ass.type === PROJECT.MODEL)
			this.assimpLoader.load(ass.url, cb);
		else
			this.imageLoader.load(ass.url, cb);
	},

	type : function (name) {
		if (this.assets[name] === undefined)
			return null;
		else
			return this.assets[name].type;
	},
	
	loadAssets : function(callback) {
		for (var ass in this.assets) {
			switch (this.assets[ass].type) {
				case PROJECT.MODEL:
					this.assimpLoader.load(this.assets[ass].url, this.callback.bind(this, this.assets[ass], callback));
					break;
				case PROJECT.TGATEXTURE:
					this.TGALoader.load(this.assets[ass].url, this.callback.bind(this, this.assets[ass], callback));
					break;
				case PROJECT.JPGTEXTURE:
					THREE.ImageUtils.loadTexture(this.assets[ass].url, THREE.UVMapping, this.callback.bind(this, this.assets[ass], callback));
					break;
				case PROJECT.SHADER:
					$.ajax({url:this.assets[ass].url, success: this.callback.bind(this, this.assets[ass], callback), dataType: "text" });
					break;
				default:
					break;
			}
		}
	}
}

/////// END OF ASSET MANAGER / LOADER

/////// PROJECT ACCESSOR METHODS

//// Initialize a WebGLRenderer
PROJECT.initRenderer = function()
{
	var renderer = new THREE.WebGLRenderer({ antialias: true, alpha : true});
	renderer.shadowMapEnabled = true;
	renderer.shadowMapType = THREE.PCFSoftShadowMap;
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setClearColor( 0x000000 );
	var gl = renderer.getContext();
	var ext = gl.getExtension('EXT_frag_depth');
	if (!ext)
		console.warn("EXT_frag_depth : unavailable")
	this.renderer = renderer;
	document.body.appendChild( renderer.domElement );
}

// dependencies: renderer,camera, lights
PROJECT.initComposer = function()
{
	var width = this.renderer.context.canvas.width;
	var height = this.renderer.context.canvas.height;
	var parameters = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, stencilBuffer: false };

	var renderTarget = new THREE.WebGLRenderTarget( width, height, parameters );
	var composer = new THREE.EffectComposer( this.renderer , renderTarget);
	composer.addPass( new THREE.RenderPass( this.scene, this.camera ) );

	this.camera.updateMatrixWorld(true);
	this.camera.updateMatrix();

	var vignettePP = new THREE.ShaderPass( PROJECT.shaderManager["vignette"] );
    vignettePP.renderToScreen = true;
    composer.addPass( vignettePP );
    this.composer = composer;
}

//// Initialize an empty scene
PROJECT.initScene = function()
{
	this.scene = new THREE.Scene();
	if (this.camera !== undefined)
		this.scene.add(this.camera);
}

//// Initialize camera and camera controls
PROJECT.initCamera = function(fov, aspectRatio, near, far)
{
	var camera = new THREE.PerspectiveCamera(fov, aspectRatio, near, far);
	camera.position.set(0.0,200.0,500.0);
	this.camera = camera;

	// Orbit Controlls
	var cameraControls = new THREE.OrbitControls( this.camera, this.renderer.domElement );
	this.cameraControls = cameraControls;
	cameraControls.enabled = false;

	if (this.scene !== undefined)
		this.scene.add(this.camera);
}

PROJECT.addLights = function ()
{
	var garage = this.assetsManager.assets["garage"];
	if (garage !== undefined) 
	{
		this.lights = [];
		function addLight(position, exponent, intensity)
		{
			var spotLight = new THREE.SpotLight(0xFFFFFF);
			spotLight.castShadow = true;
			spotLight.shadowMapWidth = 2048;
			spotLight.shadowMapHeight = 2048;
			spotLight.shadowCameraNear = 50;
			spotLight.shadowCameraFar = 4000;
			spotLight.shadowCameraFov = 90;
			spotLight.shadowCameraVisible = false;
			spotLight.shadowDarkness = 0.5;
			spotLight.shadowBias = 0.01;
			spotLight.position.copy(position);
			spotLight.intensity = intensity;
			spotLight.exponent = exponent;
			spotLight.angle = Math.PI/4;

			PROJECT.lights.push(spotLight);
			PROJECT.scene.add(spotLight);
		}

		addLight(new THREE.Vector3(0.0, 500.0, 0.0), 10.0, 0.8);
		addLight(new THREE.Vector3(0.0, 400.0, 400.0), 4.0, 1.0);
		addLight(new THREE.Vector3(0.0, 400.0, -400.0), 4.0, 1.0);

	} else 
		console.warn("Garage not laoded!");
}

PROJECT.addCar = function ()
{
	var car = this.assetsManager.assets["lamborghini"];
	if (!car)
		return;	
	
	car.castShadow = true;

	function getEnvironment() {

		var cubeMap = new THREE.CubeTexture( [] , THREE.CubeReflectionMapping);
		cubeMap.format = THREE.RGBFormat;
		cubeMap.flipY = false;
		var getSide = function ( x, y) {
			var size = 2048;
			var canvas = document.createElement( 'canvas' );
			canvas.width = size;
			canvas.height = size;
			var context = canvas.getContext( '2d' );
			context.drawImage( PROJECT.assetsManager.assets["garageCubeMap"].image, - x * size, - y * size );
			return canvas;
		};

		cubeMap.images[ 0 ] = getSide( 1, 0 ); // positivex
		cubeMap.images[ 1 ] = getSide( 3, 0 ); // negativex
		cubeMap.images[ 2 ] = getSide( 4, 0 ); // positivey
		cubeMap.images[ 3 ] = getSide( 5, 0 ); // negativey
		cubeMap.images[ 4 ] = getSide( 0, 0 ); // positivez
		cubeMap.images[ 5 ] = getSide( 2, 0 );  // negativez
		cubeMap.needsUpdate = true;
	
		return cubeMap;

	}

	env = getEnvironment();
	
	// MainBody
	var mainBody = car.getObjectByName("MainBody").children[0];
	mainBody.material = this.shaderManager["lamborghiniMainBody"];
	mainBody.material.uniforms.environment.value = env;

	// MAIN TRIM
	var mainTrim = car.getObjectByName("MainTrim").children[0];
	mainTrim.material = this.shaderManager["lamborghiniMainTrim"];

	// REAR EXHAUST INTERIOR
	var rearExhaustInterior = car.getObjectByName("RearExhaust_Interior").children[0];
	rearExhaustInterior.material = this.shaderManager["lamborghiniWheelDisc"];
	rearExhaustInterior.material.uniforms.environment.value = env;

	// REAR EXHAUST
	var rearExhaust = car.getObjectByName("RearExhaust").children[0];
	rearExhaust.material = this.shaderManager["lamborghiniWheelDisc"];
	rearExhaust.material.uniforms.environment.value = env;

	// Glass
	var glasses = car.getObjectByName("Glass").children[0];
	glasses.material = this.shaderManager["lamborghiniGlasses"];
	glasses.material.uniforms.environment.value = env;

	// Rear_Shelves
	var rearShelves = car.getObjectByName("Rear_Shelves").children[0];
	rearShelves.material = this.shaderManager["lamborghiniGlasses"];
	rearShelves.material.uniforms.environment.value = env;

	// Mirrors
	var mirrors = car.getObjectByName("Mirrors").children[0];
	mirrors.material = this.shaderManager["lamborghiniMirrors"];
	mirrors.material.uniforms.environment.value = getEnvironment();

	// SideMirrors
	var sideMirrors = car.getObjectByName("SideMirrors").children[0];
	sideMirrors.material = this.shaderManager["lamborghiniMainTrim"];

	// MainBody_RearLogo
	var rearLogo = car.getObjectByName("MainBody_RearLogo").children[0];
	rearLogo.material = this.shaderManager["lamborghiniWheelDisc"];
	rearLogo.material.uniforms.environment.value = env;

	// MainBody_Front_Logo
	var frontLogo = car.getObjectByName("MainBody_Front_Logo").children[0];
	frontLogo.material = this.shaderManager["lamborghiniFrontLogo"];
	frontLogo.material.uniforms.environment.value = env;

	// Engine
	var engine = car.getObjectByName("Engine").children[0];
	engine.material = this.shaderManager["lamborghiniEngine"];

	// FL_Wheel
	var FLWheel = car.getObjectByName("FL_Wheel").children[0];
	FLWheel.material = this.shaderManager["lamborghiniWheel"];
	FLWheel.material.uniforms.environment.value = env;

	// FL_Tires
	var FLTires = car.getObjectByName("FL_Tires").children[0];
	FLTires.material = this.shaderManager["lamborghiniTires"];

	// FL_Wheel_Disc
	var FLWheelDisc = car.getObjectByName("FL_Wheel_Disc").children[0];
	FLWheelDisc.material = this.shaderManager["lamborghiniWheelDisc"];
	FLWheelDisc.material.uniforms.environment.value = env;

	// FR_Wheel
	var FRWheel = car.getObjectByName("FR_Wheel").children[0];
	FRWheel.material = this.shaderManager["lamborghiniWheel"];
	FRWheel.material.uniforms.environment.value = env;

	// FR_Tires
	var FRTires = car.getObjectByName("FR_Tires").children[0];
	FRTires.material = this.shaderManager["lamborghiniTires"];

	// FR_Wheel_Disc
	var FRWheelDisc = car.getObjectByName("FR_Wheel_Disc").children[0];
	FRWheelDisc.material = this.shaderManager["lamborghiniWheelDisc"];
	FRWheelDisc.material.uniforms.environment.value = env;

	// R_Wheels
	var RWheels = car.getObjectByName("R_Wheels").children[0];
	RWheels.material = this.shaderManager["lamborghiniWheel"];
	RWheels.material.uniforms.environment.value = env;

	// R_TIres
	var RTires = car.getObjectByName("R_TIres").children[0];
	RTires.material = this.shaderManager["lamborghiniTires"];

	// R_Wheels_Disc
	var RWheelsDisc = car.getObjectByName("R_Wheels_Disc").children[0];
	RWheelsDisc.material = this.shaderManager["lamborghiniWheelDisc"];
	RWheelsDisc.material.uniforms.environment.value = env;

	// Wheels_Brake
	var brakes = car.getObjectByName("Wheels_Brake").children[0];
	brakes.material = this.shaderManager["lamborghiniBrakes"];
	brakes.material.uniforms.environment.value = env;

	car.traverse(function (c)
	{
		if (c instanceof THREE.Mesh)
		{
			c.castShadow = true;
			c.material.side = THREE.DoubleSide;
		}
	});

	if (!this.scene)
		return;

	this.scene.add(car);
	PROJECT.car = car;
	console.log( car );
}

// Add the garage to the scene
PROJECT.addGarage = function ()
{

	var garage = this.assetsManager.assets["garage"];
	garage.traverse(function (c)
	{
		if (c instanceof THREE.Mesh)
		{
			c.castShadow = true;
			c.receiveShadow = true;
			c.material.side = THREE.DoubleSide;
		}
	});

	if (!garage)
		return;

	var pavimento = garage.getObjectByName("Pavimento").children[0];
	pavimento.receiveShadow = true;
	pavimento.castShadow = false;
	pavimento.material = this.shaderManager["GarageFloor"]; // new THREE.MeshPhongMaterial({color : 0xAA98BB });
	pavimento.material.uniforms.DiffuseMap.value = this.assetsManager.assets["garageDiffuseMap"];
	this.assetsManager.assets["garageDiffuseMap"].wrapS = THREE.RepeatWrapping;
	this.assetsManager.assets["garageDiffuseMap"].wrapT = THREE.RepeatWrapping;
	pavimento.material.uniforms.NormalMap.value = this.assetsManager.assets["garageNormalMap"];
	this.assetsManager.assets["garageNormalMap"].wrapS = THREE.RepeatWrapping;
	this.assetsManager.assets["garageNormalMap"].wrapT = THREE.RepeatWrapping;
	// this.assetsManager.assets["garageDiffuseMap"].needsUpdate = true;
	
	console.log( garage );
	var colonne = garage.getObjectByName("Colonne").children.forEach( function(colonna)
	{
		colonna.children[0].material = PROJECT.shaderManager["GarageFloor"].clone();
		colonna.children[0].material.uniforms.DiffuseMap.value = PROJECT.assetsManager.assets["garageDiffuseMap"];
		PROJECT.assetsManager.assets["garageDiffuseMap"].wrapS = THREE.RepeatWrapping;
		PROJECT.assetsManager.assets["garageDiffuseMap"].wrapT = THREE.RepeatWrapping;
		colonna.children[0].material.uniforms.NormalMap.value = PROJECT.assetsManager.assets["garageNormalMap"];
		PROJECT.assetsManager.assets["garageNormalMap"].wrapS = THREE.RepeatWrapping;
		PROJECT.assetsManager.assets["garageNormalMap"].wrapT = THREE.RepeatWrapping;
	});



	if (this.scene === undefined) {
		console.warn("Can't add garage: undefined Scene");
		return;
	}
	this.scene.add(garage);
	PROJECT.garage = garage;
	console.log( garage );

}

// Add car lights
PROJECT.addCarLights = function ()
{
	if (this.car === undefined)
		return

	function addCone(light)
	{
		var geometry = new THREE.CylinderGeometry( 0.0, 1, 1, 32, 1, true );
		geometry.applyMatrix( new THREE.Matrix4().makeTranslation( 0, - 0.5, 0 ) );
		geometry.applyMatrix( new THREE.Matrix4().makeRotationX( - Math.PI / 2 ) );
		var material = PROJECT.shaderManager["LightCone"].clone();
		// material.blending = THREE.AdditiveBlending;
		material.depthWrite = false;
		material.transparent = true;
		material.defines = { lightIndex:  PROJECT.lights.length};	
		console.log(material.defines.lightIndex);
		material.side = THREE.DoubleSide;
		var cone = new THREE.Mesh(geometry, material);
		cone.name = "Cone";
		light.add(cone);
		light.updateMatrixWorld();
		PROJECT.lights.push(light);

		//console.log(material.defines.lightIndex);
		//console.log(PROJECT.lights.length);

		var vector = new THREE.Vector3();
		var vector2 = new THREE.Vector3();	
		var coneLength = light.distance ? light.distance : 10000;
		var coneWidth = coneLength * Math.tan( light.angle );	
		cone.scale.set( coneWidth, coneWidth, coneLength );	
		vector.setFromMatrixPosition( light.matrixWorld );
		vector2.setFromMatrixPosition( light.target.matrixWorld );
		var dir = vector2.sub( vector );
		cone.lookAt( dir );
		cone.translateOnAxis(new THREE.Vector3(0.0, 0.0, 1.0), 0);

	}

	function targetPosition(azimuth, polar, radius)
	{
		var x = radius * Math.sin(azimuth) * Math.sin(polar);
		var y = radius * Math.cos(polar);
		var z = radius * Math.cos(azimuth) * Math.sin(polar);
		return new THREE.Vector3(x, y, z);
	}

	function addLamp (lamp, targetPosition)
	{

		lamp.updateMatrixWorld();
		var spotLight = new THREE.SpotLight(0xcbe9ff);
		spotLight.position.set(-20, 0, 0);
		spotLight.intensity = 1.0;
		spotLight.exponent = 5.0;
		spotLight.distance = 1500;
		spotLight.angle = Math.PI/8;
		spotLight.castShadow = false;
		spotLight.shadowMapWidth = 2048;
		spotLight.shadowMapHeight = 2048;
		spotLight.shadowCameraNear = 50;
		spotLight.shadowCameraFar = 4000;
		spotLight.shadowCameraFov = 45;
		spotLight.shadowCameraVisible = false;
		spotLight.shadowDarkness = 0.5;
		spotLight.shadowBias = 0.01;

		lamp.add(spotLight);
		spotLight.target.position.copy(targetPosition);
		spotLight.add(spotLight.target); // Needed to auto-update target position according to light position. See documentation of spotlight

		addCone(spotLight);
		return spotLight;
	}

	var car = this.car;
	car.lights = [];

	// Spotlight orientation : target positioning
	var azimuth = -Math.PI/2 + Math.PI/24; // Angle
	var polar = 7/12*Math.PI;   // Angle
	var r = 100.0;
	var lamp = car.getObjectByName("FLLight");
	car.lights.push(addLamp(lamp, targetPosition(azimuth, polar, r)));
	azimuth -= 2 * Math.PI/24;
	lamp = car.getObjectByName("FRLight");
	lamp.position.set(-221, 69, -77);
	car.lights.push(addLamp(car.getObjectByName("FRLight"), targetPosition(azimuth, polar, r)));
	console.log(car.lights);
}

PROJECT.addCubeMap = function ()
{
	////////// GARAGE CUBEMAP

	var cubeMap = new THREE.CubeTexture( [] , THREE.CubeReflectionMapping);
	cubeMap.format = THREE.RGBFormat;
	cubeMap.flipY = false;
	var getSide = function ( x, y) {
		var size = 2048;
		var canvas = document.createElement( 'canvas' );
		canvas.width = size;
		canvas.height = size;
		var context = canvas.getContext( '2d' );
		console.log(PROJECT.assetsManager.assets["garageCubeMap"]);
		context.drawImage( PROJECT.assetsManager.assets["garageCubeMap"].image, - x * size, - y * size );
		return canvas;
	};
	cubeMap.images[ 0 ] = getSide( 1, 0 ); // positivex
	cubeMap.images[ 1 ] = getSide( 3, 0 ); // negativex
	cubeMap.images[ 2 ] = getSide( 4, 0 ); // positivey
	cubeMap.images[ 3 ] = getSide( 5, 0 ); // negativey
	cubeMap.images[ 4 ] = getSide( 0, 0 ); // positivez
	cubeMap.images[ 5 ] = getSide( 2, 0 );  // negativez
	cubeMap.needsUpdate = true;

	var cubeShader = THREE.ShaderLib['cube'];
	cubeShader.uniforms['tCube'].value = cubeMap;
	var skyBoxMaterial = new THREE.ShaderMaterial( {
		fragmentShader: cubeShader.fragmentShader,
		vertexShader: cubeShader.vertexShader,
		uniforms: cubeShader.uniforms,
		depthWrite: false,
		side: THREE.BackSide
	});

	var boxG = new THREE.BoxGeometry( 2000, 2000, 2000 );
	// console.log(boxG);
	var skyBox = new THREE.Mesh(
		boxG,
		skyBoxMaterial
	);
				
	PROJECT.scene.add( skyBox );
}

// Add car animation START
PROJECT.animateCarStart = function ()
{
	var car = this.car;

	// START ANIMATION
	car.position.z = 1000;
	car.rotateOnAxis( new THREE.Vector3( 0, 1, 0 ), -Math.PI/2.0 );

	var i = 1;

	var positionStart = { z : 1000 };
	var targetStart = { z : 0 };
	var tweenStart = new TWEEN.Tween(positionStart).to(targetStart, 2000);

	var latestTime = 0.0;

	tweenStart.onUpdate(function(time){
    		car.position.z = positionStart.z;

    		if (time > 0.994)
    			return;

    		PROJECT.car.rotateOnAxis(new THREE.Vector3(0.0, 1.0, 0.0), (time - latestTime) * Math.PI / 2);
    		latestTime = time;

    		car.children[13].rotateOnAxis( new THREE.Vector3( 0, 0, 1 ), Math.PI/(10 * i * i) );
    		car.children[14].rotateOnAxis( new THREE.Vector3( 0, 0, 1 ), Math.PI/(10 * i * i) );
    		car.children[15].rotateOnAxis( new THREE.Vector3( 0, 0, 1 ), Math.PI/(10 * i * i) );
    		i += 0.005;

    });

    tweenStart.onComplete(this.animateCamera.bind(this));

	tweenStart.delay(2000);
	PROJECT.car.lights.forEach(function (l) { l.visible = false; });
	setTimeout(function() { PROJECT.car.lights.forEach(function (l) { l.visible = true; }); }, 4500);

	tweenStart.easing(TWEEN.Easing.Quadratic.InOut);

	tweenStart.start();

}

var flag = false;

// Add car animation END
PROJECT.animateCarEnd = function()
{
	var car = this.car;

	if(car.position.x == 0 && flag == false ){
		flag = true;

		// END ANIMATION
		var i = 1.6;

		var positionEnd = { x : 0 };
		var targetEnd = { x : -1000 };
		var tweenEnd = new TWEEN.Tween(positionEnd).to(targetEnd, 2000);

		tweenEnd.onUpdate(function(time){
			car.position.x = positionEnd.x;

			if (time < 0.006)
				return;

			car.children[13].rotateOnAxis( new THREE.Vector3( 0, 0, 1 ), Math.PI/(10 * i * i) );
    		car.children[14].rotateOnAxis( new THREE.Vector3( 0, 0, 1 ), Math.PI/(10 * i * i) );
    		car.children[15].rotateOnAxis( new THREE.Vector3( 0, 0, 1 ), Math.PI/(10 * i * i) );
    		i -= 0.005;
		});

		tweenEnd.delay(500);

		tweenEnd.onComplete(function() 
		{
			PROJECT.car.lights.forEach(function (l) { l.visible = false; });
		});

		tweenEnd.easing(TWEEN.Easing.Quadratic.InOut);

		tweenEnd.start();
	}

}

PROJECT.animateCamera = function ()
{
	var camera = this.camera;
	var car = this.car;
	var origin = new THREE.Vector3(0.0, 0.0, 0.0);
	
	////////////////////////////////////////////////////////////////////////////
	var positionAn1 = { y: camera.position.y, z: camera.position.z };
	var targetAn1 = { y: positionAn1.y + 100, z: positionAn1.z - 150 };
	var tweenAn1 = new TWEEN.Tween(positionAn1).to(targetAn1, 2000);

	tweenAn1.onUpdate(function(time){
		camera.position.y = positionAn1.y;	
		camera.position.z = positionAn1.z;
		camera.lookAt(origin);
		camera.updateMatrix();
	});

	tweenAn1.delay(1500);
	
	tweenAn1.easing(TWEEN.Easing.Quadratic.InOut);
	
	tweenAn1.start();
	//////////////////////////////////////////////////////////////////////////////

	//////////////////////////////////////////////////////////////////////////////
	var positionAn2 = { x: camera.position.x, z: targetAn1.z };
	var targetAn2 = { x: positionAn2.x - 500, z: 0 };
	var tweenAn2 = new TWEEN.Tween(positionAn2).to(targetAn2, 2000);

	tweenAn2.onUpdate(function(time){
		camera.position.x = positionAn2.x;
		camera.position.z = positionAn2.z;
		camera.lookAt(origin);
		camera.updateMatrix();
	});

	tweenAn2.delay(500);

	tweenAn2.easing(TWEEN.Easing.Quadratic.InOut);

	tweenAn1.chain( tweenAn2 );
	//////////////////////////////////////////////////////////////////////////////

	//////////////////////////////////////////////////////////////////////////////
	var positionAn3 = { x: targetAn2.x, y: targetAn1.y };
	var targetAn3 = { x: positionAn3.x - 500, y: 100 };
	var tweenAn3 = new TWEEN.Tween(positionAn3).to(targetAn3, 2000);

	tweenAn3.onUpdate(function(time){
		camera.position.x = positionAn3.x;
		camera.position.y = positionAn3.y;
		camera.lookAt(origin);
		camera.updateMatrix();
	});

	tweenAn3.delay(500);

	tweenAn3.easing(TWEEN.Easing.Quadratic.InOut);

	tweenAn2.chain( tweenAn3 );
	//////////////////////////////////////////////////////////////////////////////

	//////////////////////////////////////////////////////////////////////////////
	var positionAn4 = { x: targetAn3.x, y: targetAn3.y, z: targetAn2.z };
	var targetAn4 = { x: positionAn4.x + 700, y: positionAn4.y + 200, z: positionAn4.z - 300 };
	var tweenAn4 = new TWEEN.Tween(positionAn4).to(targetAn4, 2000);

	tweenAn4.onUpdate(function(time){
		camera.position.x = positionAn4.x;
		camera.position.y = positionAn4.y;
		camera.position.z = positionAn4.z;
		camera.lookAt(origin);
		camera.updateMatrix();
	});

	tweenAn4.delay(500);

	tweenAn4.easing(TWEEN.Easing.Quadratic.InOut);

	tweenAn3.chain( tweenAn4 );
	//////////////////////////////////////////////////////////////////////////////

	//////////////////////////////////////////////////////////////////////////////
	var positionAn5 = { x: targetAn4.x, y: targetAn4.y };
	var targetAn5 = { x: positionAn5.x + 700, y: positionAn5.y - 250 };
	var tweenAn5 = new TWEEN.Tween(positionAn5).to(targetAn5, 2000);

	tweenAn5.onUpdate(function(time){
		camera.position.x = positionAn5.x;
		camera.position.y = positionAn5.y;
		camera.lookAt(origin);
		camera.updateMatrix();
	});

	tweenAn5.delay(500);

	tweenAn5.easing(TWEEN.Easing.Quadratic.InOut);

	tweenAn4.chain( tweenAn5 );
	//////////////////////////////////////////////////////////////////////////////

	//////////////////////////////////////////////////////////////////////////////
	var positionAn6 = { y: targetAn5.y, z: targetAn4.z };
	var targetAn6 = { y: positionAn6.y + 200, z: positionAn6.z + 550 };
	var tweenAn6 = new TWEEN.Tween(positionAn6).to(targetAn6, 2000);

	tweenAn6.onUpdate(function(time){
		camera.position.y = positionAn6.y;
		camera.position.z = positionAn6.z;
		camera.lookAt(origin);
		camera.updateMatrix();
	});

	tweenAn6.delay(500);

	tweenAn6.easing(TWEEN.Easing.Quadratic.InOut);

	tweenAn5.chain( tweenAn6 );
	///////////////////////////////////////////////////////////////////////////////

	///////////////////////////////////////////////////////////////////////////////
	var positionAn7 = { x: targetAn5.x, y: targetAn6.y, z: targetAn6.z };
	var targetAn7 = { x: 0, y: 200, z: 500 };
	var tweenAn7 = new TWEEN.Tween(positionAn7).to(targetAn7, 2000);

	tweenAn7.onUpdate(function(time){
		camera.position.x = positionAn7.x;
		camera.position.y = positionAn7.y;
		camera.position.z = positionAn7.z;
		camera.lookAt(origin);
		camera.updateMatrix();
	});

	tweenAn7.delay(500);

	tweenAn7.onComplete(function()
	{
		PROJECT.cameraControls.noPan = true;
		PROJECT.cameraControls.noZoom = false;
		PROJECT.cameraControls.minPolarAngle = THREE.Math.degToRad(30.0);
		PROJECT.cameraControls.maxPolarAngle = Math.PI / 2.0 - THREE.Math.degToRad(5.0);
		PROJECT.cameraControls.enabled = true;
		PROJECT.addEventListeners();
		
		document.getElementById('footer').style.display = "block";
	});

	tweenAn7.easing(TWEEN.Easing.Quadratic.InOut);

	tweenAn6.chain( tweenAn7 );
	///////////////////////////////////////////////////////////////////////////////

}

PROJECT.addEventListeners = function ()
{
	function onWindowResize() {

		PROJECT.camera.aspect = window.innerWidth / window.innerHeight;
		PROJECT.camera.updateProjectionMatrix();
		PROJECT.renderer.setSize( window.innerWidth, window.innerHeight );
		PROJECT.composer.setSize( window.innerWidth, window.innerHeight )
	}

	window.addEventListener( 'resize', onWindowResize, false );

	function onKeyDown ( event ) {
		switch( event.keyCode ) {
			
			// case 38: /*up*/	controlsGallardo.moveForward = true; break;
			// case 87: /*W*/ 	controlsVeyron.moveForward = true; break;
			// case 40: /*down*/controlsGallardo.moveBackward = true; break;
			// case 83: /*S*/ 	 controlsVeyron.moveBackward = true; break;
			// case 37: /*left*/controlsGallardo.moveLeft = true; break;
			// case 65: /*A*/   controlsVeyron.moveLeft = true; break;
			// case 39: /*right*/controlsGallardo.moveRight = true; break;
			// case 68: /*D*/    controlsVeyron.moveRight = true; break;
			// case 49: /*1*/	setCurrentCar( "gallardo", "center" ); break;
			// case 50: /*2*/	setCurrentCar( "veyron", "center" ); break;
			// case 51: /*3*/	setCurrentCar( "gallardo", "front" ); break;
			// case 52: /*4*/	setCurrentCar( "veyron", "front" ); break;
			// case 53: /*5*/	setCurrentCar( "gallardo", "back" ); break;
			// case 54: /*6*/	setCurrentCar( "veyron", "back" ); break;
			// case 78: /*N*/   vdir *= -1; break;
			// case 66: /*B*/   blur = !blur; break;
		}
	};
	function onKeyUp ( event ) {
	// 	switch( event.keyCode ) {
	// 		case 38: /*up*/controlsGallardo.moveForward = false; break;
	// 		case 87: /*W*/ controlsVeyron.moveForward = false; break;
	// 		case 40: /*down*/controlsGallardo.moveBackward = false; break;
	// 		case 83: /*S*/ 	 controlsVeyron.moveBackward = false; break;
	// 		case 37: /*left*/controlsGallardo.moveLeft = false; break;
	// 		case 65: /*A*/ 	 controlsVeyron.moveLeft = false; break;
	// 		case 39: /*right*/controlsGallardo.moveRight = false; break;
	// 		case 68: /*D*/ 	  controlsVeyron.moveRight = false; break;
	// 	}
	};

	function onKeyPress ( event ) {
		switch( event.keyCode ) {
			case 115:
				PROJECT.animateCarEnd();
				break;

			case 108:
				if (PROJECT.car.lights)
					PROJECT.car.lights.forEach(function(element){
						if(element.visible)
							element.visible = false;
						else
							element.visible = true;
					});
				break;
		}
	}

	document.addEventListener( 'keydown', onKeyDown, false );
	document.addEventListener( 'keyup', onKeyUp, false );
	document.addEventListener( 'keypress', onKeyPress, false);
}

/////// END PROJECT ACCESSOR METHODS








