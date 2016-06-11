var GeometryReader = function() {

	this.vertices 	= [];
	this.colors 	= [];
	this.faces 		= [];

	this.bufferGeometry = new THREE.BufferGeometry();
	
	var emptyData = new Float32Array();

	this.bufferGeometry.addAttribute("position", new THREE.BufferAttribute(emptyData, 3));
	this.bufferGeometry.addAttribute("color", new THREE.BufferAttribute(emptyData, 3));
	//this.bufferGeometry.addAttribute("uv", new THREE.BufferAttribute(emptyData, 3));
}


GeometryReader.prototype.updateMesh = function(buffer) {

	if(buffer.byteLength == 0){
		return;
	}

	var headerSize = 16;

	var header = new Uint16Array(buffer, 0, headerSize);

	var vertDataCount 	= header[4] * 3;
	var colorDataCount 	= header[5] * 3;
	var faceDataCount 	= header[6] * 3;

	var vertDataSize  = vertDataCount  * Float32Array.BYTES_PER_ELEMENT;
	var colorDataSize = colorDataCount * Uint8Array.BYTES_PER_ELEMENT
	var faceDataSize  = faceDataCount  * Uint16Array.BYTES_PER_ELEMENT;

	//console.log(vertDataCount, colorDataCount, faceDataCount);
	
	if(vertDataCount > 0) {

		var vertData  = new Float32Array(buffer, headerSize, vertDataCount);

		if(vertDataCount != this.bufferGeometry.getAttribute("position").array.length) {
			this.bufferGeometry.addAttribute("position", new THREE.BufferAttribute(vertData, 3));
		} else {
			this.bufferGeometry.getAttribute("position").array.set(vertData);
		}
		
		this.bufferGeometry.getAttribute("position").needsUpdate = true;
	}
	
	if(colorDataCount > 0) {
		
		var colorData = new Uint8Array(buffer, headerSize + vertDataSize, colorDataCount);
		var colorDataFloat = new Float32Array(colorDataCount);
		var color;
		
		//var rgbCount = colorDataCount / 3;
		for(var i = 0; i < colorDataCount; i++) {
			colorDataFloat[i]     = colorData[i] / 255;
		}
		
		this.bufferGeometry.addAttribute("color", new THREE.BufferAttribute(colorDataFloat, 3));
		this.bufferGeometry.getAttribute("color").needsUpdate = true;
	}

	if(faceDataCount > 0) {
		//console.log("Face data count:"  + faceDataCount);
		//var faceData  = new Uint8Array(buffer,  headerSize + vertDataSize + colorDataSize, faceDataCount);

		var faceDataBuffer = new Uint8Array(buffer,  headerSize + vertDataSize + colorDataSize, faceDataCount * 2);
		var faceData = new Uint16Array(faceDataCount);
		
		for(var i = 0; i < faceDataCount; i++) {
			faceData[i] = this.readIndexValue(faceDataBuffer, i);	
		}
		this.bufferGeometry.setIndex(new THREE.BufferAttribute( faceData, 1));
		

		this.bufferGeometry.getIndex().needsUpdate = true;
	}
}

GeometryReader.prototype.readIndexValue = function(byteBuffer, offset) {
	var result = 0;
	result += byteBuffer[offset*2];
	result += (byteBuffer[offset*2+1] << 8);
	return result;
}