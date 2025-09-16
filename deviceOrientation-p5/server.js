const express = require('express');
const http = require("http");
const https = require("https");
// to read certificates from the filesystem (fs)
const fs = require("fs");

const app = express(); // the server "app", the server behaviour
const portHTTP = 3000; // port for http
const portHTTPS = portHTTP+1; // port for https

// returning to the client anything that is
// inside the public folder
app.use(express.static('public'));


// to unpack json
// const bodyParser = require('body-parser')//add this
// app.use(bodyParser.json())


// Creating object of key and certificate
// for SSL
const options = {
    key: fs.readFileSync("localhost-key.pem"),
    cert: fs.readFileSync("localhost.pem"),
};


// additional server endpoints could be made here:

// app.post('/xyz', (req, res) => {
//   res.status(200).end();
// });

// app.get('/zyx', (req, res) => {
//   res.status(200).end();
// });


// Creating https server by passing
// options and app object
http.createServer(app).listen(portHTTP, function (req, res) {
    console.log("HTTP Server started at port", portHTTP);
});
https.createServer(options, app).listen(portHTTPS, function (req, res) {
    console.log("HTTPS Server started at port", portHTTPS);
});





