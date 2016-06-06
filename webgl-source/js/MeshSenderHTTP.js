var MeshSenderHTTP = function(author, title) {
	this.info = {
		"author" 	: author,
		"title"		: title,
		"platform" 	: "THREEJS"
	};

	this.activeSlot = {
		"index" : -1,
		"key" : null
	};

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
	var xhr = new XMLHttpRequest;
	xhr.open("GET", "/mesh", false);

	xhr.onload = function(req) {
		var list = JSON.parse(xhr.responseText);
		console.log(list);
	};

	xhr.send();
}


MeshSenderHTTP.prototype._registerSlot = function() {
	
	var self = this;
	var xhr = new XMLHttpRequest;
	xhr.open("POST", "/mesh/register", true);

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

	var xhr = new XMLHttpRequest;
	
	xhr.open("POST", "/mesh/" + this.activeSlot.index + "/frame", true);
	
	xhr.setRequestHeader("slot-key", this.activeSlot.key);
	xhr.responseType = "arraybuffer";

	xhr.onload = function(req) {
		if(xhr.status == 200) {
			// success!
		} else {
			self.isRegistered = false;
		}

		self.updateInProgress = false;
	};


	this.updateInProgress = true;
	
	xhr.send(buffer);
}


MeshSenderHTTP.prototype._unregister = function(index, key) {

	if(!this.isRegistered) {
		return;
	}

	var xhr = new XMLHttpRequest;
	
	xhr.open("POST", "/mesh/" + self.activeSlot.index + "/stop", true);
	xhr.setRequestHeader("slot-key", self.activeSlot.key);

	xhr.onload = function(req) {
		console.log(req.responseText);
	};

	xhr.send();
}