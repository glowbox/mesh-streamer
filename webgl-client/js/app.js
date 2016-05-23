var meshGeom;

var reader = new GeometryReader();

var core = {
	"camera" : null,
	"scene" : null,
	"renderer" : null,
	"controls" : null
};

var socket;

function addPointLight(x, y, z, color) {
	var light = new THREE.PointLight({"color":color});
	light.position.set(x, y, z);
	core.scene.add(light);
	return light;
}

function initializeCore() {

	core.camera   = new THREE.PerspectiveCamera();
	core.scene    = new THREE.Scene();
	core.renderer = new THREE.WebGLRenderer();
	core.controls = new THREE.OrbitControls( core.camera );
	core.controls.noKeys = true;

	core.camera.position.set(10, 3.5, 20);

	document.body.appendChild(core.renderer.domElement);
}



function initializeScene() {

	var ambient = new THREE.AmbientLight(0x4a5052);
	core.scene.add(ambient);

	addPointLight(12, 19, 15, 0xfffbe7);
}


function resizeViewport(width, height) {
	core.camera.aspect = width / height;
	core.camera.updateProjectionMatrix();
	core.renderer.setSize( width, height );
}


function render() {

	var d = core.controls.center.distanceTo(core.controls.object.position);
	
	core.renderer.render(core.scene, core.camera);

	reader.frameFinished();
	reader.renderCount++;
	
	window.requestAnimationFrame(render);
}


function initialize() {

	initializeCore();
	initializeScene();
	
	var obj = new THREE.Mesh( reader.bufferGeometry, new THREE.MeshBasicMaterial({vertexColors: THREE.VertexColors, color:0xffffff}) );

	core.scene.add( obj );
	
	resizeViewport(window.innerWidth, window.innerHeight);

	window.addEventListener('resize', function() {
		resizeViewport(window.innerWidth, window.innerHeight);
	});

	render();
}


window.addEventListener('load', initialize);