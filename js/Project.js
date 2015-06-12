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

//////// PROJECT CONSTANTS AND TYPES



//////// SHADER MANAGER

PROJECT.ShaderManager = function() {

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
	}

}

//////// END OF SHADER MANAGER

/////// ASSET MANAGER / LOADER

PROJECT.Asset = function (url, type, name) {
	this.url = url;
	this.type = type;
	this.name = name;
}

PROJECT.Asset.prototype = {
	constructor: PROJECT.Asset,
}

PROJECT.AssetManager = function () {
	this.assimpLoader = new THREE.AssimpJSONLoader();
	this.imageLoader = new THREE.ImageLoader();
	this.TGALoader = new THREE.TGALoader();
	this.assetsCount = 0;
	this.loadedAssets = 0;
	this.assets = {};
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
		if( asset instanceof PROJECT.Asset) {
			this.assets[asset.name] = asset;
			this.assetsCount++;
		}
		else
			console.warn("Not an instance of PROJECT.Asset");
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
		for (ass in this.assets) {
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
					$.ajax({url:this.assets[ass].url, success: this.callback.bind(this, this.assets[ass], callback)})
					break;
				default:
					break;
			}
		}
	}
}

/////// END OF ASSET MANAGER / LOADER


