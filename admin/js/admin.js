var connectedSlots = [];
var wasConnected = false;

function addCell(row, content) {
	var td = document.createElement("td");
	if(content !== undefined) {
		td.innerHTML = content;
	}
	row.appendChild(td);

	return td;
}

function renderSlots(slots) {

	var tbody = document.getElementById("slots");
	tbody.innerHTML = "";

	connectedSlots = [];
	for(var i = 0; i < slots.length; i++){
		var tr = document.createElement("tr");
		
		tr.id = "slot-" + i;
		tr.className = slots[i].free ? "empty" : "full";

		addCell(tr, i);
		if(slots[i].free) {

			addCell(tr, "--");
			addCell(tr, "--");
			addCell(tr, "--");
			addCell(tr, "--");
			addCell(tr, "&nbsp;");

			var ctx = document.getElementById("thumbnail-" + i).getContext("2d");
			ctx.fillStyle = "#808080";
			ctx.fillRect(0, 0, 320, 200);
		} else {
			connectedSlots.push(i);

			addCell(tr, slots[i].info.author);
			addCell(tr, slots[i].info.title);
			addCell(tr, slots[i].info.platform);
			addCell(tr, slots[i].key);

			addCell(tr, "<a href=\"#\" class=\"button eject\">Eject</a>");
		}
		
		tbody.appendChild(tr);
	}
}

var socket = io({transports : ["websocket"]});
	
socket.on("connect", function() {
document.getElementById("disconnected").classList.add("hidden");
	wasConnected = true;
	socket.emit("register-admin");

	socket.on("slots", function(slots) {
		//console.log("slots changed", slots);
		renderSlots(slots);
	});

	socket.on("disconnect", function() {
		if(wasConnected){
			document.getElementById("disconnected").classList.remove("hidden");
		}
	});

	updateNextThumbnail();
})

var tbody = document.getElementById("slots");
tbody.addEventListener("click", function(e){

	if(e.target.classList.contains("button")) {
		
		var rowId = e.target.closest("tr").id;
		var slotId = rowId.split("-")[1];
		
		if(e.target.classList.contains("eject")) {
			socket.emit("eject", {"slot" : slotId});
		}

		e.stopPropagation();
		e.preventDefault();
	}
});



var lastUpdated = 0;
var reader = new MeshReaderHTTP(0);

var core = {
	"camera" : null,
	"scene" : null,
	"renderer" : null,
	"controls" : null
};

function initializeCore() {

	core.camera   = new THREE.PerspectiveCamera();
	core.scene    = new THREE.Scene();
	core.renderer = new THREE.WebGLRenderer();
	//core.controls = new THREE.OrbitControls( core.camera );
	//core.controls.noKeys = true;

	core.camera.position.set(6, 1.75, 11.5);
	core.camera.lookAt(core.scene.position);
}


function initializeScene() {
}


function resizeViewport(width, height) {
	core.camera.aspect = width / height;
	core.camera.updateProjectionMatrix();
	core.renderer.setSize( width, height );
}


function render(slotId) {

	core.renderer.render(core.scene, core.camera);

	var ctx = document.getElementById("thumbnail-" + slotId).getContext("2d");

	ctx.clearRect(0, 0, 320, 200);
	ctx.drawImage(core.renderer.domElement, 0, 0);
}


function updateThumbnail() {
	if(thumbnailTimeout != null) {
		window.clearTimeout(thumbnailTimeout);
		thumbnailTimeout = null;
	}

	thumbnailTimeout = setTimeout(updateNextThumbnail, 125);
}

var thumbnailTimeout = null;


function updateNextThumbnail() {
	
	if(connectedSlots.length > 0) {
		var slotId = connectedSlots[++lastUpdated % connectedSlots.length];
		reader.setSlotIndex(slotId);
		reader.update( function() {
			render(slotId);
			updateThumbnail();
		} );
	} else {
		console.log("no slots..");
		updateThumbnail();
	}
}

function initialize() {

	initializeCore();
	initializeScene();
	
	var obj = new THREE.Mesh( reader.getGeometry(), new THREE.MeshBasicMaterial({vertexColors: THREE.VertexColors, color:0xffffff}) );

	core.scene.add( obj );
	
	resizeViewport(320, 200);
}


window.addEventListener('load', initialize);