// Load assets and materials
function loadAll(json)
{
	PROJECT.assetsManager = new PROJECT.AssetManager();
	PROJECT.shaderManager = new PROJECT.ShaderManager();
	PROJECT.assetsManager.addAssets(json.assets);
	PROJECT.assetsManager.loadAssets(function(){
		PROJECT.shaderManager.initMaterials(json.materials);
		init();
	});
}

// Initialize the whole scene
function init()
{
	PROJECT.initRenderer();
	PROJECT.initScene();
	PROJECT.initCamera(45, window.innerWidth/window.innerHeight, 1, 10000);
	PROJECT.addLights();	
	PROJECT.addCar();
	PROJECT.addCarLights();
	PROJECT.addGarage();
	PROJECT.initComposer();
	PROJECT.animateCarStart();

	initGUI();
	initStats();

	render();

}

function initGUI()
{
	var gui = new dat.GUI();
	var fields = function ()
	{
		// MainBody material
		var mat = PROJECT.shaderManager["lamborghiniMainBody"].uniforms;
		var diff = mat.diffuse_color.value;
		this.diffuse = [diff.x*255, diff.y*255, diff.z*255];

	}

	var carGUI = new fields();
	var element = gui.addColor(carGUI, 'diffuse');
 	element.name('Body Color');
	element.onChange(function(value)
	{
		var color = new THREE.Vector3(value[0] / 256.0, value[1] / 256.0, value[2] / 256.0);
		PROJECT.shaderManager["lamborghiniMainBody"].uniforms.diffuse_color.value = color;

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

	PROJECT.composer.render();
}