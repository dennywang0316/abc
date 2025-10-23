const express = require("express");
const https = require("https");
const fs = require("fs");
const bodyParser = require("body-parser");
const { Server } = require("socket.io");
const Physics = require("./physics.js");

// server configuration
const PORT = 4280;
const options = {
  key: fs.readFileSync("keys/localhost-key.pem"),
  cert: fs.readFileSync("keys/localhost.pem"),
};

const app = express();
app.use(express.static("public"));
app.use(bodyParser.json());

const server = https.createServer(options, app);
const io = new Server(server);
server.listen(PORT, () => {
  console.log("HTTPS server started at the port", PORT);
});

// Game states
let WORLD = { w: 800, h: 600 };
let state = {
  connectedUsers: {},
  links: {},
  groups: [],
};
let userInputs = {};

// Update game state every 100ms and broadcast new state to all clients
setInterval(() => {
  if (Object.keys(state.connectedUsers).length > 0) {
    Physics.updateState(state, userInputs, WORLD);
    io.emit("gameState", {
      users: state.connectedUsers,
      links: state.links,
      groups: state.groups,
    });
  }
}, 100);

// Generate an unique bubble style for each new player
const generateUserStyle = () => ({
  hue: Math.floor(Math.random() * 360),
  radius: 20 + Math.floor(Math.random() * 10),
});
const colors = [
  "#66ccff",
  "#ffcc66",
  "#66ff66",
  "#ff6666",
  "#9966ff",
  "#ff9966",
];

// socket connection
io.on("connection", (socket) => {
  console.log("connected:", socket.id);

  const userColor =
    colors[Object.keys(state.connectedUsers).length % colors.length];
  const style = generateUserStyle();

  const margin = 40;
  state.connectedUsers[socket.id] = {
    id: socket.id,
    color: userColor,
    position: {
      x: margin + Math.random() * Math.max(10, WORLD.w - margin * 2),
      y: margin + Math.random() * Math.max(10, WORLD.h - margin * 2),
    },
    velocity: { x: 0, y: 0 },
    radius: style.radius,
    style: style,
    connected: false,
    edgeDeform: 0,
  };

  io.emit("userList", state.connectedUsers);

  socket.on("motion", function (data) {
    userInputs[socket.id] = data;
  });

  socket.on("viewport", function (vp) {
    if (!vp || !vp.w || !vp.h) return;
    WORLD.w = Math.max(320, Math.min(1200, Math.floor(vp.w)));
    WORLD.h = Math.max(240, Math.min(2000, Math.floor(vp.h)));
    Object.values(state.connectedUsers).forEach((u) => {
      const r = u.radius || 20;
      u.position.x = Math.min(Math.max(r, u.position.x), WORLD.w - r);
      u.position.y = Math.min(Math.max(r, u.position.y), WORLD.h - r);
    });
  });

  socket.on("disconnect", function () {
    console.log("disconnected:", socket.id);
    delete state.connectedUsers[socket.id];
    delete userInputs[socket.id];
    io.emit("userDisconnected", socket.id);
    io.emit("userList", state.connectedUsers);
  });
});
