const drawModule = (() => {
  let canvas = null;
  let ctx = null;
  let dpr = 1;
  let cssWidth = 0;
  let cssHeight = 0;
  let backgroundParticles = [];

  function init(target) {
    canvas =
      typeof target === "string" ? document.getElementById(target) : target;
    if (!canvas) {
      throw new Error("draw.init requires a canvas element or id");
    }
    ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    backgroundParticles = Array.from({ length: 36 }, () => ({
      x: Math.random(),
      y: Math.random(),
      radius: 0.6 + Math.random() * 1.4,
      drift: 0.015 + Math.random() * 0.035,
    }));
  }

  function resize(width, height) {
    if (!canvas || !ctx) return;
    cssWidth = width;
    cssHeight = height;
    dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.style.width = cssWidth + "px";
    canvas.style.height = cssHeight + "px";
    canvas.width = Math.floor(cssWidth * dpr);
    canvas.height = Math.floor(cssHeight * dpr);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
  }

  function drawDeepSeaBackground(time, deltaTime) {
    if (!ctx) return;
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1.0;
    const depthGrad = ctx.createLinearGradient(0, 0, 0, cssHeight);
    depthGrad.addColorStop(0, "#042043");
    depthGrad.addColorStop(0.45, "#02142d");
    depthGrad.addColorStop(1, "#010712");
    ctx.fillStyle = depthGrad;
    ctx.fillRect(0, 0, cssWidth, cssHeight);

    const topGlow = ctx.createRadialGradient(
      cssWidth / 2,
      -cssHeight * 0.25,
      cssWidth * 0.12,
      cssWidth / 2,
      -cssHeight * 0.25,
      cssWidth * 1.1
    );
    topGlow.addColorStop(0, "rgba(90,150,220,0.38)");
    topGlow.addColorStop(0.6, "rgba(30,70,140,0.22)");
    topGlow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = topGlow;
    ctx.fillRect(0, 0, cssWidth, cssHeight);

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    const rayCount = 4;
    for (let i = 0; i < rayCount; i++) {
      const phase = time * 0.00012 + i * 1.7;
      const centerX = cssWidth * (0.2 + 0.6 * ((Math.sin(phase) + 1) / 2));
      const spreadTop = cssWidth * 0.36;
      const spreadBottom = cssWidth * 0.16;
      const tilt = Math.sin(time * 0.00009 + i) * 0.07;
      ctx.save();
      ctx.translate(centerX, -cssHeight * 0.2);
      ctx.rotate(tilt);
      ctx.filter = "blur(24px)";
      ctx.beginPath();
      ctx.moveTo(-spreadTop, 0);
      ctx.lineTo(spreadTop, 0);
      ctx.lineTo(spreadBottom, cssHeight * 0.9);
      ctx.lineTo(-spreadBottom, cssHeight * 0.9);
      ctx.closePath();
      const rayGrad = ctx.createLinearGradient(0, 0, 0, cssHeight * 0.9);
      rayGrad.addColorStop(0, "rgba(140,210,255,0.16)");
      rayGrad.addColorStop(0.55, "rgba(70,140,220,0.08)");
      rayGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = rayGrad;
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    const driftFactor = deltaTime * 0.0015;
    backgroundParticles.forEach((p) => {
      p.y += p.drift * driftFactor;
      if (p.y > 1) {
        p.y -= 1;
        p.x = Math.random();
        p.radius = 0.6 + Math.random() * 1.4;
      }
      const px = p.x * cssWidth;
      const py = p.y * cssHeight;
      const size = p.radius * (0.85 + 0.25 * Math.sin(time * 0.001 + p.x * 6));
      const glow = ctx.createRadialGradient(px, py, 0, px, py, size * 6);
      glow.addColorStop(0, "rgba(170,220,255,0.14)");
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(px - size * 6, py - size * 6, size * 12, size * 12);
    });
    ctx.restore();
  }

  function hexToRgb(hex) {
    const h = hex.replace("#", "");
    const full =
      h.length === 3
        ? h
            .split("")
            .map((c) => c + c)
            .join("")
        : h;
    const bigint = parseInt(full, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return [r, g, b];
  }

  function seedBubbleStyle() {
    const hue = Math.floor(Math.random() * 360);
    return { hue };
  }

  function renderFrame(params) {
    if (!ctx) return;
    const {
      time = performance.now(),
      deltaTime = 16,
      gameState,
      users,
      trailParticles = [],
    } = params || {};

    drawDeepSeaBackground(time, deltaTime);
    ctx.globalCompositeOperation = "source-over";
    if (!gameState) return;

    const decay = deltaTime * 0.0015;
    for (let i = trailParticles.length - 1; i >= 0; i--) {
      const particle = trailParticles[i];
      particle.life -= decay;
      if (particle.life <= 0) {
        trailParticles.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = particle.life * 0.3;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    const groupSizeMap = {};
    if (gameState.groups) {
      gameState.groups.forEach((g) =>
        g.forEach((id) => {
          groupSizeMap[id] = g.length;
        })
      );
    }

    const ids = Object.keys(users || {});
    const hueClock = time * 0.0003;

    ids.forEach((id) => {
      const u = users[id];
      if (!u) return;

      const size = u.radius || 20;
      const isConnected = (groupSizeMap[id] || 1) > 1;

      const deform = u.edgeDeform || 0;
      const deformX = deform > 0 ? size * (1 - deform * 0.3) : size;
      const deformY = deform > 0 ? size * (1 - deform * 0.1) : size;

      const [rr, gg, bb] = hexToRgb(isConnected ? u.color : "#88aabb");
      const coreGrad = ctx.createRadialGradient(
        u.position.x,
        u.position.y,
        size * 0.1,
        u.position.x,
        u.position.y,
        size
      );
      coreGrad.addColorStop(0.0, `rgba(${rr},${gg},${bb},0.18)`);
      coreGrad.addColorStop(0.55, `rgba(${rr},${gg},${bb},0.12)`);
      coreGrad.addColorStop(0.9, `rgba(255,255,255,0.42)`);
      coreGrad.addColorStop(1.0, `rgba(255,255,255,0.00)`);
      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.ellipse(
        u.position.x,
        u.position.y,
        deformX,
        deformY,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();

      if (!u.style) u.style = seedBubbleStyle();
      const hueBase = (u.style.hue + hueClock * 30) % 360;
      const rim = ctx.createRadialGradient(
        u.position.x,
        u.position.y,
        size * 0.82,
        u.position.x,
        u.position.y,
        size * 1.06
      );
      rim.addColorStop(0.0, "rgba(0,0,0,0)");
      rim.addColorStop(0.8, "rgba(0,0,0,0)");
      rim.addColorStop(0.88, `hsla(${(hueBase + 0) % 360},85%,70%,0.28)`);
      rim.addColorStop(0.93, `hsla(${(hueBase + 45) % 360},85%,70%,0.34)`);
      rim.addColorStop(0.98, `hsla(${(hueBase + 90) % 360},85%,70%,0.20)`);
      rim.addColorStop(1.0, "rgba(255,255,255,0.0)");
      ctx.fillStyle = rim;
      ctx.beginPath();
      ctx.arc(u.position.x, u.position.y, size * 1.06, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.45;
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.beginPath();
      ctx.ellipse(
        u.position.x - size * 0.35,
        u.position.y - size * 0.35,
        size * 0.45,
        size * 0.25,
        -0.6,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.globalAlpha = 0.28;
      ctx.beginPath();
      ctx.arc(
        u.position.x + size * 0.25,
        u.position.y + size * 0.2,
        size * 0.12,
        0,
        Math.PI * 2
      );
      ctx.fill();

      ctx.globalCompositeOperation = "multiply";
      ctx.globalAlpha = 0.12;
      const shadowGrad = ctx.createRadialGradient(
        u.position.x + size * 0.15,
        u.position.y + size * 0.2,
        size * 0.2,
        u.position.x,
        u.position.y,
        size * 1.2
      );
      shadowGrad.addColorStop(0, "rgba(0,0,0,0.25)");
      shadowGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = shadowGrad;
      ctx.beginPath();
      ctx.arc(u.position.x, u.position.y, size * 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "screen";
    });

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = "source-over";
  }

  return {
    init,
    resize,
    render: renderFrame,
    renderFrame,
  };
})();

window.draw = drawModule;
