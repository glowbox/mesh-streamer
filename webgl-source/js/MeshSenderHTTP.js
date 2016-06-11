var MeshSenderHTTP = function(serverAddress, author, title, desiredSlot) {
	
	this.serverAddress = serverAddress;

	this.info = {
		"author" 	: author,
		"title"		: title,
		"platform" 	: "THREEJS"
	};

	if(desiredSlot !== null) {
		this.info.slot = desiredSlot;
	}

	this.activeSlot = {
		"index" : -1,
		"key" : null
	};

	this.debug = false;
	this.debugOverlay = null;

	if(this.debug) {
		this.debugOverlay = document.createElement("div");
		this.debugOverlay.className = "network-status-overlay";
		
		document.body.appendChild(this.debugOverlay);
	}

	this.isRegistered = false;
	this.updateInProgress = false;
	this.geometryProcessor = new GeometryProcessor();

	this._registerSlot();
}

MeshSenderHTTP.prototype.getDebugStatus = function() {
	return {
		"registered" : this.isRegistered,
		"slotIndex" : this.activeSlot.index,
		"key" : this.activeSlot.key
	};
}

MeshSenderHTTP.prototype.update = function(geometry){
	var sendMesh = this.geometryProcessor.update(geometry);

	if(sendMesh) {
		this._sendFrame(this.geometryProcessor.outputBuffer);
	}
}


MeshSenderHTTP.prototype._getSlots = function() {
	var xhr = new XMLHttpRequest();
	xhr.open("GET", this.serverAddress + "/mesh", false);

	xhr.onload = function(req) {
		var list = JSON.parse(xhr.responseText);
		console.log(list);
	};

	xhr.send();
}


MeshSenderHTTP.prototype._registerSlot = function() {
	
	var self = this;
	var xhr = new XMLHttpRequest();
	xhr.open("POST", this.serverAddress + "/mesh/register", true);
	xhr.responseType = "text";
	xhr.setRequestHeader("Content-Type", "text/json");

	xhr.onload = function(req) {
		var slotInfo = JSON.parse(xhr.responseText);
		
		if(slotInfo.result) {
			self.activeSlot.key = slotInfo.key;
			self.activeSlot.index = slotInfo.index;
			self.isRegistered = true;
			console.log("registered!");
		} else {
			console.log("Registration failed:", slotInfo);
			self.isRegistered = false;
		}
	};

	var jsonData = JSON.stringify(this.info);
	
	console.log("Sending: " + jsonData);

	xhr.send(jsonData);
}


MeshSenderHTTP.prototype._sendFrame = function(buffer) {
	
	var self = this;

	if(!this.isRegistered || this.updateInProgress) {
		return;
	}

	this.updateInProgress = true;

	var xhr = new XMLHttpRequest();
	//console.log("/mesh/" + this.activeSlot.index + "/frame");
	xhr.open("POST", this.serverAddress + "/mesh/" + this.activeSlot.index + "/frame", true);
	
	xhr.setRequestHeader("slot-key", this.activeSlot.key);
	xhr.responseType = "arraybuffer";
	xhr.setRequestHeader("Content-Type", "application/octet-stream");

	xhr.onerror = function(){
		self.updateInProgress = false;
		self.isRegistered = false;
		console.log("ERROR in http request.");
	}

	xhr.onload = function(req) {
		if(xhr.status == 200) {
			// success!
		} else {
			self.isRegistered = false;
		}

		if(self.debug) {
			self.debugOverlay.classList.remove("transmitting");
		}
		self.updateInProgress = false;
	};
	
	if(this.debug) {
		this.debugOverlay.classList.add("transmitting");
	}

	try{
		xhr.send(buffer);
		//console.log("SENT PACKET");
	} catch(ex) {
		
	}
}


MeshSenderHTTP.prototype._unregister = function(index, key) {

	if(!this.isRegistered) {
		return;
	}

	var xhr = new XMLHttpRequest();
	
	xhr.open("POST", "/mesh/" + self.activeSlot.index + "/stop", true);
	xhr.setRequestHeader("slot-key", self.activeSlot.key);

	xhr.onload = function(req) {
		console.log(req.responseText);
	};

	xhr.send();
}