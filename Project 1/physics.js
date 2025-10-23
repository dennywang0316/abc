const PHYSICS_PARAMS = {
  stickDistance: 120,
  linkGrowRate: 0.02,
  linkDecayRate: 0.01,
  oppositeDecay: 0.04,
  cohesionToCenter: 0.02,
  velocityAlign: 0.15,
  baseFriction: 0.96,
  groupExtraFriction: 0.03,
  maxSpeed: 10.0,
  stickMargin: 6,
  springK: 0.08,
  springDamping: 0.7,
  breakDot: -0.5,
  viscoRate: 0.12,
  staticFrictionTilt: 0.03,
  dynamicFriction: 0.94,
  dragQuadratic: 0.003,
};

function updateLinks(state) {
  const userIds = Object.keys(state.connectedUsers);
  for (let i = 0; i < userIds.length; i++) {
    for (let j = i + 1; j < userIds.length; j++) {
      const aId = userIds[i];
      const bId = userIds[j];
      const a = state.connectedUsers[aId];
      const b = state.connectedUsers[bId];

      const dx = a.position.x - b.position.x;
      const dy = a.position.y - b.position.y;
      const dist2 = dx * dx + dy * dy;
      const contact = a.radius + b.radius + PHYSICS_PARAMS.stickMargin;
      const key = aId < bId ? aId + "|" + bId : bId + "|" + aId;

      if (!state.links[key]) state.links[key] = { strength: 0 };
      const link = state.links[key];

      if (dist2 <= contact * contact) {
        link.strength = Math.min(
          1,
          link.strength + PHYSICS_PARAMS.linkGrowRate
        );
      } else {
        link.strength = Math.max(
          0,
          link.strength - PHYSICS_PARAMS.linkDecayRate
        );
      }

      const aSpeed = Math.hypot(a.velocity.x, a.velocity.y) || 0.0001;
      const bSpeed = Math.hypot(b.velocity.x, b.velocity.y) || 0.0001;
      const dot =
        (a.velocity.x * b.velocity.x + a.velocity.y * b.velocity.y) /
        (aSpeed * bSpeed);
      if (dot < PHYSICS_PARAMS.breakDot) {
        link.strength = Math.max(
          0,
          link.strength - PHYSICS_PARAMS.oppositeDecay
        );
      }

      if (link.strength === 0) delete state.links[key];
    }
  }
}

function computeGroups(state) {
  const userIds = Object.keys(state.connectedUsers);
  const adj = {};
  userIds.forEach((id) => (adj[id] = []));

  Object.keys(state.links).forEach((k) => {
    const link = state.links[k];
    if (link.strength >= 0.5) {
      const [a, b] = k.split("|");
      if (!adj[a] || !adj[b]) {
        delete state.links[k];
        return;
      }
      adj[a].push(b);
      adj[b].push(a);
    }
  });

  const visited = {};
  const groups = [];
  userIds.forEach((id) => {
    if (visited[id]) return;
    const queue = [id];
    visited[id] = true;
    const comp = [];
    while (queue.length) {
      const u = queue.shift();
      comp.push(u);
      adj[u].forEach((v) => {
        if (!visited[v]) {
          visited[v] = true;
          queue.push(v);
        }
      });
    }
    groups.push(comp);
  });

  state.groups = groups;
}

function applyGroupDynamics(state) {
  state.groups.forEach((g) => {
    if (g.length <= 1) return;

    let cx = 0,
      cy = 0,
      avx = 0,
      avy = 0,
      movers = 0;
    g.forEach((id) => {
      const u = state.connectedUsers[id];
      cx += u.position.x;
      cy += u.position.y;
      avx += u.velocity.x;
      avy += u.velocity.y;
      if (Math.hypot(u.velocity.x, u.velocity.y) > 0.2) movers++;
    });
    cx /= g.length;
    cy /= g.length;
    avx /= g.length;
    avy /= g.length;

    const extraF = PHYSICS_PARAMS.groupExtraFriction * (g.length - 1);
    const alignFactor = PHYSICS_PARAMS.velocityAlign;
    const cohesion = PHYSICS_PARAMS.cohesionToCenter;
    const moverBoost = 1 + Math.min(1, movers / g.length);

    g.forEach((id) => {
      const u = state.connectedUsers[id];
      u.velocity.x =
        u.velocity.x * (1 - alignFactor) + avx * alignFactor * moverBoost;
      u.velocity.y =
        u.velocity.y * (1 - alignFactor) + avy * alignFactor * moverBoost;
      u.velocity.x += (cx - u.position.x) * cohesion;
      u.velocity.y += (cy - u.position.y) * cohesion;

      const f = Math.max(0.8, PHYSICS_PARAMS.baseFriction - extraF);
      u.velocity.x *= f;
      u.velocity.y *= f;

      const spG = Math.hypot(u.velocity.x, u.velocity.y);
      if (spG > PHYSICS_PARAMS.maxSpeed) {
        const k = PHYSICS_PARAMS.maxSpeed / spG;
        u.velocity.x *= k;
        u.velocity.y *= k;
      }
    });
  });
}

function stepPhysics(state, userInputs, WORLD) {
  const w = WORLD.w;
  const h = WORLD.h;

  Object.keys(state.connectedUsers).forEach((id) => {
    const u = state.connectedUsers[id];
    const input = userInputs[id] || { tilt: { alpha: 0, beta: 0, gamma: 0 } };

    const toRad = Math.PI / 180;
    let ax = Math.sin((input.tilt.gamma || 0) * toRad);
    let ay = Math.sin((input.tilt.beta || 0) * toRad);

    if (Math.abs(ax) < PHYSICS_PARAMS.staticFrictionTilt) ax = 0;
    if (Math.abs(ay) < PHYSICS_PARAMS.staticFrictionTilt) ay = 0;

    const targetVx = ax * (PHYSICS_PARAMS.maxSpeed * 2.2);
    const targetVy = ay * (PHYSICS_PARAMS.maxSpeed * 2.2);

    u.velocity.x += (targetVx - u.velocity.x) * PHYSICS_PARAMS.viscoRate;
    u.velocity.y += (targetVy - u.velocity.y) * PHYSICS_PARAMS.viscoRate;

    u.velocity.x *= PHYSICS_PARAMS.dynamicFriction;
    u.velocity.y *= PHYSICS_PARAMS.dynamicFriction;
    const sp2 = u.velocity.x * u.velocity.x + u.velocity.y * u.velocity.y;
    u.velocity.x *= 1 - PHYSICS_PARAMS.dragQuadratic * sp2;
    u.velocity.y *= 1 - PHYSICS_PARAMS.dragQuadratic * sp2;

    const sp = Math.hypot(u.velocity.x, u.velocity.y);
    if (sp > PHYSICS_PARAMS.maxSpeed) {
      const k = PHYSICS_PARAMS.maxSpeed / sp;
      u.velocity.x *= k;
      u.velocity.y *= k;
    }

    u.position.x += u.velocity.x;
    u.position.y += u.velocity.y;

    const r = u.radius || 20;
    const margin = 5;

    if (u.position.x < r + margin) {
      const penetration = r + margin - u.position.x;
      u.position.x = r + margin;
      if (u.velocity.x < 0) {
        u.velocity.x = -u.velocity.x * 0.7;
        u.velocity.y *= 0.8;
      }
    } else if (u.position.x > w - r - margin) {
      const penetration = u.position.x - (w - r - margin);
      u.position.x = w - r - margin;
      if (u.velocity.x > 0) {
        u.velocity.x = -u.velocity.x * 0.7;
        u.velocity.y *= 0.8;
      }
    }

    if (u.position.y < r + margin) {
      const penetration = r + margin - u.position.y;
      u.position.y = r + margin;
      if (u.velocity.y < 0) {
        u.velocity.y = -u.velocity.y * 0.7;
        u.velocity.x *= 0.8;
      }
    } else if (u.position.y > h - r - margin) {
      const penetration = u.position.y - (h - r - margin);
      u.position.y = h - r - margin;
      if (u.velocity.y > 0) {
        u.velocity.y = -u.velocity.y * 0.7;
        u.velocity.x *= 0.8;
      }
    } else {
    }
  });
}

function updateState(state, userInputs, WORLD) {
  updateLinks(state);
  computeGroups(state);
  applyGroupDynamics(state);
  stepPhysics(state, userInputs, WORLD);
}

module.exports = {
  updateState,
};
