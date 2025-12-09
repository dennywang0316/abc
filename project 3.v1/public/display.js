let riverPaths = [];
let rainChars = [];
let mode = "river";
let draining = false;
let inPause = false;
let pauseShowLogo = false;
let pauseStart = 0;
let pauseUntil = 0;
let nextMode = null;
let lastSwitch = 0;
let socket;
let logoImg;
let drainStart = 0;
let rainDraining = false;
let rainDrainStart = 0;

const RIVER_DURATION = 14000; // ms before start draining
const RAIN_DURATION = 8000; // ms before switching to river
const PAUSE_SHORT = 2500; // rain -> river (no logo)
const PAUSE_LONG = 5000; // river -> rain (with logo)
const PATH_SAMPLES = 160;


// start socket
if(location.hostname.toLowerCase().startsWith('browsercircus') || location.hostname.toLowerCase().startsWith('www')){
  socket = io({path: "/denny/port-4280/socket.io"});  // yields '/leon/port-4100/socket.io' or '/socket.io'
}else{
  socket = io(); 
}


function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont("Georgia, serif");
  textAlign(CENTER, CENTER);
  textSize(26);
  background(0);
  // socket = io();
  socket.on("notes", onNotes);
  lastSwitch = millis();
  logoImg = loadImage("assets/logo.png");
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function onNotes(list) {
  const items = (list || [])
    .map((n) => `${n.city ? n.city + ": " : ""}${n.text || ""}`.trim())
    .filter((t) => t.length > 0);
  const texts = items.length > 0 ? items : ["memory", "river"];
  buildRiverPaths(texts);
  buildRainChars(texts);
  lastSwitch = millis();
  draining = false;
  rainDraining = false;
  drainStart = 0;
  rainDrainStart = 0;
  inPause = false;
  mode = "river";
}

function buildRiverPaths(texts) {
  riverPaths = texts.map((t, idx) => {
    const w = width;
    const h = height;
    const startX = random(-0.25 * w, -0.05 * w);
    const startY = random(h * 0.55, h * 0.9);
    const ctrl1X = random(w * 0.15, w * 0.4);
    const ctrl1Y = random(h * 0.15, h * 0.6);
    const ctrl2X = random(w * 0.55, w * 0.85);
    const ctrl2Y = random(h * 0.35, h * 0.8);
    const endX = random(w * 0.95, w * 1.2);
    const endY = random(h * 0.45, h * 0.85);
    const chars = [];
    const spacing = 1 / max(12, t.length + 6);
    for (let i = 0; i < t.length; i++) {
      chars.push({
        ch: t[i],
        t: i * spacing,
      });
    }
    return {
      text: t,
      chars,
      speed: random(0.001, 0.0035),
      wiggleAmp: random(18, 36),
      wiggleFreq: random(0.28, 0.55),
      bobAmp: random(10, 22),
      bobFreq: random(0.03, 0.08),
      swayAmp: random(12, 30),
      swayFreq: random(0.02, 0.05),
      smoothSwell: 0,
      smoothSway: 0,
      targetSwell: 0,
      targetSway: 0,
      nextTarget: 0,
      phase: random(TWO_PI),
      opacity: random(160, 255),
      thickness: random(0.8, 1.8),
      ctrl: {
        x0: startX,
        y0: startY,
        x1: ctrl1X,
        y1: ctrl1Y,
        x2: ctrl2X,
        y2: ctrl2Y,
        x3: endX,
        y3: endY,
      },
      noiseSeed: random(1000),
      curveAmp: random(30, 80),
      curveDir: random() > 0.5 ? 1 : -1,
      active: true,
    };
  });
}

function buildRainChars(texts) {
  rainChars = [];
  const combined = texts.join(" · ");
  for (let i = 0; i < combined.length; i++) {
    const ch = combined[i];
    if (!ch || ch === "\n" || ch === "\r") continue;
    rainChars.push({
      ch,
      x: random(width),
      y: random(-height, height),
      vy: random(1.2, 2.6),
      phase: random(TWO_PI),
    });
  }
}

function draw() {
  background(0);
  const now = millis();

  if (!inPause) {
    if (mode === "river" && !draining && now - lastSwitch > RIVER_DURATION) {
      draining = true;
      drainStart = now;
    }
    if (mode === "rain" && !rainDraining && now - lastSwitch > RAIN_DURATION) {
      rainDraining = true;
      rainDrainStart = now;
    }
  }

  if (inPause) {
    drawPause(now);
    if (now >= pauseUntil) {
      inPause = false;
      mode = nextMode || (mode === "river" ? "rain" : "river");
      lastSwitch = now;
      if (mode === "river") {
        draining = false;
        drainStart = 0;
      }
      if (mode === "rain") {
        rainDraining = false;
        rainDrainStart = 0;
        resetRainPositions();
      }
    }
    return;
  }

  if (mode === "river") {
    drawRiver(now);
  } else {
    drawRain(now);
  }
}

function resetRainPositions() {
  rainChars.forEach((c) => {
    c.x = random(width);
    c.y = random(-height, 0);
  });
}

function startPause(targetMode, showLogo, duration) {
  inPause = true;
  nextMode = targetMode;
  pauseShowLogo = showLogo;
  pauseStart = millis();
  pauseUntil = pauseStart + duration;
}

function bezierSample(ctrl, t) {
  const x = bezierPoint(ctrl.x0, ctrl.x1, ctrl.x2, ctrl.x3, t);
  const y = bezierPoint(ctrl.y0, ctrl.y1, ctrl.y2, ctrl.y3, t);
  return { x, y };
}

function drawRiver(now) {
  let allGone = true;
  const fadeFactor = draining
    ? constrain(1 - (now - drainStart) / 2200, 0, 1)
    : 1;
  riverPaths.forEach((p, idx) => {
    if (!p.active) return;
    const len = p.chars.length;
    if (now > p.nextTarget) {
      p.targetSwell = sin(now * 0.00015 + idx * 0.8) * random(18, 36);
      p.targetSway = sin(now * p.swayFreq + p.phase) * p.swayAmp;
      p.nextTarget = now + random(1200, 2600);
    }
    p.smoothSwell = lerp(p.smoothSwell, p.targetSwell, 0.03);
    p.smoothSway = lerp(p.smoothSway, p.targetSway, 0.03);
    const swell = p.smoothSwell;
    const sway = p.smoothSway;
    // guide line
    stroke(255, 80 * fadeFactor);
    strokeWeight(p.thickness);
    noFill();
    beginShape();
    for (let i = 0; i <= PATH_SAMPLES; i++) {
      const t = i / PATH_SAMPLES;
      const base = bezierSample(p.ctrl, t);
      const curve = p.curveDir * sin(t * PI * 1.4) * p.curveAmp;
      const w = p.wiggleAmp * 0.15;
      const y =
        base.y +
        curve +
        swell +
        sway +
        sin(now * 0.001 * p.wiggleFreq + t * TWO_PI + p.phase) * w;
      vertex(base.x, y);
    }
    endShape();

    let charsAlive = 0;
    for (let i = 0; i < len; i++) {
      const c = p.chars[i];
      c.t += p.speed;
      if (!draining && c.t > 1) c.t -= 1;
      if (draining && c.t > 1.1) continue;
      charsAlive++;
      const pt = bezierSample(p.ctrl, c.t);
      const wiggle =
        sin(now * 0.001 * p.wiggleFreq + c.t * TWO_PI + p.phase) * p.wiggleAmp;
      const curve = p.curveDir * sin(c.t * PI * 1.4) * p.curveAmp;
      const y =
        pt.y +
        curve +
        swell +
        sway +
        wiggle +
        (noise(p.noiseSeed + now * 0.0003 + c.t * 2) - 0.5) *
          p.wiggleAmp *
          0.25;
      fill(255, p.opacity * fadeFactor);
      noStroke();
      text(c.ch, pt.x, y);
    }
    if (draining && charsAlive === 0) {
      p.active = false;
    } else if (charsAlive > 0) {
      allGone = false;
    }
  });

  if (draining && allGone && !inPause) {
    startPause("rain", true, PAUSE_LONG);
  }
}

function drawRain(now) {
  const fadeFactor = rainDraining
    ? constrain(1 - (now - rainDrainStart) / 2000, 0, 1)
    : 1;
  let allGone = true;
  rainChars.forEach((c) => {
    c.y += c.vy;
    c.x += sin(frameCount * 0.02 + c.phase) * 0.3;
    if (!rainDraining && c.y > height + 20) {
      c.y = random(-height * 0.5, -20);
      c.x = random(width);
    }
    if (rainDraining && c.y > height + 40) {
      return;
    }
    allGone = false;
    fill(255, 255 * fadeFactor);
    noStroke();
    text(c.ch, c.x, c.y);
  });
  if (rainDraining && allGone && !inPause) {
    rainDraining = false;
    startPause("river", false, PAUSE_SHORT);
  }
}

function drawPause(now) {
  if (pauseShowLogo && logoImg) {
    const t = constrain((now - pauseStart) / (pauseUntil - pauseStart), 0, 1);
    const alpha = sin(PI * t);
    push();
    translate(width / 2, height / 2);
    tint(255, map(alpha, 0, 1, 0, 255));
    const maxW = width * 0.3;
    const maxH = height * 0.3;
    const ratio = min(maxW / logoImg.width, maxH / logoImg.height, 1);
    imageMode(CENTER);
    image(logoImg, 0, 0, logoImg.width * ratio, logoImg.height * ratio);
    pop();
  }
}
