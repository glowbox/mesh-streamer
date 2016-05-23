"use strict";

/**
* Simple wrapper around websocket connections.
*/

var util          = require("util");
var EventEmitter  = require("events").EventEmitter;

var WebsocketMeshSource = function(socket, info) {

	this.title 		= info.title;
	this.author 	= info.author;
	this.platform 	= info.platform;

	// add packet marker, this should probably be done on the client.

	var marker = new Buffer("MESHDATA");

	// just a pass-through, tack the marker bytes onto the buffer and send it along.
	socket.on("mesh", (buffer) => {
		this.emit("mesh", Buffer.concat([marker, buffer]));
		
		process.nextTick(function() {
			socket.emit("mesh-ready");
		});
	});	

	socket.on("disconnect", () => {
		this.emit("disconnect", this);
	});

	socket.emit("mesh-ready");
}

util.inherits(WebsocketMeshSource, EventEmitter);

module.exports = WebsocketMeshSource;