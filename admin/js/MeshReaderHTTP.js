var MeshReaderHTTP = function(slotIndex) {

	this.slotIndex = slotIndex;

	this.geometryReader = new GeometryReader();
}


MeshReaderHTTP.prototype.setSlotIndex = function(index) {
	this.slotIndex = index;
}

MeshReaderHTTP.prototype.update = function(_callback) {
	var self = this;
	var xhr = new XMLHttpRequest;
	xhr.open("GET", "/mesh/" + this.slotIndex, true);
	xhr.timeout = 1000;
	xhr.responseType = "arraybuffer";
	
	xhr.onload = function(req) {
		
		if(xhr.status == 200){
			self.geometryReader.updateMesh(xhr.response);
		}

		if(typeof(_callback) === "function"){
			_callback();
		}
	};

	xhr.send();
}

MeshReaderHTTP.prototype.getGeometry = function() {
	return this.geometryReader.bufferGeometry;
}