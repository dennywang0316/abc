const express = require('express');

const https = require("https");
// to read certificates from the filesystem (fs)
const fs = require("fs");
const app = express(); // the server "app", the server behaviour
const portHTTPS = 4280; // YOUR port

// returning to the client anything that is
// inside the public folder
app.use(express.static('public'));


// Creating object of key and certificate
// for SSL
const options = {
    key: fs.readFileSync("localhost-key.pem"),
    cert: fs.readFileSync("localhost.pem"),
};

let HTTPSserver = https.createServer(options, app)


const { Server } = require('socket.io'); // include library
const io = new Server(HTTPSserver); // start socket io 

let currentlyConntected = []; //list of socket IDs of copnnected clients

io.on('connection', (socket) => {

    // we manage the connection inside here
    console.log('a user connected', socket.id);
    // keep track of all clients connected
    currentlyConntected.push(socket.id);

    socket.on("location-from-client", function (data) {
        console.log("got new location", data);
        //share location with everyone except the sender
        let locationInfo = {
            lat: data.locForSer.lat,
            lng: data.locForSer.lng,
            id: socket.id
        }
        socket.broadcast.emit("location-from-server", locationInfo);
     
    })

    socket.on("traces-from-client", (data) => {

    socket.broadcast.emit("traces-from-server", data);
  });

     let users = {};
    socket.on("new-user", function(col) {
    users[socket.id] = { color: col };
    io.emit("users-update", users);
    });

    // socket.on("camera-from-client", function (data) {
    //     let cameraInfo = {
    //         lat: data.lat,
    //         lng: data.lng,
    //         socketID: socket.id
    //     }
    //     socket.broadcast.emit("camera-from-server", cameraInfo);
    //     console.log(JSON.stringify(cameraInfo)+",");
    // })

    // socket.on("deletePrevious", function (data) {
    //     console.log("DELETE LAST POINT FROM", socket.id)
    // })


    // DISCONNECT
    socket.on("disconnect", function () {
        console.log("someone disconnected", socket.id)

        // delete socket ID from the global array
        // that keeps track of all connected clients 
        // let idx = currentlyConntected.findIndex(socket.id);
        // if(idx > -1){
        //     currentlyConntected.splice(idx, 1);
        //     console.log(currentlyConntected);
        // }
    })

})



// additional express server endpoints could be made here:



// Creating https server by passing
// options and app object
HTTPSserver.listen(portHTTPS, function (req, res) {
    console.log("HTTPS Server started at port", portHTTPS);
});





