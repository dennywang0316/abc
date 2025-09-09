// GLOBAL VARIABLES
let circles = [];
let ambientCircles = [];
let currentTheme = 'cool';
let themeTimer = 0;

// COLOR THEMES
const themes = {
  cool: [[100, 150, 255], [120, 200, 255], [80, 255, 200]],
  warm: [[255, 150, 100], [255, 200, 120], [255, 180, 150]],
  mixed: [[255, 150, 200], [150, 255, 150], [200, 150, 255]]
};

// ===========================================
// FUNCTION GROUP 1: COLOR MANAGEMENT
// ===========================================
function getRandomColor() {
  let colorArray = themes[currentTheme]; //to let it always starts with cool theme
  let colorChoice = random(colorArray); //to randomnize the color choice
  return color(colorChoice[0], colorChoice[1], colorChoice[2]);
}

function switchTheme() {
  let themeNames = Object.keys(themes); //to get the theme names
  currentTheme = random(themeNames); 
  console.log("切换到主题:", currentTheme);
}

// ===========================================
// FUNCTION GROUP 2: CIRCLE CREATION AND MANAGEMENT
// ===========================================
function createTouchCircle(x, y) {
  return {
    x: x,
    y: y,
    size: random(20, 60),
    color: getRandomColor(),
    alpha: 255,
    life: 400,  // 增加生命值，让圆圈存在更久
    active: true,
    time: 0,
    energy: 1.0  // 新增能量值，控制过渡 to control the transition
  };
}

function createBackgroundCircle() {
  return {
    x: random(width),
    y: random(height),
    size: random(30, 80),
    color: getRandomColor(),
    alpha: random(30, 60),
    time: random(1000),
    speed: random(0.01, 0.03)
  };
}

function updateCircle(circle, isTouch = false) {
  circle.time += 0.05;
  
  if (isTouch) {
    if (circle.active) {
      // 触摸时：能量充满，但更温和的闪烁
      circle.energy = min(1.0, circle.energy + 0.08);
      circle.alpha = 200 + sin(circle.time * 4) * 35 * circle.energy;
      circle.displaySize = circle.size + sin(circle.time * 2.5) * 8 * circle.energy;
    } else {
      // 触摸结束：能量逐渐衰减，过渡到平静状态
      circle.energy = max(0, circle.energy - 0.025);  // 更慢的能量衰减
      
      // 分阶段的透明度控制
      if (circle.life > 100) {
        // 第一阶段：保持相对明亮，非常轻微的颤动
        let gentleFlicker = sin(circle.time * 0.8) * (8 * circle.energy);
        circle.alpha = 160 + gentleFlicker;
        circle.life -= 0.8;  // 很慢的生命衰减
      } else {
        // 第二阶段：开始渐隐消失
        let lifeRatio = circle.life / 100;  // 0到1的比例
        circle.alpha = 160 * lifeRatio + sin(circle.time * 0.5) * (5 * lifeRatio);
        circle.life -= 1.2;  // 稍快的衰减
      }
      
      // 极其轻微的大小变化，几乎感觉不到
      let gentleBreath = sin(circle.time * 0.6) * (1.5 + circle.energy * 2);
      circle.displaySize = circle.size + gentleBreath;
    }
  } else {
    // 背景圆圈漂浮
    circle.x += sin(circle.time * circle.speed) * 0.5;
    circle.y += cos(circle.time * circle.speed * 0.7) * 0.3;
    circle.displaySize = circle.size + sin(circle.time * 0.1) * 8;
  }
}

// ===========================================
// 函数组 3: TOUCH HANDLING
// ===========================================
function handleTouch() {
  // 如果有触摸
  if (touches.length > 0) {
    for (let touch of touches) {
      // 每隔几帧创建新圆圈
      if (frameCount % 5 === 0) {
        circles.push(createTouchCircle(touch.x, touch.y));
      }
      
      // 激活附近圆圈
      for (let circle of circles) {
        let distance = dist(touch.x, touch.y, circle.x, circle.y);
                 if (distance < 100) {
           circle.active = true;
           circle.life = max(circle.life, 300);  // 重新激活时恢复更多生命值
         }
      }
    }
  } else {
    // 没有触摸时停用所有圆圈
    for (let circle of circles) {
      circle.active = false;
    }
  }
}

// ===========================================
// 函数组 4: DRAWING AND VISUAL EFFECTS
// ===========================================
function drawCircle(circle, withGlow = false) {
  let size = circle.displaySize || circle.size;
  
  push();
  
  // 光晕效果
  if (withGlow && circle.active) {
    for (let i = 3; i > 0; i--) {
      fill(red(circle.color), green(circle.color), blue(circle.color), circle.alpha / (i * 4));
      noStroke();
      ellipse(circle.x, circle.y, size + i * 15);
    }
  }
  
  // 主圆圈
  fill(red(circle.color), green(circle.color), blue(circle.color), circle.alpha);
  noStroke();
  ellipse(circle.x, circle.y, size);
  
  // 简单纹理
  if (circle.alpha > 50) {
    drawTexture(circle.x, circle.y, size, circle.alpha);
  }
  
  pop();
}

function drawTexture(x, y, size, alpha) {
  for (let i = 0; i < size * 0.2; i++) {
    let angle = random(TWO_PI);
    let radius = random(size/2);
    let tx = x + cos(angle) * radius;
    let ty = y + sin(angle) * radius;
    
    fill(255, 255, 255, alpha * 0.3);
    noStroke();
    ellipse(tx, ty, random(1, 3));
  }
}

// ===========================================
// 函数组 5: MAIN LOOP
// ===========================================
function gameLoop() {
  background(255);
  
  // 主题切换（每15秒）
  themeTimer++;
  if (themeTimer > 900) {
    switchTheme();
    themeTimer = 0;
    
    // 更新背景圆圈颜色
    for (let bg of ambientCircles) {
      bg.color = getRandomColor();
    }
  }
  
  // 更新和绘制背景圆圈
  for (let bg of ambientCircles) {
    updateCircle(bg, false);
    drawCircle(bg, false);
  }
  
  // 更新和绘制触摸圆圈
  for (let i = circles.length - 1; i >= 0; i--) {
    let circle = circles[i];
    updateCircle(circle, true);
    drawCircle(circle, true);
    
    // 移除死亡圆圈
    if (circle.life <= 0 || circle.alpha <= 0) {
      circles.splice(i, 1);
    }
  }
  

}

// ===========================================
// P5.js MAIN FUNCTIONS
// ===========================================
function setup() {
  createCanvas(windowWidth, windowHeight);
  
    // 创建背景圆圈
  for (let i = 0; i < 5; i++) {
    ambientCircles.push(createBackgroundCircle());
  }
  
  console.log("Canvas 创建成功，尺寸:", width, "x", height);
}

function draw() {
  handleTouch();
  gameLoop();
}

// TOUCH EVENTS   
function touchStarted() {
  console.log("触摸开始，触摸点数量:", touches.length);
  return false;
}

function touchMoved() {
  return false;
}

function touchEnded() {
  console.log("触摸结束");
  return false;
}

// 鼠标事件（用于桌面测试）
function mousePressed() {
  circles.push(createTouchCircle(mouseX, mouseY));
  console.log("鼠标点击，创建圆圈");
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  
  // 重新创建背景圆圈
  ambientCircles = [];
  for (let i = 0; i < 5; i++) {
    ambientCircles.push(createBackgroundCircle());
  }
}

