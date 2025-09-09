
let connections = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
}

function draw() {
  background(25, 25, 50);
  
  for (let connection of connections) {
    stroke(255, connection.alpha);
    strokeWeight(3);
    line(connection.x1, connection.y1, connection.x2, connection.y2);
  }
  
  if (touches.length === 0 && connections.length === 0) {
    fill(255);
    textAlign(CENTER, TOP);
    textSize(15);
    text("Touch with 2+ fingers to start drawing", width/2, 50);
  }
}

function touchStarted() {
  return false;
}

function touchMoved() {

  if (touches.length > 1) {
    for (let i = 0; i < touches.length - 1; i++) {
      let touch1 = touches[i];
      let touch2 = touches[i + 1];
      

      let alpha = 100 + (i * 20); 
      
      connections.push({
        x1: touch1.x,
        y1: touch1.y,
        x2: touch2.x,
        y2: touch2.y,
        alpha: alpha
      });
    }
  }
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

