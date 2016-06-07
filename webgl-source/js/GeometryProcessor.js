var GeometryProcessor = function() {

	this.buffers = {
		"header" : null,
		"position" : null,
		"color" : null,
		"index" : null
	};

	this.outputBuffer = new ArrayBuffer(1);
}

GeometryProcessor.prototype.update = function(geometry) {
	if(geometry instanceof THREE.Geometry) {
		return this._fromGeometry(geometry);
	} else {
		return false;
	}
}


GeometryProcessor.prototype._updateBuffers = function(positionCount, colorCount, indexCount) {

	var positionDataCount  	= positionCount;
	var colorDataCount 		= colorCount;
	var indexDataCount  	= indexCount;
	
	var headerSize    = 16;

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

		this.buffers.header[0] = 0x454D;
		this.buffers.header[1] = 0x4853;
		this.buffers.header[2] = 0x4144;
		this.buffers.header[3] = 0x4154;
		
		this.buffers.header[4] = positionDataCount / 3;
		this.buffers.header[5] = colorDataCount / 3;   // three bytes per vertex (r,g,b)
		this.buffers.header[6] = indexDataCount / 3;
	}

	return payloadSize;
}


GeometryProcessor.prototype._fromGeometry = function(geo) {
	
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