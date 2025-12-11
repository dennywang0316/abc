let mappa = new Mappa("Leaflet"); // map library
let myMap;
let canvas;
let currentLongitude = 0; // global variables will be updated as we get GPS data
let currentLatitude = 0; // global variables will be updated as we get GPS data
let mapInit = false; // we only do map stuff once mapInit is true (see in draw)
let me; // point object showing our own location
// const prefix = location.pathname.replace(/\/$/, '');      
// const socket = io({ path: prefix + '/socket.io' });

if (location.hostname.toLowerCase().startsWith("browsercircus")) {
  socket = io({ path: "/denny/port-4280/socket.io" }); // yields '/leon/port-4100/socket.io' or '/socket.io'
} else {
  socket = io();
}

// options for map
// we only actually initialize the map once we get data where we are (in draw)
// there are differnt suppliers and styles of maps available
let mappa_options = {
  lat: 0, // will change once we have data
  lng: 0, // will change once we have data
  zoom: 16, // initial zoom level
  // style: "https://b.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png"
  // style: "https://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}",
  style: "https://b.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png",
};

// game state
// bump key to clear old rewards/points
const STORAGE_KEY = "war-clicker-state-v2";
let points = 0;
let totalStrikes = 0;
let unlockedRewards = [];
let strikeMarks = []; // {lat,lng,created}
let rewardParticles = []; // floating rewards on screen
let target = null;
let missile = null;
let globalState = { globalStrikes: 0, globalPoints: 0 };
let motionEnabled = false;
let tiltBeta = 0,
  tiltGamma = 0;
let clickPhase = "select"; // "select" -> choose next historical target, "fire" -> launch
let currentTargetIndex = -1;
let explosionParticles = [];
let shakeFrames = 0;
let shakeMag = 0;
let newsClips = []; // {img, alpha, scale, created, w, h}
let rewardIconCache = {};
let hitHistory = []; // {label, lat, lng}
let warningDismissed = false;
let contextShown = false;
let noteToolbarEl;
let leaveNoteReady = false;
let noteModeActive = false;

function shuffleTargets() {
  for (let i = historicalTargets.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [historicalTargets[i], historicalTargets[j]] = [
      historicalTargets[j],
      historicalTargets[i],
    ];
  }
}

const rewardLadder = [
  { points: 5, name: "Service Ribbon", file: "Service Ribbon.png" },
  { points: 10, name: "Bronze Star", file: "Bronze Star.png" },
  { points: 20, name: "Food Ration", file: "Food Ration.png" },
  { points: 35, name: "Silver Star", file: "Silver Star.png" },
  { points: 50, name: "cash bonus", file: "cash bonus.png" },
  { points: 75, name: "Purple Heart", file: "Purple Heart.png" },
  { points: 100, name: "Gold Star", file: "Gold Star.png" },
  { points: 140, name: "Victory Medal", file: "Victory Medal.png" },
  { points: 180, name: "Honor Guard", file: "Honor Guard.png" },
  { points: 230, name: "Distinguished Cross", file: "Distinguished Cross.png" },
  { points: 300, name: "National Hero medal", file: "National Hero medal.png" },
  { points: 400, name: "Ceremonial sword", file: "Ceremonial sword.png" },
  { points: 500, name: "House", file: "House.png" },
];

const historicalTargets = [
  { lat: 43.3127, lng: -2.676, label: "Guernica, Spain, 1937 (Spanish Civil War)", country: "Spain", war: "1937 Spanish Civil War" },
  { lat: 51.5074, lng: -0.1278, label: "London, UK, 1940 (The Blitz)", country: "UK", war: "1940 London Blitz" },
  { lat: 51.0504, lng: 13.7373, label: "Dresden, Germany, 1945 (WWII bombing)", country: "Germany", war: "1945 Dresden bombing" },
  { lat: 34.3853, lng: 132.4553, label: "Hiroshima, Japan, 1945", country: "Japan", war: "1945 Hiroshima bombing" },
  { lat: 32.7503, lng: 129.8777, label: "Nagasaki, Japan, 1945", country: "Japan", war: "1945 Nagasaki bombing" },
  { lat: 11.5564, lng: 104.9282, label: "Phnom Penh, Cambodia, 1973 (Operation Menu)", country: "Cambodia", war: "1973 Operation Menu" },
  { lat: 21.0278, lng: 105.8342, label: "Hanoi, Vietnam, 1972 (Christmas bombing)", country: "Vietnam", war: "1972 Hanoi Christmas bombing" },
  { lat: 43.8563, lng: 18.4131, label: "Sarajevo, Bosnia, 1994 (Markale Market Massacre )", country: "Bosnia", war: "1994 Sarajevo shelling" },
  { lat: 43.3178, lng: 45.6983, label: "Grozny, Chechnya, 1999 (Second Chechen War)", country: "Chechnya", war: "1999 Grozny bombing" },
  { lat: 44.7866, lng: 20.4489, label: "Belgrade, Serbia, 1999 (NATO bombing)", country: "Serbia", war: "1999 Belgrade bombing" },
  { lat: 33.3152, lng: 44.3661, label: "Baghdad, Iraq, 2003 (2003 Iraq War)", country: "Iraq", war: "2003 Iraq War" },
];

let rewardLogEl,
  pointsEl,
  strikesEl,
  globalStrikesEl,
  globalPointsEl,
  targetLabelEl,
  fireButtonEl,
  infoButtonEl,
  infoListEl,
  infoOverlayEl,
  warningOverlayEl,
  contextOverlayEl,
  reverseOverlayEl;

const audio = window.audio || {
  playLaunch: () => {},
  playBoom: () => {},
};

function setup() {
  canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent("p5-canvas-container");
  me = new MyPoint();
  rewardLogEl = document.getElementById("rewardLog");
  pointsEl = document.getElementById("pointsVal");
  strikesEl = document.getElementById("strikesVal");
  globalStrikesEl = document.getElementById("globalStrikes");
  globalPointsEl = document.getElementById("globalPoints");
  targetLabelEl = document.getElementById("targetLabel");
  fireButtonEl = document.getElementById("fireButton");
  infoButtonEl = document.getElementById("infoButton");
  infoListEl = document.getElementById("infoList");
  infoOverlayEl = document.getElementById("infoOverlay");
  warningOverlayEl = document.getElementById("warningOverlay");
  contextOverlayEl = document.getElementById("contextOverlay");
  reverseOverlayEl = document.getElementById("reverseOverlay");
  noteToolbarEl = document.getElementById("noteToolbar");
  const reverseYesBtn = document.getElementById("reverseYesBtn");
  const reverseNoBtn = document.getElementById("reverseNoBtn");
  const contextContinueBtn = document.getElementById("contextContinueBtn");
  const contextLeaveBtn = document.getElementById("contextLeaveBtn");
  const warningBtn = document.getElementById("warningContinue");
  const clearBtn = document.getElementById("clearButton");
  const bindTap = (el, handler) => {
    if (!el) return;
    ["click", "touchstart"].forEach((ev) => {
      el.addEventListener(
        ev,
        (e) => {
          e.preventDefault();
          e.stopPropagation();
          handler();
        },
        { passive: false }
      );
    });
  };
  if (warningBtn) {
    bindTap(warningBtn, dismissWarning);
  }
  if (reverseYesBtn) {
    bindTap(reverseYesBtn, reverseYes);
  }
  if (reverseNoBtn) {
    bindTap(reverseNoBtn, reverseNo);
  }
  if (contextContinueBtn) {
    bindTap(contextContinueBtn, continueFromContext);
  }
  if (contextLeaveBtn) {
    bindTap(contextLeaveBtn, enterLeaveNoteMode);
  }
  // note toolbar buttons (mobile friendly)
  const moveBtn = document.getElementById("moveModeBtn");
  const noteBtn = document.getElementById("noteModeBtn");
  const notesListBtn = document.getElementById("notesListBtn");
  bindTap(moveBtn, () => setMode("move"));
  bindTap(noteBtn, () => setMode("note"));
  bindTap(notesListBtn, () => toggleNotesList());
  bindTap(clearBtn, clearAllData);
  if (fireButtonEl) {
    ["click", "touchstart"].forEach((ev) => {
      fireButtonEl.addEventListener(
        ev,
        (e) => {
          e.preventDefault();
          e.stopPropagation();
          handleMainClick();
        },
        { passive: false }
      );
    });
  }
  if (fireButtonEl) {
    fireButtonEl.style.display = "block";
    fireButtonEl.style.opacity = 1;
  }

  loadLocalState();
  shuffleTargets();
  updateUI();
  populateInfoList();
  updateFireButtonState();
  showInfoButtonIfReady();
  showWarningIfNeeded();
  if (window.leaveNote && !leaveNoteReady) {
    window.leaveNote.init({
      getMap: () => myMap,
      socket,
      onEnterNoteMode: () => {},
      onExitNoteMode: () => {},
    });
    leaveNoteReady = true;
  }
  // try to start motion sensing after first user action (see requestGPS)
  if (
    window.DeviceMotionEvent &&
    typeof DeviceMotionEvent.requestPermission !== "function"
  ) {
    startMotionListeners();
  }
}

function draw() {
  clear();

  // Initialize full screen map
  if (!mapInit && GPS_GRANTED && currentLongitude != 0) {
    mappa_options.lat = currentLatitude;
    mappa_options.lng = currentLongitude;
    myMap = mappa.tileMap(mappa_options);
    myMap.overlay(canvas);
    myMap.onChange(updateMapContent);
    console.log("map init with", currentLatitude, currentLongitude);
    mapInit = true;
    if (target) {
      recenterToTarget();
    }
    updateFireButtonState();
  }

  if (mapInit) {
    if (!warningDismissed) {
      // still render map but interactions blocked by overlay
    }
    push();
    if (shakeFrames > 0) {
      translate(random(-shakeMag, shakeMag), random(-shakeMag, shakeMag));
      shakeFrames--;
      shakeMag *= 0.9;
    }
    // only update and draw our point if we actually have data
    me.update();
    me.display();
    drawTarget();
    drawStrikeMarks();
    drawMissile();
    drawRewardParticles();
    drawExplosionParticles();
    drawNewsClips();
    if (window.leaveNote) window.leaveNote.drawNotes(myMap);
    if (noteModeActive) drawWarMarkers();
    pop();
  } else {
    push();
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(14);
    text(
      `waiting for map... GPS_GRANTED: ${GPS_GRANTED} lon: ${
        currentLongitude.toFixed
          ? currentLongitude.toFixed(4)
          : currentLongitude
      }`,
      width / 2,
      height / 2 + 30
    );
    pop();
  }
}

function drawTarget() {
  if (!target) {
    return;
  }
  let pos = myMap.latLngToPixel(target.lat, target.lng);
  push();
  stroke(255, 200, 150);
  strokeWeight(3);
  noFill();
  circle(pos.x, pos.y, 26 + sin(frameCount * 0.2) * 4);
  stroke(255, 80, 60, 120);
  line(pos.x - 10, pos.y, pos.x + 10, pos.y);
  line(pos.x, pos.y - 10, pos.x, pos.y + 10);
  pop();
}

function drawStrikeMarks() {
  const zoomLevel =
    myMap && myMap.map ? myMap.map.getZoom() : mappa_options.zoom || 16;
  const baseSize = constrain(64 * Math.pow(2, zoomLevel - 16), 18, 60);
  strikeMarks.forEach((m) => {
    let pos = myMap.latLngToPixel(m.lat, m.lng);
    const patches = m.patches || [{ dx: 0, dy: 0 }];
    patches.forEach((p) => {
      const px = pos.x + p.dx * baseSize * 0.5;
      const py = pos.y + p.dy * baseSize * 0.5;
      push();
      drawingContext.save();
      drawingContext.filter = "grayscale(100%) contrast(1.2) brightness(0.9)";
      drawingContext.globalCompositeOperation = "color";
      noStroke();
      fill(140, 140, 140, 220);
      rectMode(CENTER);
      rect(px, py, baseSize, baseSize);
      drawingContext.restore();
      pop();
      push();
      rectMode(CENTER);
      noFill();
      stroke(30, 140);
      strokeWeight(1.5);
      rect(px, py, baseSize, baseSize);
      pop();
    });
  });
}

function drawMissile() {
  if (!missile) {
    return;
  }
  missile.t += 0.02;
  const startPos = myMap.latLngToPixel(missile.start.lat, missile.start.lng);
  const endPos = myMap.latLngToPixel(missile.target.lat, missile.target.lng);
  const x = lerp(startPos.x, endPos.x, missile.t);
  const y = lerp(startPos.y, endPos.y, missile.t);
  push();
  stroke(255, 100, 80);
  strokeWeight(4);
  line(startPos.x, startPos.y, x, y);
  noStroke();
  fill(255, 200, 80);
  circle(x, y, 16);
  pop();
  if (missile.t >= 1 || !missile.target) {
    try {
      handleHit();
    } catch (err) {
      console.log("handleHit error", err);
    }
    missile = null;
  }
}

function drawRewardParticles() {

  const gx = constrain(map(tiltGamma, -45, 45, -0.4, 0.4), -0.6, 0.6);
  const gy = constrain(map(tiltBeta, -45, 45, -0.4, 0.4), -0.6, 0.6) + 0.05;
  rewardParticles.forEach((p) => {
    const idx = rewardParticles.indexOf(p);
    const targetX = 60;
    const targetY = 60 + idx * 70;
    p.x = lerp(p.x || targetX, targetX, 0.4);
    p.y = lerp(p.y || targetY, targetY, 0.4);
  });
  // render
  rewardParticles.forEach((p, idx) => {
    push();
    translate(p.x, p.y);
    if (p.iconKey && rewardIconCache[p.iconKey]) {
      imageMode(CENTER);
      image(rewardIconCache[p.iconKey], 0, 0, p.w, p.h);
    } else {
      const grad = drawingContext.createLinearGradient(
        -p.w / 2,
        -p.h / 2,
        p.w / 2,
        p.h / 2
      );
      const palette = [
        ["#d9a441", "#f6e27f"],
        ["#b46b3a", "#d8b48a"],
        ["#6b7bab", "#c3d6ff"],
        ["#c0c0c0", "#f7f7f7"],
        ["#8d6f47", "#e7c590"],
      ];
      const pick = palette[idx % palette.length];
      grad.addColorStop(0, pick[0]);
      grad.addColorStop(1, pick[1]);
      noStroke();
      drawingContext.fillStyle = grad;
      rectMode(CENTER);
      rect(0, 0, p.w, p.h, 6);
      fill(30);
      textAlign(CENTER, CENTER);
      textSize(12);
      text(p.text, 0, 0);
    }
    pop();
  });
}

function drawExplosionParticles() {
  explosionParticles = explosionParticles.filter((p) => p.life > 0);
  explosionParticles.forEach((p) => {
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.95;
    p.vy *= 0.95;
    p.life -= 1;
    push();
    blendMode(ADD);
    noStroke();
    fill(255, random(120, 200), 80, map(p.life, 0, 40, 0, 255));
    circle(p.x, p.y, 8 + p.life * 0.3);
    pop();
  });
}

function drawNewsClips() {
  const now = millis();
  newsClips = newsClips.slice(-40);
  newsClips.forEach((c) => {
    c.vy += c.g;
    c.y += c.vy;
    c.x += c.vx;
    // constrain inside screen
    if (c.x < c.w / 2) {
      c.x = c.w / 2;
      c.vx *= -0.3;
    }
    if (c.x > width - c.w / 2) {
      c.x = width - c.w / 2;
      c.vx *= -0.3;
    }
    if (!c.landed && c.y >= height - c.h / 2) {
      c.y = height - c.h / 2;
      c.vy = 0;
      c.g = 0;
      c.landed = true;
      c.holdUntil = now + 10000; 
    }
    if (c.landed && now > c.holdUntil) {
      if (c.scale > c.minScale) {
        c.scale *= 0.993;
        if (c.scale < c.minScale) c.scale = c.minScale;
      }
    }
    push();
    imageMode(CENTER);
    tint(255, 255);
    if (c.img) {
      const w = c.w * c.scale;
      const h = c.h * c.scale;
      image(c.img, c.x, c.y, w, h);
    }
    pop();
  });
}

// P5 touch events: https://p5js.org/reference/#Touch
function touchStarted(e) {
  if (mapInit) {
    if (contextOverlayEl && contextOverlayEl.style.display === "flex") {
      return true; // allow scroll on overlays
    }
    if (
      window.leaveNote &&
      window.leaveNote.isUIEvent &&
      window.leaveNote.isUIEvent(e)
    ) {
      return false;
    }
    const tx = touches && touches.length > 0 ? touches[0].x : mouseX;
    const ty = touches && touches.length > 0 ? touches[0].y : mouseY;
    const pos = myMap.pixelToLatLng(tx, ty);
    if (noteModeActive) {
      const hit = findHistoricalTargetHit(tx, ty);
      if (hit && window.leaveNote && window.leaveNote.openNoteOverlay) {
        window.leaveNote.openNoteOverlay(hit.lat, hit.lng, {
          war: hit.war || hit.label || "this war",
          city: hit.country || "",
        });
        return false;
      }
      if (
        window.leaveNote &&
        window.leaveNote.handleTouch &&
        window.leaveNote.handleTouch(e)
      ) {
        return false;
      }
    }
    console.log("TOUCHED", pos);
  } else {
    console.log("TOUCHED", touches);
  }
}

function touchMoved() {}

function touchEnded() {}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  rewardParticles.forEach((p) => {
    p.x = constrain(p.x, 20, width - 20);
    p.y = constrain(p.y, 20, height - 40);
  });
}

function handleNewPosition(pos) {
  // fix location for chinese map tiles
  let lonlat = fixForChineseMap(pos);
  currentLongitude = lonlat[0];
  currentLatitude = lonlat[1];
  console.log(currentLatitude, currentLongitude);
  if (GPS_FALLBACK_TIMER) {
    clearTimeout(GPS_FALLBACK_TIMER);
    GPS_FALLBACK_TIMER = null;
  }

  if (mapInit) {
    // if map already displayed, update the point
    updateMapContent();
  }
}

function updateMapContent() {
  let myPosOnCanvas = myMap.latLngToPixel(currentLatitude, currentLongitude);
  me.goalX = myPosOnCanvas.x;
  me.goalY = myPosOnCanvas.y;
}

function advanceHistoricalTarget() {
  if (historicalTargets.length === 0) return;
  currentTargetIndex = (currentTargetIndex + 1) % historicalTargets.length;
  const t = historicalTargets[currentTargetIndex];
  target = { lat: t.lat, lng: t.lng, label: t.label };
  console.log("new target", target);
  recenterToTarget(true);
  updateTargetLabel();
  clickPhase = "fire";
  updateFireButtonState();
}

function recenterToTarget(panOnly = false) {
  if (!target) {
    return;
  }
  if (myMap && myMap.map) {
    if (panOnly) {
      zoomOutToPath();
    } else {
      myMap.map.setView([target.lat, target.lng], mappa_options.zoom);
    }
  } else {
    mappa_options.lat = target.lat;
    mappa_options.lng = target.lng;
  }
}

function fireMissile() {
  if (!mapInit || !target) {
    return;
  }
  if (clickPhase !== "fire") {
    return;
  }
  if (missile) {
    return;
  }
  missile = {
    start: { lat: currentLatitude, lng: currentLongitude },
    target: { lat: target.lat, lng: target.lng },
    t: 0,
  };
  audio.playLaunch();
  zoomOutToPath();
  updateFireButtonState();
}
window.fireMissile = fireMissile;

function handleHit() {
  if (!target) {
    clickPhase = "select";
    updateFireButtonState();
    return;
  }
  try {
    const patches = [];
    for (let i = 0; i < 4; i++) {
      patches.push({ dx: random(-1, 1), dy: random(-1, 1) });
    }
    strikeMarks.push({
      lat: target.lat,
      lng: target.lng,
      created: Date.now(),
      patches,
    });
    if (strikeMarks.length > 120) {
      strikeMarks.shift();
    }
    totalStrikes += 1;
    const gained = 5;
    points += gained;
    audio.playBoom();
    zoomInToTarget();
    checkRewards();
    saveLocalState();
    updateUI();
    if (socket) {
      socket.emit("reportStrike", { pointsDelta: gained, target });
    }
    showInfoButtonIfReady();
    spawnExplosion(target);
    spawnNewsClip(target);
    if (!contextShown && totalStrikes >= 4) {
      hideReversePrompt();
      showContextOverlay();
    } else if (!contextShown) {
      showReversePrompt();
    }
    hitHistory.push({
      label: target.label || "",
      lat: target.lat,
      lng: target.lng,
    });
    if (hitHistory.length > 100) {
      hitHistory.shift();
    }
  } catch (err) {
    console.log("handleHit error", err);
  } finally {
    clickPhase = "select";
    updateFireButtonState();
  }
}

function checkRewards() {
  rewardLadder.forEach((r) => {
    if (points >= r.points && unlockedRewards.indexOf(r.name) === -1) {
      unlockedRewards.push(r.name);
      spawnRewardDrop(r.name, r.file);
      // coin sound removed
    }
  });
}

function loadRewardIcon(file) {
  if (!file) return null;
  if (rewardIconCache[file]) {
    return rewardIconCache[file];
  }
  const path = encodeURI(`assets/${file}`);
  rewardIconCache[file] = null;
  loadImage(
    path,
    (img) => {
      rewardIconCache[file] = img;
    },
    (err) => {
      console.log("missing reward icon", path, err);
    }
  );
  return null;
}

function spawnRewardDrop(text, file) {
  const px = random(40, width - 40);
  const py = -20;
  if (file) {
    loadRewardIcon(file);
  }
  // auto-lookup file by name if missing
  let iconKey = file;
  if (!iconKey) {
    const match = rewardLadder.find((r) => r.name === text);
    if (match && match.file) {
      iconKey = match.file;
      loadRewardIcon(iconKey);
    }
  }
  const reward = {
    text,
    x: px,
    y: py,
    vx: random(-0.3, 0.3),
    vy: random(0.5, 1.2),
    w: file ? 64 : min(220, 70 + text.length * 7),
    h: file ? 64 : 30,
    iconKey: iconKey || null,
    created: Date.now(),
  };
  rewardParticles.push(reward);
  saveLocalState();
}

function spawnExplosion(t) {
  if (!myMap) return;
  const pos = myMap.latLngToPixel(t.lat, t.lng);
  shakeFrames = 18;
  shakeMag = 10;
  for (let i = 0; i < 40; i++) {
    const angle = random(TWO_PI);
    const speed = random(1, 4);
    explosionParticles.push({
      x: pos.x,
      y: pos.y,
      vx: cos(angle) * speed,
      vy: sin(angle) * speed,
      life: 40,
    });
  }
}

function formatCoord(num) {
  return num.toFixed(4);
}

function spawnNewsClip(t) {
  const keyComma = `${formatCoord(t.lat)}, ${formatCoord(t.lng)}`;
  const keyUnder = `${formatCoord(t.lat)}_${formatCoord(t.lng)}`;
  const tryLoad = (key, fallbackKey) => {
    const path = `assets/newspaper/${key}.jpg`;
    loadImage(
      path,
      (img) => {
        const maxW = width * 0.7;
        const maxH = height * 0.6;
        const ratio = min(maxW / img.width, maxH / img.height, 1);
        const w = img.width * ratio;
        const h = img.height * ratio;
        newsClips.push({
          img,
          created: millis(),
          life: 120000,
          x: random(w / 2 + 10, width - w / 2 - 10),
          y: -h,
          vx: random(-0.2, 0.2),
          vy: random(0.8, 1.5),
          g: 0.08,
          scale: 1,
          minScale: 0.166,
          landed: false,
          holdUntil: 0,
          w,
          h,
        });
      },
      (err) => {
        if (fallbackKey) {
          tryLoad(fallbackKey, null);
        } else {
          console.log("missing news clip", path, err);
        }
      }
    );
  };
  tryLoad(keyComma, keyUnder);
}

function loadLocalState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      points = parsed.points || 0;
      totalStrikes = parsed.totalStrikes || 0;
      unlockedRewards = parsed.unlockedRewards || [];
      strikeMarks = (parsed.strikeMarks || []).map((s) => ({
        lat: s.lat,
        lng: s.lng,
        created: s.created || Date.now(),
        patches: s.patches || [
          { dx: random(-1, 1), dy: random(-1, 1) },
          { dx: random(-1, 1), dy: random(-1, 1) },
        ],
      }));
      rewardParticles = (parsed.rewardParticles || []).map((r) => ({
        text: r.text,
        x: r.x,
        y: r.y,
        vx: r.vx || 0,
        vy: r.vy || 0,
        w: r.w || 120,
        h: r.h || 28,
        iconKey: r.iconKey || null,
        created: r.created || Date.now(),
      }));
      // relink icons based on name if missing, just in case
      rewardParticles.forEach((rp) => {
        if (!rp.iconKey) {
          const match = rewardLadder.find((rr) => rr.name === rp.text);
          if (match && match.file) {
            rp.iconKey = match.file;
          }
        }
        if (rp.iconKey) {
          loadRewardIcon(rp.iconKey);
        }
      });
      currentTargetIndex =
        typeof parsed.currentTargetIndex === "number"
          ? parsed.currentTargetIndex
          : -1;
      clickPhase = parsed.clickPhase || "select";
      hitHistory = (parsed.hitHistory || []).map((h) => ({
        label: h.label || "",
        lat: h.lat,
        lng: h.lng,
      }));
      warningDismissed = parsed.warningDismissed || false;
      contextShown = parsed.contextShown || false;
      // restore target if index exists
      if (
        currentTargetIndex >= 0 &&
        currentTargetIndex < historicalTargets.length
      ) {
        const t = historicalTargets[currentTargetIndex];
        target = { lat: t.lat, lng: t.lng, label: t.label };
      }
    }
  } catch (e) {
    console.log("could not load local state", e);
  }
}

function saveLocalState() {
  const data = {
    points,
    totalStrikes,
    unlockedRewards,
    strikeMarks,
    rewardParticles,
    currentTargetIndex,
    clickPhase,
    hitHistory,
    warningDismissed,
    contextShown,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.log("could not save local state", e);
  }
}

function clearAllData() {
  points = 0;
  totalStrikes = 0;
  unlockedRewards = [];
  strikeMarks = [];
  rewardParticles = [];
  currentTargetIndex = -1;
  clickPhase = "select";
  target = null;
  missile = null;
  hitHistory = [];
  newsClips = [];
  explosionParticles = [];
  warningDismissed = false;
  contextShown = false;
  saveLocalState();
  updateUI();
  if (myMap && myMap.map) {
    myMap.map.setView(
      [currentLatitude || 0, currentLongitude || 0],
      mappa_options.zoom
    );
  }
  console.log("local state cleared");
}
window.clearAllData = clearAllData;

function updateUI() {
  if (pointsEl) pointsEl.textContent = points;
  if (strikesEl) strikesEl.textContent = totalStrikes;
  if (globalStrikesEl) globalStrikesEl.textContent = globalState.globalStrikes;
  if (globalPointsEl) globalPointsEl.textContent = globalState.globalPoints;
  updateTargetLabel();
  showInfoButtonIfReady();
  const hudEl = document.getElementById("hud");
  if (hudEl) {
    hudEl.style.display = "none";
  }
}

function updateTargetLabel() {
  if (!targetLabelEl) {
    return;
  }
  if (target) {
    const coords = `${target.lat.toFixed(4)}, ${target.lng.toFixed(4)}`;
    targetLabelEl.textContent = `target: ${coords}`;
  } else {
    targetLabelEl.textContent = "target: waiting for gps";
  }
  updateFireButtonState();
}

function updateFireButtonState() {
  if (!fireButtonEl) {
    return;
  }
  if (clickPhase === "note-only") {
    fireButtonEl.style.display = "none";
    return;
  }
  if (!mapInit) {
    fireButtonEl.disabled = true;
    fireButtonEl.innerText = "waiting for GPS";
    fireButtonEl.style.display = "block";
  } else if (missile) {
    fireButtonEl.disabled = true;
    fireButtonEl.innerText = "missile en route";
  } else if (clickPhase === "fire" && !target) {
    fireButtonEl.disabled = true;
    fireButtonEl.innerText = "click here";
  } else if (clickPhase === "select") {
    fireButtonEl.disabled = false;
    fireButtonEl.innerText = "click here";
  } else {
    fireButtonEl.disabled = false;
    fireButtonEl.innerText = "click here";
  }
}

function requestMotion() {
  if (motionEnabled) {
    return;
  }
  if (
    typeof DeviceOrientationEvent !== "undefined" &&
    typeof DeviceOrientationEvent.requestPermission === "function"
  ) {
    DeviceOrientationEvent.requestPermission()
      .then((state) => {
        if (state === "granted") {
          startMotionListeners();
        }
      })
      .catch((err) => {
        console.log("motion permission error", err);
      });
  } else {
    startMotionListeners();
  }
}
window.requestMotion = requestMotion;

function startMotionListeners() {
  if (motionEnabled) {
    return;
  }
  motionEnabled = true;
  window.addEventListener("deviceorientation", function (e) {
    tiltBeta = e.beta || 0;
    tiltGamma = e.gamma || 0;
  });
}

function populateInfoList() {
  if (!infoListEl) return;
  infoListEl.innerHTML = "";
  historicalTargets.forEach((t) => {
    const div = document.createElement("div");
    div.style.marginBottom = "10px";
    const coords = `${t.lat.toFixed(4)}, ${t.lng.toFixed(4)}`;
    const label = t.label || "target";
    div.innerHTML = `<strong>${label}</strong> (${coords})`;
    infoListEl.appendChild(div);
  });
}

function toggleInfo() {
  if (!infoOverlayEl) return;
  if (infoOverlayEl.style.display === "none" || infoOverlayEl.style.display === "") {
    populateInfoList();
    infoOverlayEl.style.display = "flex";
  } else {
    infoOverlayEl.style.display = "none";
  }
}
window.toggleInfo = toggleInfo;

function showInfoButtonIfReady() {
  if (!infoButtonEl) return;
  infoButtonEl.style.display = "block";
}

function setMode(mode) {
  if (window.leaveNote && window.leaveNote.setMode) {
    window.leaveNote.setMode(mode);
  }
  if (mode === "note" && clickPhase !== "note-only") {
    enterLeaveNoteMode();
  }
  toggleMapInteraction(mode === "move");
}
window.setMode = setMode;

function closeNoteOverlay() {
  if (window.leaveNote && window.leaveNote.closeNoteOverlay) {
    window.leaveNote.closeNoteOverlay();
  }
}
window.closeNoteOverlay = closeNoteOverlay;

function submitNote() {
  if (window.leaveNote && window.leaveNote.submitNote) {
    window.leaveNote.submitNote();
  }
}
window.submitNote = submitNote;

function toggleNotesList(forceOpen) {
  if (window.leaveNote && window.leaveNote.toggleNotesList) {
    window.leaveNote.toggleNotesList(forceOpen);
  }
}
window.toggleNotesList = toggleNotesList;

function showWarningIfNeeded() {
  if (warningOverlayEl && !warningDismissed) {
    warningOverlayEl.style.display = "flex";
  }
}

function dismissWarning() {
  warningDismissed = true;
  if (warningOverlayEl) warningOverlayEl.style.display = "none";
}
window.dismissWarning = dismissWarning;

function showContextOverlay() {
  if (contextOverlayEl) {
    contextOverlayEl.style.display = "flex";
    contextShown = true;
    if (noteToolbarEl) noteToolbarEl.style.display = "none";
    document.body.style.overflowY = "auto";
  }
  hideReversePrompt();
  toggleMapInteraction(false);
}

function continueFromContext() {
  if (contextOverlayEl) contextOverlayEl.style.display = "none";
  if (noteToolbarEl) noteToolbarEl.style.display = "none";
  document.body.style.overflowY = "hidden";
  toggleMapInteraction(true);
}
window.continueFromContext = continueFromContext;

function showReversePrompt() {
  if (reverseOverlayEl && !contextShown) {
    reverseOverlayEl.style.display = "flex";
  }
}

function hideReversePrompt() {
  if (reverseOverlayEl) reverseOverlayEl.style.display = "none";
}

function reverseYes() {
  hideReversePrompt();
  showContextOverlay();
}
window.reverseYes = reverseYes;

function reverseNo() {
  hideReversePrompt();
}
window.reverseNo = reverseNo;

function enterLeaveNoteMode() {
  if (contextOverlayEl) contextOverlayEl.style.display = "none";
  if (window.leaveNote) {
    window.leaveNote.enterNoteMode();
  }
  // clear bombing artifacts
  strikeMarks = [];
  rewardParticles = [];
  newsClips = [];
  explosionParticles = [];
  target = null;
  clickPhase = "note-only";
  if (fireButtonEl) fireButtonEl.style.display = "none";
  if (noteToolbarEl) noteToolbarEl.style.display = "flex";
  if (myMap && myMap.map) {
    myMap.map.setView([20, 0], 2);
  }
  toggleMapInteraction(false);
  noteModeActive = true;
}
window.enterLeaveNoteMode = enterLeaveNoteMode;

function zoomOutToPath() {
  if (!myMap || !myMap.map || !target) return;
  const bounds = [
    [currentLatitude, currentLongitude],
    [target.lat, target.lng],
  ];
  myMap.map.fitBounds(bounds, { padding: [50, 50] });
}

function zoomInToTarget() {
  if (myMap && myMap.map && target) {
    myMap.map.setView(
      [target.lat, target.lng],
      Math.max(15, myMap.map.getZoom())
    );
  }
}

function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

function handleMainClick() {
  if (!mapInit || missile) return;
  if (!warningDismissed) return;
  if (contextOverlayEl && contextOverlayEl.style.display === "flex") return;
  if (clickPhase === "select") {
    advanceHistoricalTarget();
  } else if (clickPhase === "fire") {
    fireMissile();
  }
}
window.handleMainClick = handleMainClick;

class MyPoint {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.goalX = 0;
    this.goalY = 0;
    this.size = 14;
    this.col = color(170, 240, 190);
  }
  update() {
    // lerp to each new location to keep things smoother
    this.x = lerp(this.x, this.goalX, 0.2);
    this.y = lerp(this.y, this.goalY, 0.2);
  }
  display() {
    push();
    translate(this.x, this.y);
    fill(this.col);
    stroke("pink");
    strokeWeight(3);
    let dia = this.size + sin(frameCount * 0.1);
    circle(0, 0, dia);
    // the "you" label 
    noStroke();
    fill(0);
    textAlign(CENTER, BOTTOM);
    textSize(14);
    text("You", 0, -this.size * 1.2);
    pop();
  }
}

// socket listeners
socket.on("globalState", function (state) {
  if (state) {
    globalState = state;
    updateUI();
  }
});

socket.on("notes", function (serverNotes) {
  if (window.leaveNote && window.leaveNote.onNotes) {
    window.leaveNote.onNotes(serverNotes || []);
  }
});

function toggleMapInteraction(enable) {
  if (myMap && myMap.map) {
    if (enable) {
      myMap.map.dragging.enable();
      myMap.map.touchZoom.enable();
      myMap.map.doubleClickZoom.enable();
      myMap.map.boxZoom.enable();
      myMap.map.keyboard.enable();
    } else {
      myMap.map.dragging.disable();
      myMap.map.touchZoom.disable();
      myMap.map.doubleClickZoom.disable();
      myMap.map.boxZoom.disable();
      myMap.map.keyboard.disable();
    }
  }
}
function drawWarMarkers() {
  if (!myMap) return;
  push();
  historicalTargets.forEach((t) => {
    const pos = myMap.latLngToPixel(t.lat, t.lng);
    noStroke();
    fill(255, 80, 80, 230);
    circle(pos.x, pos.y, 14);
    stroke(0, 140);
    strokeWeight(1);
    noFill();
    circle(pos.x, pos.y, 18);
  });
  pop();
}

function findHistoricalTargetHit(px, py) {
  if (!myMap) return null;
  let closest = null;
  let minDist = 18;
  historicalTargets.forEach((t) => {
    const pos = myMap.latLngToPixel(t.lat, t.lng);
    const d = dist(px, py, pos.x, pos.y);
    if (d < minDist) {
      minDist = d;
      closest = t;
    }
  });
  return closest;
}
