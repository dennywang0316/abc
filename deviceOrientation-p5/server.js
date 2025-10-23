const express = require('express');
const https = require('https');
const fs = require("fs")

const app = express();
const portHTTPS = 4280; // port for https

app.use(express.static('public'));

// to unpack json
const bodyParser = require('body-parser')
app.use(bodyParser.json())

const options = {
  key: fs.readFileSync("keys-for-local-https/localhost-key.pem"),
  cert: fs.readFileSync("keys-for-local-https/localhost.pem"),
};
const HTTPSserver = https.createServer(options, app);

const { Server } = require('socket.io') 
const io = new Server(HTTPSserver)


HTTPSserver.listen(portHTTPS, function (req, res) {
  console.log("HTTPS server started at the port", portHTTPS);
})

app.post('/xyz', (req, res) => {
  res.status(200).end();
});

app.get('/zyx', (req, res) => {
  res.status(200).end();
});


io.on('connection', (socket) => {
  console.log('client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('client disconnected:', socket.id);
  });
});

httpServer.listen(portHTTP, function (req, res) {
    console.log("HTTP Server started at port", portHTTP);
});
httpsServer.listen(portHTTPS, function (req, res) {
    console.log("HTTPS Server started at port", portHTTPS);
});





