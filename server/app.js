var express   = require('express');
var app       = express();
var server    = require("http").createServer(app);

var zlib = require('zlib');
var fs = require('fs');

var WebsocketMeshSource = require("./WebsocketMeshSource");

var meshSources = [];
var meshClients = [];

var bytesRecieved = 0;

var port      = 8080;
var saveFrame = true;

var io = require('socket.io')(server);
io.set("transports", ["websocket"]);


// Print the data tranfer rate every second..
setInterval(function() {
  console.log((bytesRecieved / 1048576).toFixed(2) + " megabytes per second");
  bytesRecieved = 0;
}, 1000);


// Handle websocket connections
io.sockets.on('connection', function (socket) {
  
  console.log("Websocket connected.");

  // Mesh sources

  socket.on("identify-source", (object) => {

    console.log("Websocket source identifying");
    console.log(object);

    var newSource = new WebsocketMeshSource(socket, object);

    // Incoming mesh data
    newSource.on("mesh", function(buffer) {
      
      // keep some stats..
      bytesRecieved += buffer.length;
      
      //debugMeshBuffer(buffer, newSource.author);
      if(saveFrame) {
        debugMeshBuffer(buffer, newSource.author, true);
        writeMeshToFile("foo.mesh", buffer, false );
        saveFrame = false;
      }
      
      // TODO: Allow clients to pick a specific "channel" and only send updated mesh data 
      // to clients which are tuned into each given channel. Curerntly all clients get all
      // mesh streams, not scalable..

      meshClients.forEach(function(client) {
        if(client.ready) {
          client.ready = false;
          client.connection.emit("mesh", buffer);
        } else {
          console.log("Client not ready, skipping frame..");
        }
      });
    });
    

    newSource.on("disconnect", function(source) {
      for(var i = 0; i < meshSources.length; i++){
        if(meshSources[i].source === source) {
          meshSources.splice(i, 1);
        }
      }
      console.log("Mesh source disconnected, sources: " + meshSources.length);
    });

    
    meshSources.push(newSource);

    console.log("Mesh source connected, sources: " + meshSources.length);
  });



  // Mesh clients (holo lenses)

  socket.on("identify-client", function(object) {
    
    console.log("Websocket client identifying");
    console.log(object);

    var newClient = {
      "connection"  : socket,
      "ready"       : true
    };

    socket.on("disconnect", function() {
      for(var i = 0; i < meshClients.length; i++){
        if(meshClients[i].connection === socket) {
          meshClients.splice(i, 1);
        }
      }
      console.log("Mesh client disconnected, clients: " + meshClients.length);
    });

    // allow mesh clients to signal when they are ready for the next frame (prevent flooding on the client side)
    socket.on("mesh-ready", function(){
      newClient.ready = true;
    });

    meshClients.push(newClient);

    console.log("Mesh client connected, clients: " + meshClients.length);

    socket.emit("sources", getSources() );
  });
});



function getSources() {
  var result = [];

  meshSources.forEach(function(element) {
    result.push({
      "platform"  : element.platform,
      "author"    : element.author,
      "title"     : element.title
    });
  });

  return result;
}


function writeMeshToFile(fileName, buffer, compressFile) {

  if(compressFile) {

    zlib.gzip(outputBuffer, (err, buffer) => {
      if (!err) {
        var wstreamz = fs.createWriteStream(__dirname + '/' + fileName);
        wstreamz.write(buffer);
        wstreamz.end();

      } else {
        console.log("error gzipping mesh data.");
      }
    });
  } else {
    var wstream = fs.createWriteStream(__dirname + '/' + fileName);
    wstream.write(buffer);
    wstream.end();
  }
}



function debugMeshBuffer(obj, author, verbose) {
  
  console.log("Got mesh:", obj.length + " bytes, author: " + author + ", " + new Date().toString());
  
  var headerSize = 16;

  // first 8 bytes of the header are "MESHDATA"

  var vertCount   = obj.readUInt16LE(8);
  var colorCount  = obj.readUInt16LE(10);
  var faceCount   = obj.readUInt16LE(12);

  var vertDataSize  = (vertCount * 3) * 4; // 32 bit floats.
  var colorDataSize = colorCount * 3;       // 8 bit uints for each color component
  var faceDataSize  = (faceCount * 3) * 2; // 16 bit ints

  var vertDataOffset = headerSize;
  
  var colorDataOffset = headerSize + vertDataSize;
  var faceDataOffset  = headerSize + vertDataSize + colorDataSize;


  console.log("Verts:  " + vertCount);
  console.log("Colors: " + colorCount);
  console.log("Faces:  " + faceCount);


  if (verbose) {
    for(var f = 0; f < vertCount; f++) {
      
      var vert = [];
      for(var i = 0; i < 3; i++){
        vert.push( obj.readFloatLE( vertDataOffset + (f * 12) + (i*4)));
      }
      
      console.log("Vert: ", vert);
    }

    for(var f = 0; f < colorCount; f++) {
      var r = obj.readUInt8(colorDataOffset + (f*3));
      var g = obj.readUInt8(colorDataOffset + (f*3) + 1);
      var b = obj.readUInt8(colorDataOffset + (f*3) + 2);

      console.log("Color: ", r,g,b);
    }

    for(var f = 0; f < faceCount; f++) {
     
      var face = [];
      
      for(var i = 0; i < 3; i++){
        face.push( obj.readUInt16LE( faceDataOffset + (f * 6) + (i*2)));
      }
      
      console.log("Face: ", face);

    }
  }

};



app.use(express.static('../'));

server.listen(port);


console.log("\n-----------------------------");
console.log("Server listening on port " + port);
console.log("-----------------------------\n");