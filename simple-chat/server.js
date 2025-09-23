const express = require('express');
const http = require('http');
const https = require("https");
const fs = require("fs");

const app = express();
const portHTTP = 3000;
const portHTTPS = 3001;

// returning to the client anything that is
// inside the public folder
app.use(express.static('public'));


// to unpack json
// const bodyParser = require('body-parser')//add this
// app.use(bodyParser.json())


const { Server } = require('socket.io');

// Always start HTTP server for development
const HTTPserver = http.createServer(app);
const io = new Server(HTTPserver);

io.on('connection', (socket) => {
    console.log('a user connected', socket.id);

    socket.on("message", function(incomingMessage){
        console.log("got a msg", incomingMessage)
        // broadcast to everyone including sender
        io.emit("message", incomingMessage)
    })
    socket.on("disconnect", function(){
        console.log("someone disconnected", socket.id)
    })
})

// Start HTTP server
HTTPserver.listen(portHTTP, function(){
    console.log("HTTP Server started at port", portHTTP);
});

// Try to additionally start HTTPS if certs exist
try{
    const possiblePaths = [
        { key: "keys-for-local-https/localhost-key.pem", cert: "keys-for-local-https/localhost.pem" },
        { key: "localhost-key.pem", cert: "localhost.pem" }
    ];
    let creds = null;
    for(const p of possiblePaths){
        if(fs.existsSync(p.key) && fs.existsSync(p.cert)){
            creds = { key: fs.readFileSync(p.key), cert: fs.readFileSync(p.cert) };
            break;
        }
    }
    if(creds){
        const HTTPSserver = https.createServer(creds, app);
        const ioHttps = new Server(HTTPSserver);
        ioHttps.on('connection', (socket) => {
            console.log('[HTTPS] a user connected', socket.id);
            socket.on("message", (incomingMessage) => {
                ioHttps.emit("message", incomingMessage);
            });
        });
        HTTPSserver.listen(portHTTPS, function(){
            console.log("HTTPS Server started at port", portHTTPS);
        });
    } else {
        console.log("HTTPS certs not found. Running HTTP only.");
    }
}catch(err){
    console.log("Failed to start HTTPS:", err.message);
}





