const express = require("express");
const https = require("https");
const fs = require("fs");
const path = require("path");

const app = express(); // the server "app", the server behaviour
const portHTTPS = 4280; // YOUR port

// returning to the client anything that is
// inside the public folder
app.use(express.static("public"));
app.use(express.json());

// simple persistent state for the project
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "state.json");
const NOTES_FILE = path.join(DATA_DIR, "notes.json");

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
  }
  if (!fs.existsSync(DATA_FILE)) {
    const seed = {
      globalStrikes: 0,
      globalPoints: 0,
      lastTargets: [],
      lastUpdated: Date.now(),
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(seed, null, 2));
  }
}

function loadState() {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    console.log("error reading state, resetting", e);
    const seed = {
      globalStrikes: 0,
      globalPoints: 0,
      lastTargets: [],
      lastUpdated: Date.now(),
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(seed, null, 2));
    return seed;
  }
}

function saveState(nextState) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(nextState, null, 2));
}

function ensureNotesFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
  }
  if (!fs.existsSync(NOTES_FILE)) {
    fs.writeFileSync(NOTES_FILE, JSON.stringify([], null, 2));
  }
}

function loadNotes() {
  ensureNotesFile();
  try {
    const raw = fs.readFileSync(NOTES_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    console.log("error reading notes, resetting", e);
    fs.writeFileSync(NOTES_FILE, JSON.stringify([], null, 2));
    return [];
  }
}

function saveNotes(notes) {
  ensureNotesFile();
  fs.writeFileSync(NOTES_FILE, JSON.stringify(notes, null, 2));
}

let globalState = loadState();
let notes = loadNotes();

// minimal API to read state
app.get("/state", (req, res) => {
  res.json(globalState);
});

app.get("/notes", (req, res) => {
  res.json(notes);
});

// Creating object of key and certificate
// for SSL
const options = {
  key: fs.readFileSync("localhost-key.pem"),
  cert: fs.readFileSync("localhost.pem"),
};

let HTTPSserver = https.createServer(options, app);

const { Server } = require("socket.io"); // include library
const io = new Server(HTTPSserver); // start socket io

let currentlyConntected = []; //list of socket IDs of copnnected clients

io.on("connection", (socket) => {
  // we manage the connection inside here
  console.log("a user connected", socket.id);
  // keep track of all clients connected
  currentlyConntected.push(socket.id);
  console.log(currentlyConntected);

  // send initial global state
  socket.emit("globalState", globalState);
  socket.emit("notes", notes);

  socket.on("reportStrike", function (data) {
    // data: {pointsDelta, target:{lat,lng}}
    globalState.globalStrikes += 1;
    if (data && data.pointsDelta) {
      globalState.globalPoints += data.pointsDelta;
    }
    if (data && data.target) {
      globalState.lastTargets.push({
        lat: data.target.lat,
        lng: data.target.lng,
        at: Date.now(),
      });
      if (globalState.lastTargets.length > 40) {
        globalState.lastTargets = globalState.lastTargets.slice(-40);
      }
    }
    globalState.lastUpdated = Date.now();
    saveState(globalState);
    io.emit("globalState", globalState);
  });

  socket.on("createNote", function (data) {
    if (!data || !data.lat || !data.lng || !data.text) return;
    let color = null;
    if (data.color && typeof data.color === "object") {
      const r = Math.min(255, Math.max(0, parseInt(data.color.r, 10) || 0));
      const g = Math.min(255, Math.max(0, parseInt(data.color.g, 10) || 0));
      const b = Math.min(255, Math.max(0, parseInt(data.color.b, 10) || 0));
      color = { r, g, b };
    }
    const note = {
      id: Date.now() + "-" + Math.random().toString(16).slice(2),
      lat: data.lat,
      lng: data.lng,
      text: data.text.slice(0, 500),
      city: data.city ? data.city.slice(0, 120) : "",
      color,
      created: Date.now(),
    };
    notes.push(note);
    if (notes.length > 300) {
      notes = notes.slice(-300);
    }
    saveNotes(notes);
    io.emit("notes", notes);
  });

  // DISCONNECT
  socket.on("disconnect", function () {
    console.log("someone disconnected", socket.id);

    // delete socket ID from the global array
    // that keeps track of all connected clients
    let idx = currentlyConntected.indexOf(socket.id);
    if (idx > -1) {
      currentlyConntected.splice(idx, 1);
      console.log(currentlyConntected);
    }
  });
});

// additional express server endpoints could be made here:

// Creating https server by passing
// options and app object
HTTPSserver.listen(portHTTPS, function (req, res) {
  console.log("HTTPS Server started at port", portHTTPS);
});
