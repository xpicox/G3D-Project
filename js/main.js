$.getJSON("assets.json").done(load);

function load(json)
{
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
	PROJECT.initRenderer();
	PROJECT.initScene();
	PROJECT.initCamera(45, window.innerWidth/window.innerHeight, 1, 10000);
	// PROJECT.scene.add(new THREE.Mesh(new THREE.BoxGeometry(50, 50, 50), new THREE.MeshPhongMaterial({color: 0x00ff00})));
	PROJECT.addLights();
	PROJECT.addCar();
	initStats();
	render();

}

// TODO

function initGUI()
{

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

	PROJECT.car.rotateOnAxis(new THREE.Vector3(0.0, 1.0, 0.0), 0.01);

	PROJECT.renderer.render(PROJECT.scene, PROJECT.camera);
}