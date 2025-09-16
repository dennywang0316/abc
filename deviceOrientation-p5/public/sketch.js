let alpha = 0, beta = 0, gamma = 0;
let particles = [];
const NUM_PARTICLES = 200;

function setup() {
  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent("p5-canvas-container");
  
  for (let i = 0; i < NUM_PARTICLES; i++) {
    particles.push({ //meant to add a particle to the array
      x: random(width),
      y: random(height),
      vx: random(-1, 1),
      vy: random(-1, 1)
    });
  }
}

function draw() {
  background(0, 0, 0, 20); //half transparent background 
  
  // gravity
  let gx = map(gamma, -30, 30, -0.5, 0.5);
  let gy = map(beta, -30, 30, -0.5, 0.5);
  
//raindrops
  fill(255, 255, 255, 200);
  noStroke();
  
  for (let p of particles) {
   
    p.vx += gx;
    p.vy += gy;
    
    p.vx *= 0.98;
    p.vy *= 0.98;
    
    p.x += p.vx;
    p.y += p.vy;
    //out of bounds to revive
    if (p.x < 0 || p.x > width || p.y < 0 || p.y > height) {
      p.x = random(width);
      p.y = random(height);
      p.vx = random(-0.5, 0.5);
      p.vy = random(-0.5, 0.5);
    }
    
    ellipse(p.x, p.y, 3, 3); //raindrops
  }
  
  fill(255);
  textSize(14);
  text("beta: " + round(beta), 10, 25);
  text("gamma: " + round(gamma), 10, 45);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function handleOrientation(eventData) {
  document.querySelector('#requestOrientationButton').style.display = "none";
  
  alpha = eventData.alpha || 0;
  beta = eventData.beta || 0;
  gamma = eventData.gamma || 0;
}