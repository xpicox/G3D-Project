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
		this.loadedAssets++;
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
			for (var asset of assets) {
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
					$.ajax({url:this.assets[ass].url, success: this.callback.bind(this, this.assets[ass], callback)});
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
	var renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setClearColor( 0xf0f0f0 );
	this.renderer = renderer;
	document.body.appendChild( renderer.domElement );
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
		spotLight.intensity = 1.0;
		spotLight.exponent = 10.0;
		this.lights.push(spotLight);
		var sphere = new THREE.Mesh(new THREE.SphereGeometry(50, 16, 16), new THREE.MeshBasicMaterial({color: 0xffff00, wireframe: true}));
		sphere.position.clone(spotLight.position);
		sphere.position.setFromMatrixPosition( lampione.matrixWorld );
		this.scene.add(sphere);
		this.scene.add(spotLight);

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

		// var dirLight = new THREE.DirectionalLight(0xFFFFFF, 2.0);
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



/////// END PROJECT ACCESSOR METHODS








