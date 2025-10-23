const socket = io();

const audio = window.audio;
const draw = window.draw;

function hideStatusUI() {
  const wrapper = document.getElementById("statusWrapper");
  if (wrapper) {
    wrapper.style.display = "none";
  }
}

let tiltValue = { alpha: 0, beta: 0, gamma: 0 };
let motionValue = { x: 0, y: 0, z: 0 };
let sensorEnabled = false;
let mySocketId = null;
let allUsers = {};
let gameState = null;
let trailParticles = [];
let knownUserIds = new Set();
let hasInitialUserSnapshot = false;
let lastFrameTime = performance.now();

function syncUsers(users) {
  const snapshot = users || {};
  const newIds = [];

  Object.keys(snapshot).forEach((id) => {
    const alreadyKnown = knownUserIds.has(id);
    if (!alreadyKnown && hasInitialUserSnapshot) {
      newIds.push(id);
    }
    if (!alreadyKnown) {
      knownUserIds.add(id);
    }
  });

  Array.from(knownUserIds).forEach((id) => {
    if (!snapshot[id]) {
      knownUserIds.delete(id);
      audio.clearMovementSound(id);
    }
  });

  allUsers = snapshot;

  if (!hasInitialUserSnapshot) {
    hasInitialUserSnapshot = true;
  }

  return newIds;
}

socket.on("connect", function () {
  console.log("connected");
  mySocketId = socket.id;
  knownUserIds.add(mySocketId);
  if (!allUsers[mySocketId]) {
    allUsers[mySocketId] = {
      position: { x: 150, y: 100 },
      motion: {
        tilt: { alpha: 0, beta: 0, gamma: 0 },
        accel: { x: 0, y: 0, z: 0 },
      },
      color: "#66ccff",
    };
  }
  audio.playNewJoinerSound();
  audio.playBackgroundAudio();
  document.getElementById("connectionStatus").textContent =
    "connected - click button to enable sensors";
});

socket.on("disconnect", function () {
  console.log("disconnected");
  document.getElementById("connectionStatus").textContent = "disconnected";
  knownUserIds.clear();
  hasInitialUserSnapshot = false;
  audio.clearAllMovementSounds();
  allUsers = {};
  trailParticles = [];
  gameState = null;
});

socket.on("gameState", function (state) {
  gameState = state;
  const newUserIds = syncUsers(state.users);
  if (newUserIds.length) {
    newUserIds.forEach(() => audio.playNewJoinerSound());
  }

  const now = performance.now();
  Object.keys(allUsers).forEach((userId) => {
    const user = allUsers[userId];
    const vx = user.velocity ? user.velocity.x : 0;
    const vy = user.velocity ? user.velocity.y : 0;
    const speed = Math.hypot(vx, vy);

    if (speed > 0.1) {
      trailParticles.push({
        x: user.position.x,
        y: user.position.y,
        life: 1.0,
        color: user.color,
        radius: user.radius || 20,
      });
    }

    audio.updateMovementSound(userId, speed, now);
  });

  audio.pruneMovementSounds(allUsers);

  if (trailParticles.length > 200) {
    trailParticles = trailParticles.slice(-200);
  }

  draw.renderFrame({
    time: now,
    deltaTime: 16,
    gameState,
    users: allUsers,
    trailParticles,
  });
});

socket.on("userList", function (users) {
  const newUserIds = syncUsers(users);
  if (newUserIds.length) {
    newUserIds.forEach(() => audio.playNewJoinerSound());
  }
  audio.pruneMovementSounds(allUsers);
  console.log("users:", Object.keys(users).length);
  document.getElementById("connectionStatus").textContent = `connected - ${
    Object.keys(users).length
  } users - click button to enable sensors`;
});

socket.on("userDisconnected", function (socketId) {
  console.log("user disconnected:", socketId);
  delete allUsers[socketId];
  audio.playPopSound();
  knownUserIds.delete(socketId);
  audio.clearMovementSound(socketId);
  draw.renderFrame({
    time: performance.now(),
    deltaTime: 16,
    gameState,
    users: allUsers,
    trailParticles,
  });
});

// request orientation permission
function requestOrientation() {
  if (typeof DeviceOrientationEvent.requestPermission === "function") {
    DeviceOrientationEvent.requestPermission()
      .then((permissionState) => {
        if (permissionState === "granted") {
          sensorEnabled = true;
          document.getElementById("connectionStatus").textContent =
            "connected - sensors enabled!";
          document.getElementById("requestOrientationButton").style.display =
            "none";
          hideStatusUI();
          startSensors();
        } else {
          document.getElementById("connectionStatus").textContent =
            "connected - sensor access denied";
        }
      })
      .catch(console.error);
  } else {
    sensorEnabled = true;
    document.getElementById("connectionStatus").textContent =
      "connected - sensors enabled!";
    document.getElementById("requestOrientationButton").style.display = "none";
    hideStatusUI();
    startSensors();
  }
}

window.requestOrientation = requestOrientation;

function startSensors() {
  window.addEventListener("deviceorientation", function (event) {
    const a = event.alpha || 0;
    const b = event.beta || 0;
    const gamma = event.gamma || 0;
    tiltValue.alpha = tiltValue.alpha * 0.9 + a * 0.1;
    tiltValue.beta = tiltValue.beta * 0.9 + b * 0.1;
    tiltValue.gamma = tiltValue.gamma * 0.9 + gamma * 0.1;
  });

  window.addEventListener("devicemotion", function (event) {
    const ax = (event.acceleration && event.acceleration.x) || 0;
    const ay = (event.acceleration && event.acceleration.y) || 0;
    motionValue.x = ax;
    motionValue.y = ay;
    motionValue.z = (event.acceleration && event.acceleration.z) || 0;
  });
}

setInterval(function () {
  if (sensorEnabled) {
    const motionData = {
      tilt: tiltValue,
      motion: motionValue,
      timestamp: Date.now(),
    };
    socket.emit("motion", motionData);
  }
}, 100);

const canvas = document.getElementById("bridgeCanvas");
draw.init(canvas);

let viewportWidth = 0;
let viewportHeight = 0;

function updateViewportSize() {
  viewportWidth = Math.max(320, Math.floor(window.innerWidth));
  viewportHeight = Math.max(240, Math.floor(window.innerHeight));
  draw.resize(viewportWidth, viewportHeight);
  socket.emit("viewport", { w: viewportWidth, h: viewportHeight });
}

updateViewportSize();
window.addEventListener("resize", updateViewportSize);

function animate() {
  const now = performance.now();
  const deltaTime = now - lastFrameTime;
  lastFrameTime = now;
  audio.stepMovementSounds(now, deltaTime);
  draw.renderFrame({
    time: now,
    deltaTime,
    gameState,
    users: allUsers,
    trailParticles,
  });
  requestAnimationFrame(animate);
}

animate();
