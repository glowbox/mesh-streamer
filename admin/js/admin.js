var connectedSlots = [];

var wasConnected = false;
var slotThumbnailsInitialized = false;


var thumbnailWidth = 80;
var thumbnailHeight = 60;

var lastUpdated = 0;
var reader = new MeshReaderHTTP(0);



function addCell(row, content, cssClass) {
	var td = document.createElement("td");
	if(content !== undefined) {
		td.innerHTML = content;
	}
	if(cssClass != null){
		td.className = cssClass;
	}
	row.appendChild(td);

	return td;
}

var slotRows = [];

function buildTable(slotCount) {
	
	var tbody = document.getElementById("slots");
	tbody.innerHTML = "";

	for(var i = 0; i < slotCount; i++){

		var tr = document.createElement("tr");
		
		tr.id = "slot-" + i;
		
		addCell(tr, i, "slot-index");

		var slotThumb = document.createElement("canvas");
		
		slotThumb.width = thumbnailWidth;
		slotThumb.height = thumbnailHeight;
		slotThumb.id = "thumbnail-" + i;

		var slotData = {
			"_row" : tr,
			"author" : addCell(tr, "", "slot-author"),
			"title" : addCell(tr, "--", "slot-title"),
			"platform" : addCell(tr, "--", "slot-platform"),
			"key" : addCell(tr, "--", "slot-key"),
			"preview" : addCell(tr, "", "slot-preview"),
			"actions" : addCell(tr, "&nbsp;", "slot-actions")
		}

		slotData.preview.appendChild(slotThumb);

		slotRows.push(slotData);
		tbody.appendChild(tr);
	}
}

function renderSlots(slots) {

	if(!slotThumbnailsInitialized) {
		
		buildTable(slots.length);

		
	}
	slotThumbnailsInitialized = true;

	connectedSlots = [];

	for(var i = 0; i < slots.length; i++){


		var ctx = document.getElementById("thumbnail-" + i).getContext("2d");
		ctx.fillStyle = "#2a2b2c";
		ctx.fillRect(0, 0, 320, 200);

		slotRows[i]._row.className = slots[i].free ? "empty" : "full";

		if(slots[i].free) {
			slotRows[i].author.innerHTML = "--";
			slotRows[i].title.innerHTML = "--";
			slotRows[i].platform.innerHTML = "--";
			slotRows[i].key.innerHTML = "--";
			slotRows[i].actions.innerHTML = "--";
			
		} else {
			connectedSlots.push(i);
			
			slotRows[i].author.innerHTML = slots[i].info.author;
			slotRows[i].title.innerHTML = slots[i].info.title;
			slotRows[i].platform.innerHTML = slots[i].info.platform;
			slotRows[i].key.innerHTML = slots[i].key;
			slotRows[i].actions.innerHTML = "<a href=\"#\" class=\"button eject\">Eject</a>"
		}		
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

	core.camera.position.set(6, 3.75, 11.5);
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

	if(!slotThumbnailsInitialized){
		return;
	}

	core.renderer.render(core.scene, core.camera);

	var ctx = document.getElementById("thumbnail-" + slotId).getContext("2d");

	ctx.clearRect(0, 0, thumbnailWidth, thumbnailHeight);
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
	
	resizeViewport( thumbnailWidth, thumbnailHeight);
}


window.addEventListener('load', initialize);