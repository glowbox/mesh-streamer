var express   = require('express');
var app       = express();
var server    = require("http").createServer(app);
var bodyParser = require('body-parser');
var rawBody = require("raw-body");

var zlib = require('zlib');
var fs = require('fs');

var WebsocketMeshSource = require("./WebsocketMeshSource");

// slots will be released if a client doesn't send an update within this interval.
var SOURCE_TIMEOUT_THRESHOLD = 2000; //milliseconds, 

var slots = [
  {
    free: true,
    info: {},
    origin: [1,0,0],
    key: 0,
    lastContact: 0
  },
  {
    free: true,
    info: {},
    origin: [0,1,0],
    key: 0,
    lastContact: 0
  },
  {
    free: true,
    info: {},
    origin: [2,0,0],
    key: 0,
    lastContact: 0
  }
];

// store the last known frame of geometry data for each slot.
var slotFrames = [null, null, null];


var bytesRecieved = 0;

var port           = 8080;
var saveFirstFrame = false;


function slotsChanged() {
  io.to("admin").emit("slots", slots);
}

function purgeInactiveSlots() {

  var now = new Date().getTime();

  slots.forEach((item, index) => {
    if(!item.free) {
      if( now - item.lastContact > SOURCE_TIMEOUT_THRESHOLD ) {
        console.log("Source timed out, slot: " + index);

        releaseSlot(index);
      }
    }
  });
}

setInterval(purgeInactiveSlots, 500);


function claimSlot(index, info) {
  if(slots[index].free) {
    slots[index].free = false;
    slots[index].info = info;
    slots[index].key = Math.floor(Math.random() * 65535);
    slots[index].lastContact = new Date().getTime();

    slotsChanged();

    return slots[index].key;
  }
  return null;
}


function releaseSlot(index) {
  if(!slots[index].free) {
    slots[index].info = {};
    slots[index].lastFrame = null;
    slots[index].free = true;
    slots[index].key = 0;

    slotsChanged();
  }
}

function getFreeSlots() {
  var freeSlots = [];
  slots.forEach( (item, index) => {
    if(item.free) {
      freeSlots.push(index);
    }
  });

  console.log("Free slots: ", freeSlots);

  return freeSlots;
}

function getRandomFreeSlot() {
  var freeSlots = getFreeSlots();
  if(freeSlots.length > 0) {
    var index = Math.floor(Math.random() * freeSlots.length);
    return freeSlots[index];
  } else {
    return -1;
  }
}

app.use(express.static('../'));
app.use(bodyParser.raw({"type" : "*/*"}));

app.get("/mesh", (req, res) => {
  var slotInfo = [];
  
  slots.forEach((item) => {
    slotInfo.push({
      "free" : item.free,
      "info" : item.info,
      "origin" : item.origin
    });
  });

  res.send(JSON.stringify(slotInfo));
});


app.get("/mesh/:index", (req, res) => {
  
  var slotIndex = parseInt(req.params.index);

  if(isNaN(slotIndex) || (slotIndex < 0) || (slotIndex > slots.length - 1)) {
    res.status(404);
    res.end("Invalid slot index.");
  }

  res.status(200);

  res.end(slotFrames[slotIndex]);
});


app.post("/mesh/register", (req, res) => {
  var slotIndex = getRandomFreeSlot();
  if(slotIndex !== -1) {
    console.log("Body: " + req.body);
    var info = JSON.parse(req.body.toString());
    var key = claimSlot(slotIndex, info);
    if(key) {
      res.status(200);
      res.json({
        "result":true, 
        "key": key, 
        "index" : slotIndex
      });
    } else {
      res.status(500);
      res.json({
        "result":false, 
        "error": "unable to claim slot"
      });
    }
  } else {
    res.status(404);
    res.json({
      "result":false, 
      "error": "no free slots."
    });
  }
});


app.post("/mesh/:index/frame", (req, res) => {
  var slotIndex = parseInt(req.params.index);

  if(isNaN(slotIndex) || (slotIndex < 0) || (slotIndex > slots.length - 1)) {
    res.status(404);
    res.end("Invalid slot index.");
  }
  
  if(parseInt(req.get("slot-key")) == slots[slotIndex].key) {

    //console.log("Got a frame!");
    slots[slotIndex].lastContact = new Date().getTime();

    rawBody( req, (err, rawRes) => {
      //console.log("Raw body: ", rawRes.length);
      slotFrames[slotIndex] = Buffer.from(rawRes);
      bytesRecieved += rawRes.length;
      res.end("Thanks.");
    });

  } else {
    res.status(404);
    res.end("Incorrect slot key.");
  }
});


app.post("/mesh/:index/stop", (req, res) => {
  
  var slotIndex = req.params.index;
  
  console.log("Getting frame for slot index: " + slotIndex);
  console.log("Slot key: " + req.get("slot-key"));

  if(parseInt(req.get("slot-key")) == slots[slotIndex].key) {
    console.log("Source is unregistering from slot: " + slotIndex);
    releaseSlot(slotIndex);
    res.end();
  } else {
    console.log("Got a frame but the key was wrong.");
    res.status(404);
    res.end("Nope.");
  }
});



var io = require('socket.io')(server);
io.set("transports", ["websocket"]);



var meshSources = [];
var meshClients = [];


// Print the data tranfer rate every second..
setInterval(function() {
  console.log((bytesRecieved / 1048576).toFixed(2) + " megabytes per second");
  bytesRecieved = 0;
}, 1000);


// Handle websocket connections
io.sockets.on('connection', function (socket) {
  
  console.log("Websocket connected.");
  var slotId = -1;
  var slotKey = -1;


// Mesh sources


  socket.on("register", function(info) {
    var slotIndex = getRandomFreeSlot();
    if(slotIndex !== -1) {
      var key = claimSlot(slotIndex, info);
      if(key) {
        
        slotId = slotIndex;
        slotKey = key;

        socket.emit("register",{
            "result": true, 
            "key": key, 
            "index" : slotIndex
        });
      } else {
        socket.disconnect();
      }
    } else {
       socket.disconnect();
    }
  });

  socket.on("frame", (frameData) => {
    if((slotId !== -1) && (slots[slotId].key == slotKey)) {
      bytesRecieved += frameData.length;

      slots[slotId].lastContact = new Date().getTime();
      slotFrames[slotId] = frameData;

      meshClients.forEach( (client) => {
        if(client.ready && (client.slot == slotId)) {
          client.connection.emit("mesh", frameData);
        }
      });

      socket.emit("ready");
    } else {
      console.log("Socket is no longer registered to a slot for some reason, disconnecting.");
      socket.disconnect();
    }
  });

  socket.on("stop", () => {
    if(slotId !== -1) {
      releaseSlot(slotId);
      socket.disconnect();
    }
  });

  socket.on("disconnect", () => {
    if(slotId !== -1) {
      releaseSlot(slotId);
    }
  });


// Websocket mesh clients (browser debug viewer)


  socket.on("register-client", function(config) {
    
    console.log("Websocket client identifying");
    console.log(config);

    var newClient = {
      "slot"        : config.slot,
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

    socket.on("set-slot", function(obj){
      newClient.slot = obj.slot;
    });

    meshClients.push(newClient);

    console.log("Mesh client connected, clients: " + meshClients.length);

    socket.emit("sources", getSources() );
  });


// websocket admins.

  socket.on("register-admin", function(object) {
      
    console.log("Websocket admin identifying");
      
    socket.join("admin");

    socket.emit("slots", slots);
    socket.on("eject", function(obj){
      releaseSlot(obj.slot);
    });
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



server.listen(port);


console.log("\n-----------------------------");
console.log("Server listening on port " + port);
console.log("-----------------------------\n");