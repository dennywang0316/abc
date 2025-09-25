const express = require('express');
const http = require('http');
const https = require("https");
const fs = require("fs");

const app = express();
const portHTTPS = 4280;

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

    // user joins with a name
    socket.on("user:join", function(name){
        socket.data.username = (name || "Anonymous");
        io.emit("system", `${socket.data.username} has entered, it's time to chat :)`);
    });

    socket.on("message", function(incomingMessage){
        console.log("got a msg", incomingMessage)
        // broadcast to everyone including sender
        io.emit("message", incomingMessage)
    })

    // font change start/stop for a message id
    socket.on("font:start", function(payload){
        io.emit("font:start", payload);
    });
    socket.on("font:stop", function(payload){
        io.emit("font:stop", payload);
    });

    socket.on("disconnect", function(){
        console.log("someone disconnected", socket.id)
        if (socket.data && socket.data.username){
            io.emit("system", `${socket.data.username} has left the chat, prob got some work to do`);
        } else {
            io.emit("system", `A user has left the chat`);
        }
    })
})


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
            socket.on("user:join", function(name){
                socket.data.username = (name || "Anonymous");
                ioHttps.emit("system", `${socket.data.username} has entered, it's time to chat`);
            });
            socket.on("message", (incomingMessage) => {
                ioHttps.emit("message", incomingMessage);
            });
            socket.on("font:start", function(payload){ ioHttps.emit("font:start", payload); });
            socket.on("font:stop", function(payload){ ioHttps.emit("font:stop", payload); });
            socket.on("disconnect", function(){
                if (socket.data && socket.data.username){
                    ioHttps.emit("system", `${socket.data.username} has left the chat, prob got some work to do`);
                } else {
                    ioHttps.emit("system", `A user has left the chat`);
                }
            })
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





