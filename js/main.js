// $.getJSON("assets.json").done(load);

function loadAll(json)
{
	console.log(json);

	PROJECT.assetsManager = new PROJECT.AssetManager();
	PROJECT.shaderManager = new PROJECT.ShaderManager();
	PROJECT.assetsManager.addAssets(json.assets);
	PROJECT.assetsManager.loadAssets(function(){
		PROJECT.shaderManager.initMaterials(json.materials);
		init();
	});
}

// Here we can initialize the scene
function init()
{
	//console.log(PROJECT.assetsManager.assets["lamborghini"].getObjectByName("MainBody"));
	// var pianoshader = PROJECT.shaderManager["lamborghiniMainBody"].clone();
	// pianoshader.uniforms.roughness.value = 1.0;
	// pianoshader.uniforms.diffuse_color.value = new THREE.Vector3(0.93, 0.83, 0.89);
	// pianoshader.uniforms.specular.value = 0.2;

	PROJECT.initRenderer();
	PROJECT.initScene();
	PROJECT.initCamera(45, window.innerWidth/window.innerHeight, 1, 10000);
	
	// PROJECT.scene.add(new THREE.Mesh(new THREE.BoxGeometry(50, 50, 50), new THREE.MeshPhongMaterial({color: 0x00ff00})));
	PROJECT.addLights();
	
	PROJECT.addCar();
	// console.log(PROJECT.car);
	PROJECT.addCarLights();
	// console.log(PROJECT.car);
	PROJECT.addGarage();
	PROJECT.initComposer();

	// PROJECT.garage.getObjectByName("Pavimento").children[0].material = pianoshader;
	// PROJECT.addCubeMap();
	PROJECT.addEventListeners();

	PROJECT.animateCarStart();
	document.addEventListener('keypress', function(event) { PROJECT.animateCarEnd(event); });

	initGUI();
	initStats();

	render();

}

// TODO

function initGUI()
{
	var gui = new dat.GUI();
	var fields = function ()
	{
		// Car material
		var mat = PROJECT.shaderManager["lamborghiniMainBody"].uniforms;
		var diff = mat.diffuse_color.value;
		this.diffuse = [diff.x*255, diff.y*255, diff.z*255];
		this.roughness = mat.roughness.value;
		this.specular = mat.specular.value;
		this.metallic = mat.metallic.value;
		this.reflectivity = mat.reflectivity.value;
		this.ambientIntensity = mat.ambientIntensity.value;
	}

	var carGUI = new fields();
	gui.addColor(carGUI, 'diffuse').onChange(function(value)
	{
		var color = new THREE.Vector3(value[0] / 256.0, value[1] / 256.0, value[2] / 256.0);
		PROJECT.shaderManager["lamborghiniMainBody"].uniforms.diffuse_color.value = color;

	});

	gui.add(carGUI, 'roughness', 0.0, 1.0).onChange(function(value)
	{
		PROJECT.shaderManager["lamborghiniMainBody"].uniforms.roughness.value = value;
	});

	gui.add(carGUI, 'specular', 0.0, 1.0).onChange(function(value)
	{
		PROJECT.shaderManager["lamborghiniMainBody"].uniforms.specular.value = value;
	});

	gui.add(carGUI, 'metallic', 0.0, 1.0).onChange(function(value)
	{
		PROJECT.shaderManager["lamborghiniMainBody"].uniforms.metallic.value = value;
	});

	gui.add(carGUI, 'reflectivity', 0.0, 1.0).onChange(function(value)
	{
		PROJECT.shaderManager["lamborghiniMainBody"].uniforms.reflectivity.value = value;
	});

	gui.add(carGUI, 'ambientIntensity', 0.0, 1.0).onChange(function(value)
	{
		PROJECT.shaderManager["lamborghiniMainBody"].uniforms.ambientIntensity.value = value;
	});

}


function initStats() {
	stats = new Stats();
	stats.domElement.style.position = 'absolute';
	stats.domElement.style.top = '0px';
	document.body.appendChild( stats.domElement );
}

function render() {
	requestAnimationFrame( render );
	PROJECT.cameraControls.update();

	stats.update();

	TWEEN.update();

	// PROJECT.renderer.render(PROJECT.scene, PROJECT.camera);
	PROJECT.composer.render();
}


