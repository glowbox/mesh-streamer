# mesh-streamer
A general purpose system for streaming mesh data into Unity


### Setup and Usage

In the server folder:

	npm install
	node app.js
	

Then open these URLs:

[http://localhost:8080/webgl-source/websocket.html](http://localhost:8080/webgl-source/websocket.html) or [http://localhost:8080/webgl-source/http.html](http://localhost:8080/webgl-source/http.html)

[http://localhost:8080/admin](http://localhost:8080/admin)


See the `test data` folder for an example binary frame of mesh data as well as documentation about the file format.



## Server Protocol for Mesh Sources

The server has a set number of available "slots" for mesh streams to occupy. Before your client can begin sending frames, it much register with the server to get a slot index and key. The key will be used to identify the unique session from that point on.

#### Register

method: `POST`

url: `/mesh/register`

body: JSON identifying the mesh source, following this schema:

	{
		"author": "Name of the developer/artist",
		"title" : "name of the art piece",
		"platform" : "what platform is this coming from?",
		"slot" : 2  // OPTIONAL: the desired slot to use if available.
	}
	
response: JSON result of the registration request.

on success:

	{
		result: true,
		slot: 3, // the numeric index of the slot.
		key: 1204762 // the unique session key for this source.
	}
	
on failure: 

	{
		result: false,
		error: "the reason that it didn't work."
	}
	

#### Send Mesh Data

method: `POST`

url: `/mesh/<slot index>/frame`

body: binary blob consisting of the mesh frame data.

**IMPORTANT** your request must include an http header called `mesh-key` which matches the `key` value returned from the call to `/mesh/register` or your mesh data will be ignored.

response: none, the HTTP status code will reflect success or failure.

#### Update Frequency

You MUST send mesh data on a regular basis or your session will time out and the server will release the registered slot back into the pool of available slots. So, even if your mesh is not moving you should send it at least once per second to avoid being kicked out of your slot.

Conversely, it is a good idea to only send a new mesh frame once the previous mesh frame HTTP request has completed to avoid flooding the server. ~60 fps seems achievable but this will need to be tested.



## Server Protocol for Mesh Viewing

#### Get Mesh Slot List

method: `GET`

url: `/mesh`

response: JSON array of mesh slot information, this schema will likely change so I'm not going to bother documenting it here yet.

#### Get Mesh Content for a Slot

method: `GET`

url: `/mesh/<slot index>`

response: Binary blob of mesh data, it will be whatever the last updated mesh was for this slot.




