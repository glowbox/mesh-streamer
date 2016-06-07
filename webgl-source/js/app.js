var meshGeom;



var gridResolution = Math.floor(Math.random() * 15 + 3);
var blueComponent = Math.random();
var animationFrequency = Math.random() * 0.01;
var useBufferGeom = false;

var core = {
	"camera" : null,
	"scene" : null,
	"renderer" : null,
	"controls" : null
};

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
	core.camera.lookAt(core.scene.position);

	document.body.appendChild(core.renderer.domElement);
}

function initializeScene() {

	var ambient = new THREE.AmbientLight(0x4a5052);
	core.scene.add(ambient);

	addPointLight(12, 19, 15, 0xfffbe7);

	if(useBufferGeom) {
		makeGradientPlaneBuffer();
	} else {
		makeGradientPlane();
	}
}

function makeGradientPlaneBuffer() {

	meshGeom = new THREE.PlaneBufferGeometry( 4, 4, gridResolution, gridResolution );

	var obj = new THREE.Mesh( meshGeom, new THREE.MeshLambertMaterial({vertexColors: THREE.VertexColors, color:0xffffff, "wireframe":false}) );

	meshGeom.addAttribute("color", new THREE.BufferAttribute( new Float32Array(meshGeom.getAttribute("position").array.length), 3));

	core.scene.add(obj);
}

function makeGradientPlane() {
	meshGeom = new THREE.PlaneGeometry( 4, 4, gridResolution, gridResolution );

	console.log("Colors:   " + meshGeom.colorsNeedUpdate);
	console.log("Elements: " + meshGeom.elementsNeedUpdate);
	console.log("Verts:    " + meshGeom.verticesNeedUpdate);

	for(var f = 0; f < meshGeom.faces.length; f++){
		var r = ~~(Math.random() * 255) / 255;
		var g = ~~(Math.random() * 255) / 255;
		var b = ~~(Math.random() * 255) / 255;
		meshGeom.faces[f].color.setRGB(r,b,g);
	}

	var obj = new THREE.Mesh( meshGeom, new THREE.MeshLambertMaterial({vertexColors: THREE.FaceColors, "wireframe" : false}) );
	
	core.scene.add(obj);
}


function resizeViewport(width, height) {
	core.camera.aspect = width / height;
	core.camera.updateProjectionMatrix();
	core.renderer.setSize( width, height );
}


function updateBufferGeom() {

	var now = new Date().getTime() * animationFrequency;

	var verts  = meshGeom.getAttribute("position");
	var colors = meshGeom.getAttribute("color");

	var vertCount = verts.array.length;
	for(var i = 2; i < vertCount; i += 3) {
		verts.array[i] = Math.cos( (verts.array[i - 1] * 1) + now) * Math.sin( (verts.array[i-2] * 1) + now);

		colors.array[i] = Math.cos( verts.array[i - 2] + now*3) * 0.5 + 0.5;
		colors.array[i+1] = Math.cos( verts.array[i - 1] + now*1.231) * 0.5 + 0.5;
	}

	verts.needsUpdate  = true;
	colors.needsUpdate = true;
}


function updateGeom() {

	var now = new Date().getTime() * animationFrequency;
	var faceVerts = ['a', 'b', 'c'];

	for(var i = 0; i < meshGeom.vertices.length; i++) {
		meshGeom.vertices[i].z = Math.cos( meshGeom.vertices[i].y + now);
	}

	for(var f = 0; f < meshGeom.faces.length; f++){
		var vx = meshGeom.vertices[ meshGeom.faces[f].a ].x;
		var vy = meshGeom.vertices[ meshGeom.faces[f].a ].y;

		var r = Math.cos( vx + now * 3) * 0.5 + 0.5;
		var g = Math.cos( vy + now * 1.231) * 0.5 + 0.5;

		r = ~~(r * 255) / 255;
		g = ~~(g * 255) / 255;
		
		meshGeom.faces[f].color.setRGB(r, g , blueComponent );
	}

	meshGeom.colorsNeedUpdate = true;
	meshGeom.verticesNeedUpdate  = true;
}


function render() {

	var status = streamer.getDebugStatus();
	var statusText = [];
	for(var itm in status) {
		statusText.push(itm + ": " + status[itm]);
	}
	document.getElementById("status").innerHTML = statusText.join("<br>");

	if(useBufferGeom){
		updateBufferGeom();
	} else {
		updateGeom();	
	}
	
	streamer.update(meshGeom);

	core.renderer.render(core.scene, core.camera);
	
		
	window.requestAnimationFrame(render);
}

function initialize() {

	
	initializeCore();
	initializeScene();
	

	resizeViewport(window.innerWidth, window.innerHeight);

	window.addEventListener('resize', function() {
		resizeViewport(window.innerWidth, window.innerHeight);
	});

	render();
}

window.addEventListener('load', initialize);