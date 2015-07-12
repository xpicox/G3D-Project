// Come importo le dipendenze? jQuerry Ajax e tante brutte cose...

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
		// chrome://flags/#enable-javascript-harmony
		// for (ass of this.assets) {
		// 	switch (ass.type) {
		// 		case PROJECT.MODEL:
		// 			this.assimpLoader.load(ass.url, this.callback.bind(this, ass, callback));
		// 			break;
		// 		case PROJECT.TGATEXTURE:
		// 			this.TGALoader.load(ass.url, this.callback.bind(this, ass, callback));
		// 			break;
		// 		case PROJECT.JPGTEXTURE:
		// 			THREE.ImageUtils.loadTexture(ass.url, THREE.UVMapping, this.callback.bind(this, ass, callback));
		// 			break;
		// 		case PROJECT.SHADER:
		// 			$.ajax({url:ass.url, success: this.callback.bind(this, ass, callback)})
		// 			break;
		// 		case PROJECT.MATERIAL:
		// 			break;
		// 		default:
		// 			break;
		// 	}
		// }
	}
}

/////// END OF ASSET MANAGER / LOADER

/////// PROJECT ACCESSOR METHODS

//// Initialize a WebGLRenderer
PROJECT.initRenderer = function()
{
	var renderer = new THREE.WebGLRenderer({ antialias: true, alpha : true });
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setClearColor( 0x000000 );
	var gl = renderer.getContext();
	var ext = gl.getExtension('EXT_frag_depth');
	if (!ext)
		console.error("EXT_frag_depth : unaviable")
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

	/// GOD RAYS SHADER
	// var godRaysEffect = new THREE.ShaderPass( this.shaderManager["SSGodRays"]);

	// var widthH = window.innerWidth / 2, heightH = window.innerHeight / 2;
	// console.log(window.innerWidth, window.innerHeight);
	// var pos = new THREE.Vector3();
	// pos.setFromMatrixPosition(this.lights[3].matrixWorld);
	// godRaysEffect.uniforms.lightpos.value = pos;
	// this.godRaysEffect = godRaysEffect;
	// composer.addPass( godRaysEffect );

	var effect = new THREE.ShaderPass( THREE.CopyShader);
	effect.renderToScreen = true;
	composer.addPass( effect );
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
	camera.position.set(0.0,400.0,500.0);
	this.camera = camera;

	// Orbit Controlls
	var cameraControls = new THREE.OrbitControls( this.camera, this.renderer.domElement );
	this.cameraControls = cameraControls;
	// TODO REMOVE PAN AND FIX ZOOM IN ZOOM OUT
	// cameraControls.noPan = true;

	if (this.scene !== undefined)
		this.scene.add(this.camera);
}

PROJECT.addLights = function ()
{
	var garage = this.assetsManager.assets["garage"];
	if (garage !== undefined) 
	{
		this.lights = [];
		var lampioni = garage.getObjectByName("Lampione");
		lampioni.name = "Lampioni";
		var lampione = lampioni.getObjectByName("Lampione");
		lampione.updateMatrixWorld();
		var spotLight = new THREE.SpotLight(0xFFFFFF);
		spotLight.position.setFromMatrixPosition( lampione.matrixWorld );
		spotLight.position.set(-200.0, 600.0, 0.0);
		spotLight.intensity = 1.0;
		spotLight.exponent = 2.0;
		spotLight.angle = Math.PI/4;
		this.lights.push(spotLight);
		var sphere = new THREE.Mesh(new THREE.SphereGeometry(50, 16, 16), new THREE.MeshBasicMaterial({color: 0xffff00, wireframe: true}));
		//sphere.position = spotLight.position.clone();
		sphere.position.setFromMatrixPosition( lampione.matrixWorld );
		this.scene.add(sphere);
		this.scene.add(spotLight);

		var spotLight2 = new THREE.SpotLight(0xFFFFFF);
		spotLight2.position.set(0.0, 100.0, 600.0);
		spotLight2.intensity = 1.0;
		spotLight2.exponent = 2.0;
		spotLight2.angle = Math.PI/4;
		this.lights.push(spotLight2);
		this.scene.add(spotLight2);

		var spotLight3 = new THREE.SpotLight(0xFFFFFF);
		spotLight3.position.set(0.0, 100.0, -600.0);
		spotLight3.intensity = 1.0;
		spotLight3.exponent = 2.0;
		spotLight3.angle = Math.PI/4;
		this.lights.push(spotLight3);
		this.scene.add(spotLight3);

		// lampione = lampioni.getObjectByName("Lampione001");
		// spotLight = new THREE.SpotLight(0xFFFFFF);
		// spotLight.position.setFromMatrixPosition( lampione.matrixWorld );
		// spotLight.intensity = 1.0;
		// spotLight.exponent = 10.0;
		// this.lights.push(spotLight);
		// sphere = new THREE.Mesh(new THREE.SphereGeometry(50, 16, 16), new THREE.MeshBasicMaterial({color: 0xffff00, wireframe: true}));
		// sphere.position.clone(spotLight.position);
		// sphere.position.setFromMatrixPosition( lampione.matrixWorld );
		// this.scene.add(sphere);
		// this.scene.add(spotLight);

		// var dirLight = new THREE.DirectionalLight(0xFFFFFF, 1.0);
		// dirLight.position.setFromMatrixPosition( lampione.matrixWorld );
		// this.scene.add(dirLight);

	} else 
		console.warn("Garage not laoded!");
}

PROJECT.addCar = function ()
{
	var car = this.assetsManager.assets["lamborghini"];
	if (car !== undefined) {
		var mainBody = car.getObjectByName("MainBody").children[0];
		mainBody.material = this.shaderManager["lamborghiniMainBody"];
		// CHECK IF SCENE IS DEFINED
		if (this.scene !== undefined)
		{
			this.scene.add(car);
			PROJECT.car = car;
		}
		else
			console.warn("Can't add car: undefined Scene");
		console.log(car);
	}
}

// Add the garage to the scene
PROJECT.addGarage = function ()
{

	var garage = this.assetsManager.assets["garage"];
	if (garage == undefined) {
		console.warn("Garage undefined!");
		return;
	}
	if (this.scene === undefined) {
		console.warn("Can't add garage: undefined Scene");
		return;
	}
	this.scene.add(garage);
	PROJECT.garage = garage;

}

// Add car lights
PROJECT.addCarLights = function ()
{
	if (this.car === undefined)
		return

	function addCone(light)
	{
		var geometry = new THREE.CylinderGeometry( 0.001, 1, 1, 16, 1, false );
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
		cone.lookAt( vector2.sub( vector ) );
		// cone.material.color.copy( light.color ).multiplyScalar( light.intensity );
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
		var spotLight = new THREE.SpotLight(0xFFFFFF);
		spotLight.position.set(-20, 0, 0);
		spotLight.intensity = 1.0;
		spotLight.exponent = 5.0;
		// spotLight.distance = 3000;
		spotLight.angle = Math.PI/8;

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
	var r = 50.0;
	car.lights.push(addLamp(car.getObjectByName("FLLight"), targetPosition(azimuth, polar, r)));
	azimuth -= 2 * Math.PI/24;
	car.lights.push(addLamp(car.getObjectByName("FRLight"), targetPosition(azimuth, polar, r)));




	// frontLeftLight.position.set(0,100,0);
	// frontLeftLight.updateMatrixWorld();
	// var spotLight = new THREE.SpotLight(0xFFFFFF);
	// spotLight.position.set(-20, 0, 0);
	// spotLight.intensity = 1.0;
	// spotLight.exponent = 5.0;
	// // spotLight.distance = 3000;
	// spotLight.angle = Math.PI/8;
	
	// var azimuth = -Math.PI/2 + Math.PI/24; // Angle
	// var polar = 7/12*Math.PI;   // Angle
	// var r = 50.0;
	// var x = r * Math.sin(azimuth) * Math.sin(polar);
	// var y = r * Math.cos(polar);
	// var z = r * Math.cos(azimuth) * Math.sin(polar);

	// // this.lights.push(spotLight);

	// frontLeftLight.add(spotLight);
	// // spotLight.updateMatrixWorld();
	// spotLight.target.position.copy(new THREE.Vector3(x, y, z));
	// spotLight.add(spotLight.target);
	// // spotLight.target.position.copy(new THREE.Vector3(x, y, z).applyMatrix4(spotLight.matrixWorld));
	// // spotLight.target.updateMatrixWorld();
	// // console.log(spotLight.target);
	// // var spotH = new THREE.SpotLightHelper(spotLight);
	// //PROJECT.scene.add(spotH);
	// addCone(spotLight);
	// //PROJECT.scene.add(newCone(spotLight));
	// // var sphere = new THREE.Mesh(new THREE.SphereGeometry(50, 16, 16), new THREE.MeshBasicMaterial({color: 0xffff00, wireframe: true}));
	// // sphere.position.setFromMatrixPosition(spotLight.target.matrixWorld);
	// // PROJECT.scene.add(sphere);

}

PROJECT.addCubeMap = function ()
{
	////////// GARAGE CUBEMAP

	var cubeMap = new THREE.CubeTexture( [] );
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
			case 76: /*L*/
				if (PROJECT.car.lights)
					PROJECT.car.lights.forEach(function(element){
						if(element.visible)
							element.visible = false;
						else
							element.visible = true;
					});
				console.log(PROJECT.car.lights);
				break;
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


	document.addEventListener( 'keydown', onKeyDown, false );
	document.addEventListener( 'keyup', onKeyUp, false );
}
/////// END PROJECT ACCESSOR METHODS








