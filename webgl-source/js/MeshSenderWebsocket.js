var MeshSenderWebsocket = function(author, title, desiredSlot) {

	this.socket = io({transports : ["websocket"]});
	this.socket.binaryType = 'arraybuffer';


	this.targetFrameTimeMillis = 33; // Interval to send mesh data (milliseconds)
	this.outputFrameTimer = 0;
	this.lastUpdateTime = 0;

	this.geometryProcessor = new GeometryProcessor();
	this.connected = false;

	this.activeSlot = {
		"key" : -1,
		"index" : -1
	};

	this.info = {
		"author" 	: author,
		"title"		: title,
		"platform" 	: "THREEJS"
	};

	if(desiredSlot !== null) {
		this.info.slot = desiredSlot;
	}

	this.isRegistered = false;
	this.readyToSend = true;

	var self = this;

	this.socket.on("connect", function() {
		
		self.connected = true;
		self.socket.emit("register", self.info);
	});

	this.socket.on("register", function(response){
		if(response.result) {
			console.log("Server registration complete!", response);
			
			self.isRegistered = true;
			self.readyToSend = true;
			self.activeSlot.key = response.key;
			self.activeSlot.index = response.index;
		}
	})

	this.socket.on("ready", function(){
		self.readyToSend = true;
	});

	this.socket.on("disconnect", function(){
		self.connected = false;
		self.isRegistered = false;
		console.log("Disconnected from server.");
	})
}

MeshSenderWebsocket.prototype.getDebugStatus = function() {
	return {
		"registered" : this.isRegistered,
		"slotIndex" : this.activeSlot.index,
		"key" : this.activeSlot.key
	};
}

MeshSenderWebsocket.prototype.update = function(geometry) {
	if(this.connected && this.isRegistered) {
		
		var now = new Date().getTime();
		var delta = now - this.lastUpdateTime;
		this.lastUpdateTime = now;

		this.outputFrameTimer -= delta;

		if(this.outputFrameTimer <= 0) {

			this.outputFrameTimer = this.targetFrameTimeMillis;
			
			if(this.readyToSend) {

				var sendMesh = this.geometryProcessor.update(geometry);

				// TODO: add support for BufferGeometry.

				if(sendMesh) {
					this.readyToSend = false;
					this.socket.emit("frame", this.geometryProcessor.outputBuffer);
				}

			} else {
				console.log("Server isnt' ready yet..");
			}
		}
	}
}