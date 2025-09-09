// 全局变量：图片、位置、速度、大小、是否在抖、上一帧是否被触到
let img;                 // 蚊子图片
let x, y;                // 蚊子当前位置
let vx, vy;              // 蚊子当前速度
let sz = 64;             // 蚊子显示大小（像素）
let shaking = false;     // 是否抖动（被触到时）
let lastTouching = false;// 上一帧是否被触到（用于判断“刚松手”）

function preload() {
  // 预加载蚊子图片（放在 assets/mosquito.png）
  img = loadImage("assets/mosquito.png", () => {}, () => {
    img = null; // 如果加载失败，后面会用圆形占位
  });
}

function setup() {
  // 画布大小＝窗口大小，并放进页面中的容器
  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent("p5-canvas-container");

  imageMode(CENTER);     // 图片以中心点绘制
  textAlign(CENTER, TOP);// 文字居中、顶部对齐
  textSize(24);          // 文字大小

  // 随机初始位置
  x = random(width);
  y = random(height);

  // 初始速度：慢慢动
  let ang = random(TWO_PI);
  vx = cos(ang) * 1.0;   // 每帧移动的像素
  vy = sin(ang) * 1.0;
}

function draw() {
  // 背景：白色
  background(255);

  // 顶部提示文字
  fill(0);
  noStroke();
  text("come catch me", width / 2, 12);

  // 是否被触到（手指或鼠标按住且靠近蚊子）
  let touching = isTouching();

  // 如果被触到：开始抖动，并尽量往远离触点的方向加速一点
  if (touching) {
    shaking = true;
    let tp = getTouchPoint();     // 取到一个触点（或鼠标）
    if (tp) {
      // 计算“从触点指向蚊子”的方向（即远离触点）
      let dx = x - tp.x;
      let dy = y - tp.y;
      let len = max(1, sqrt(dx*dx + dy*dy)); // 防止除以0
      dx /= len;
      dy /= len;

      // 给速度一点点“逃离分量”（不突兀，慢慢转向）
      vx = vx * 0.9 + dx * 2.5 * 0.1; // 2.5是“逃跑速度”的目标值
      vy = vy * 0.9 + dy * 2.5 * 0.1;
    }
  } else {
    // 没被触到：不抖；如果上一帧还在触，这一帧刚松手 → 瞬移到随机位置
    if (lastTouching && !touching) {
      x = random(width);
      y = random(height);
    }
    shaking = false;

    // 正常慢慢逛：每隔一段时间，换一个慢速方向（更简单直观）
    if (frameCount % 60 === 0) { // 大约每1秒换一次方向（60fps时）
      let ang = random(TWO_PI);
      vx = cos(ang) * 1.0;
      vy = sin(ang) * 1.0;
    }
  }

  // 更新位置
  x += vx;
  y += vy;

  // 碰到边缘就反弹，并把位置卡回画面里
  if (x < sz/2 || x > width  - sz/2) { vx *= -1; x = constrain(x, sz/2, width  - sz/2); }
  if (y < sz/2 || y > height - sz/2) { vy *= -1; y = constrain(y, sz/2, height - sz/2); }

  // 画蚊子：被触到时给一点随机抖动（视觉上“颤动”）
  let dx = 0, dy = 0, rot = 0;
  if (shaking) {
    dx = random(-3, 3);
    dy = random(-3, 3);
    rot = radians(random(-8, 8));
  }

  push();
  translate(x + dx, y + dy);
  rotate(rot);

  if (img) {
    image(img, 0, 0, sz, sz);
  } else {
    // 如果没有图片，用圆形占位
    fill(0);
    circle(0, 0, sz * 0.9);
  }
  pop();

  // 记录本帧的触碰状态，供下一帧判断“刚松手”
  lastTouching = touching;
}

// 触摸/鼠标开始：逻辑已在 draw 中处理，这里无需代码
function touchStarted() {
  console.log("touches");
}

function touchEnded() {}

function windowResized(){
  // 窗口变化时，画布也跟着变化
  resizeCanvas(windowWidth, windowHeight);
  // 把蚊子位置卡回画面里，防止出界
  x = constrain(x, sz/2, width  - sz/2);
  y = constrain(y, sz/2, height - sz/2);
}

// 是否碰到蚊子（简单：半径检测）
function isTouching() {
  let r = sz * 0.55; // 触碰判定半径
  // 移动端：有 touches 时，任意触点离蚊子足够近就算碰到
  if (touches && touches.length > 0) {
    for (let t of touches) {
      if (dist(t.x, t.y, x, y) <= r) return true;
    }
    return false;
  }
  // 桌面端：鼠标按下时，鼠标离蚊子足够近就算碰到
  if (mouseIsPressed) {
    return dist(mouseX, mouseY, x, y) <= r;
  }
  return false;
}

// 获取一个“触点”（移动端取第一个手指；桌面端取鼠标位置）
function getTouchPoint() {
  if (touches && touches.length > 0) {
    return { x: touches[0].x, y: touches[0].y };
  }
  if (mouseIsPressed) {
    return { x: mouseX, y: mouseY };
  }
  return null;
}
