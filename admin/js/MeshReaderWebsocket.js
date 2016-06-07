var MeshReaderWebsocket = function(targetSlot) {

	this.socket = io({transports : ["websocket"]});
	this.socket.binaryType = 'arraybuffer';
	
	this.connected = false;
	this.dataCount = 0;
	this.renderCount = 0;

	this.geometryReader = new GeometryReader();

	var self = this;

	this.socket.on("connect", function() {
		
		self.connected = true;

		self.socket.emit("register-client", {
			"platform"  : "THREEJS",
			"slot" : (targetSlot !== undefined) ? targetSlot : 0
		});

		self.socket.on("mesh", function(buffer) {
			self.geometryReader.updateMesh(buffer);
			console.log("Got frame.");
			self.dataCount++;
		});
	});
}

MeshReaderWebsocket.prototype.setSlotIndex = function(index){
	this.socket.emit("set-slot", {"slot" : index});
}

MeshReaderWebsocket.prototype.frameFinished = function() {
	this.socket.emit("mesh-ready");
}

MeshReaderWebsocket.prototype.getGeometry = function() {
	return this.geometryReader.bufferGeometry;
}