var GeometryStreamer = function(author, title) {

	this.socket = io({transports : ["websocket"]});
	this.socket.binaryType = 'arraybuffer';

	// Array buffers for various properties.

	this.buffers = {
		"header" : null,
		"position" : null,
		"color" : null,
		"index" : null
	};

	this.targetFrameTimeMillis = 33; // Interval to send mesh data (milliseconds)
	this.outputFrameTimer = 0;
	this.lastUpdateTime = 0;

	this.outputBuffer = new ArrayBuffer(1);
	
	this.lastGeometryId = -1;
	
	this.connected = false;
	var self = this;

	this.socket.on("connect", function() {
		
		self.connected = true;
		self.socket.emit("identify-source", {
			"platform"  : "THREEJS",
			"author"    : author,
			"title"     : title
		});
	});

	this.socket.on("mesh-ready", function(){
		self.readyToSend = true;
	});
}

GeometryStreamer.prototype.update = function(geometry) {
	if(this.connected) {
		
		var now = new Date().getTime();
		var delta = now - this.lastUpdateTime;
		this.lastUpdateTime = now;

		this.outputFrameTimer -= delta;

		if(this.outputFrameTimer <= 0) {
			this.outputFrameTimer = this.targetFrameTimeMillis;
			if(this.readyToSend) {

				var sendMesh = false;

				if(geometry instanceof THREE.Geometry) {
					sendMesh = this.fromGeometry(geometry);
				}

				// TODO: add support for BufferGeometry.

				if(sendMesh) {
					this.readyToSend = false;
					this.socket.emit("mesh", this.outputBuffer);
				}

			} else {
				console.log("Server isnt' ready yet..");
			}
		}
	}
}


GeometryStreamer.prototype._updateBuffers = function(positionCount, colorCount, indexCount) {

	var positionDataCount  	= positionCount;
	var colorDataCount 		= colorCount;
	var indexDataCount  	= indexCount;
	
	var headerSize    = 8;

	var positionDataSize  = positionDataCount 	* Float32Array.BYTES_PER_ELEMENT;
	var colorDataSize  = colorDataCount 	* Uint8Array.BYTES_PER_ELEMENT
	var indexDataSize  = indexDataCount 	* Uint16Array.BYTES_PER_ELEMENT;

	var payloadSize =  positionDataSize + colorDataSize + indexDataSize;

	var dataSize = headerSize + payloadSize;

	if((payloadSize > 0) && (dataSize != this.outputBuffer.byteLength)) {
		console.log("StreamableGeometry: resizing output buffers: " + dataSize);
		
		this.outputBuffer = null;
		delete this.outputBuffer;
		
		this.outputBuffer = new ArrayBuffer(dataSize);

		for(var itm in this.buffers){
			this.buffers[itm] = null;
			delete this.buffers[itm];
		}
		
		this.buffers.header 	= new Uint16Array(this.outputBuffer, 0, headerSize);
		this.buffers.position   = new Float32Array(this.outputBuffer, headerSize, positionDataCount);
		this.buffers.color 		= new Uint8Array(this.outputBuffer,  headerSize + positionDataSize, colorDataCount);
		this.buffers.index  	= new Uint16Array(this.outputBuffer,  headerSize + positionDataSize + colorDataSize, indexDataCount);

		this.buffers.header[0] = positionDataCount / 3;
		this.buffers.header[1] = colorDataCount / 3;   // three bytes per vertex (r,g,b)
		this.buffers.header[2] = indexDataCount / 3;
	}

	return payloadSize;
}


GeometryStreamer.prototype.fromGeometry = function(geo) {
	
	var faceCount       = geo.faces.length;
	var vertexCount 	= faceCount * 3;

	var indexCount 		= vertexCount;
	var positionCount	= vertexCount * 3;
	var colorCount 		= vertexCount * 3;

	if((faceCount > 0xFFFF) || (vertexCount > 0xFFFF) || (colorCount > 0xFFFF)){
		console.error("Attempting to send too much mesh data.");
		return false;
	}
	
	//console.log(positionCount, colorCount, indexCount);
	
	var bytesToSend = this._updateBuffers(positionCount, colorCount, indexCount);
	if(bytesToSend == 0){
		return false;
	}

	var useFaceColors = (geo.faces[0].vertexColors.length == 0);

	var facePositionOffset;
	var faceColorOffset;
	var faceColorR;
	var faceColorG;
	var faceColorB;
	
	var i, v;

	var faceVerts = ["a", "b", "c"];


	if(positionCount > 0) {
		for(i = 0; i < faceCount; i++) {
			facePositionOffset = i * 9;
			for(v = 0; v < 3; v++) {
				this.buffers.position[facePositionOffset + (v * 3)]     = geo.vertices[geo.faces[i][faceVerts[v]]].x;
				this.buffers.position[facePositionOffset + (v * 3) + 1] = geo.vertices[geo.faces[i][faceVerts[v]]].y;
				this.buffers.position[facePositionOffset + (v * 3) + 2] = geo.vertices[geo.faces[i][faceVerts[v]]].z;
			}
		}
	}


	if(colorCount > 0) {
		
		for(i = 0; i < faceCount; i++) {

			if(useFaceColors) {
				faceColorR = ~~(geo.faces[i].color.r * 255);
				faceColorG = ~~(geo.faces[i].color.g * 255);
				faceColorB = ~~(geo.faces[i].color.b * 255);
			}

			faceColorOffset = i * 9;

			for(v = 0; v < 3; v++) {
				if(useFaceColors) {
					this.buffers.color[faceColorOffset + (v*3)] 		= faceColorR;
					this.buffers.color[faceColorOffset + (v*3) + 1] 	= faceColorG;
					this.buffers.color[faceColorOffset + (v*3) + 2]		= faceColorB;
				} else {
					this.buffers.color[faceColorOffset + (v*3)] 		= ~~(geo.faces[i].vertexColors[v].r * 255);
					this.buffers.color[faceColorOffset + (v*3) + 1] 	= ~~(geo.faces[i].vertexColors[v].g * 255);
					this.buffers.color[faceColorOffset + (v*3) + 2] 	= ~~(geo.faces[i].vertexColors[v].b * 255);
				}
			}
		}

	}
			
	if(indexCount > 0) {
		for(i = 0; i < faceCount; i++) {
			this.buffers.index[i*3] 	= (i*3);
			this.buffers.index[i*3+1] 	= (i*3+1);
			this.buffers.index[i*3+2] 	= (i*3+2);
		}
	}

	return true;
}