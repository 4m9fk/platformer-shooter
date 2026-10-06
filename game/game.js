// Walking demo: ←/→ or A/D to walk, ↑/W to jump, Space to shoot. Sprites and anchors come from tools/build_sprites.py.
const SPRITE_DIR = "../generated/sprites/png";
const W = 960, H = 540;
const GROUND_Y = 450;        // screen y of the ground line
const HERO_SCALE = 0.42;     // PNG cell (512 px tall) -> screen
const WALK_SPEED = 190;      // px/s
const BOLT_SPEED = 900;      // px/s
const JUMP_SPEED = 900;      // px/s, initial upward speed
const GRAVITY = 2400;        // px/s²
const CROUCH_TIME = 0.08;    // s on the anticipation frame before take-off
const LAND_TIME = 0.12;      // s on the landing frame
const BOLT_FRAME = 2;        // shoot frame on which the projectile leaves the drawn muzzle flash
const CRATE = 68;            // crate size; crates come in stacks so they reach the blaster height

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const meta = window.SPRITES;

// ---------- assets ----------
const images = {};
function loadSprites() {
  const jobs = [];
  for (const [name, { frames }] of Object.entries(meta.animations)) {
    images[name] = [];
    for (let i = 0; i < frames; i++) {
      const img = new Image();
      jobs.push(new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error(`missing sprite ${img.src}`));
      }));
      img.src = `${SPRITE_DIR}/${name}/frame_${i}.png`;
      images[name].push(img);
    }
  }
  return Promise.all(jobs);
}

// ---------- input ----------
const keys = new Set();
addEventListener("keydown", (e) => {
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space"].includes(e.code)) e.preventDefault();
  if (e.code === "Space" && !e.repeat) hero.wantShoot = true;
  if ((e.code === "ArrowUp" || e.code === "KeyW") && !e.repeat) hero.wantJump = true;
  keys.add(e.code);
});
addEventListener("keyup", (e) => keys.delete(e.code));
addEventListener("blur", () => keys.clear());

// ---------- world ----------
const hero = { x: 0, y: 0, vy: 0, facing: "right", state: "idle", anim: "idle", t: 0, jumpPhase: "",
               wantShoot: false, wantJump: false, boltFired: false }; // y: height above the ground, up is positive
const bolts = [];
const sparks = [];
const crates = [];
for (let i = 1; i <= 30; i++) crates.push({ x: i * 520 + (i % 3) * 90, stack: 2 + (i % 2), alive: true, respawn: 0 });
let cameraX = 0;

function frameIndex(anim, t) {
  const { frames, fps } = meta.animations[`${anim}_right`];
  return Math.floor(t * fps) % frames;
}

function update(dt) {
  const left = keys.has("ArrowLeft") || keys.has("KeyA");
  const right = keys.has("ArrowRight") || keys.has("KeyD");
  const dir = right - left;

  if (hero.state === "jump") {
    updateJump(dt, dir);
  } else if (hero.state === "shoot") {
    hero.t += dt;
    const { frames, fps } = meta.animations.shoot_right;
    const f = Math.floor(hero.t * fps);
    if (f >= BOLT_FRAME && !hero.boltFired) {
      hero.boltFired = true;
      fireBolt();
    }
    if (f >= frames) Object.assign(hero, { state: "idle", anim: "idle", t: 0 });
  } else if (hero.wantJump) {
    Object.assign(hero, { state: "jump", anim: "jump", t: 0, jumpPhase: "crouch" });
  } else if (hero.wantShoot) {
    Object.assign(hero, { state: "shoot", anim: "shoot", t: 0, boltFired: false });
  } else if (dir !== 0) {
    if (hero.state !== "walk") Object.assign(hero, { state: "walk", anim: "walk", t: 0 });
    hero.facing = dir > 0 ? "right" : "left";
    hero.x += dir * WALK_SPEED * dt;
    hero.t += dt;
  } else {
    if (hero.state !== "idle") Object.assign(hero, { state: "idle", anim: "idle", t: 0 });
    hero.t += dt;
  }
  hero.wantShoot = false;
  hero.wantJump = false;

  for (const b of bolts) {
    b.x += b.vx * dt;
    b.life -= dt;
    for (const c of crates) {
      if (c.alive && Math.abs(b.x - c.x) < CRATE / 2 && b.y > GROUND_Y - c.stack * CRATE) {
        c.alive = false;
        c.respawn = 4;
        b.life = 0;
        burst(c.x, b.y);
      }
    }
  }
  removeDead(bolts);
  for (const s of sparks) {
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.vy += 900 * dt;
    s.life -= dt;
  }
  removeDead(sparks);
  for (const c of crates) if (!c.alive && (c.respawn -= dt) <= 0) c.alive = true;

  cameraX += (hero.x - cameraX) * Math.min(1, dt * 5);
}

function updateJump(dt, dir) {
  hero.t += dt;
  if (dir !== 0) {
    hero.facing = dir > 0 ? "right" : "left";
    if (hero.jumpPhase !== "land") hero.x += dir * WALK_SPEED * dt;
  }
  if (hero.jumpPhase === "crouch" && hero.t >= CROUCH_TIME) {
    Object.assign(hero, { jumpPhase: "air", vy: JUMP_SPEED, t: 0 });
  } else if (hero.jumpPhase === "air") {
    hero.vy -= GRAVITY * dt;
    hero.y += hero.vy * dt;
    if (hero.y <= 0) Object.assign(hero, { jumpPhase: "land", y: 0, vy: 0, t: 0 });
  } else if (hero.jumpPhase === "land" && hero.t >= LAND_TIME) {
    Object.assign(hero, { state: "idle", anim: "idle", t: 0 });
  }
}

// Jump sheet: 0 crouch, 1 take-off, 2 rising, 3 apex, 4 falling, 5 landing. Airborne frames follow vertical speed.
function jumpFrame() {
  if (hero.jumpPhase === "crouch") return 0;
  if (hero.jumpPhase === "land") return 5;
  const k = hero.vy / JUMP_SPEED;
  return k > 0.55 ? 1 : k > 0.15 ? 2 : k > -0.25 ? 3 : 4;
}

function removeDead(list) {
  for (let i = list.length - 1; i >= 0; i--) if (list[i].life <= 0) list.splice(i, 1);
}

function fireBolt() {
  const sign = hero.facing === "right" ? 1 : -1;
  const mx = (meta.muzzle.x - meta.anchor.x) * HERO_SCALE;
  const my = (meta.muzzle.y - meta.anchor.y) * HERO_SCALE;
  bolts.push({ x: hero.x + sign * mx, y: GROUND_Y + my, vx: sign * BOLT_SPEED, life: 1.2 });
}

function burst(x, y) {
  for (let i = 0; i < 18; i++) {
    const a = Math.random() * Math.PI * 2, v = 150 + Math.random() * 300;
    sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 200, life: 0.6 + Math.random() * 0.4,
                  color: i % 3 ? "#b07a3c" : "#7a4f22" });
  }
}

// ---------- render ----------
const toScreen = (worldX, parallax = 1) => worldX - cameraX * parallax + W / 2;

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  sky.addColorStop(0, "#7ec8f0");
  sky.addColorStop(1, "#d7f0ff");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, GROUND_Y);

  drawHills(0.2, 300, 70, "#a9d7a0", 0.004);
  drawHills(0.45, 360, 50, "#7fbf6e", 0.007);
  drawClouds();

  ctx.fillStyle = "#6aa84f";
  ctx.fillRect(0, GROUND_Y, W, 14);
  ctx.fillStyle = "#8b5a2b";
  ctx.fillRect(0, GROUND_Y + 14, W, H - GROUND_Y - 14);
  ctx.fillStyle = "#7a4e25";
  const tile = 64, off = ((cameraX % tile) + tile) % tile;
  for (let x = -off; x < W; x += tile) {
    ctx.fillRect(x, GROUND_Y + 14, 3, H);
    ctx.fillRect(x + tile / 2, GROUND_Y + 50, 3, H);
  }
  ctx.fillRect(0, GROUND_Y + 48, W, 3);
}

function drawHills(parallax, baseY, amp, color, freq) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  for (let x = 0; x <= W; x += 8) {
    const wx = x + cameraX * parallax;
    ctx.lineTo(x, baseY - amp * (0.6 * Math.sin(wx * freq) + 0.4 * Math.sin(wx * freq * 2.3 + 1)));
  }
  ctx.lineTo(W, GROUND_Y);
  ctx.fill();
}

function drawClouds() {
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  for (let i = 0; i < 6; i++) {
    const span = W + 400;
    const x = ((((i * 397 - cameraX * 0.1) % span) + span) % span) - 200;
    const y = 60 + (i * 53) % 120;
    for (const [dx, dy, r] of [[0, 0, 26], [28, -10, 32], [58, 0, 24]]) {
      ctx.beginPath();
      ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawCrates() {
  for (const c of crates) {
    if (!c.alive) continue;
    const x = toScreen(c.x) - CRATE / 2;
    if (x < -80 || x > W + 80) continue;
    ctx.fillStyle = "#c48a45";
    ctx.strokeStyle = "#3a2618";
    ctx.lineWidth = 5;
    for (let k = 1; k <= c.stack; k++) {
      const y = GROUND_Y - k * CRATE;
      ctx.fillRect(x, y, CRATE, CRATE);
      ctx.strokeRect(x, y, CRATE, CRATE);
      ctx.beginPath();
      ctx.moveTo(x + 6, y + 6); ctx.lineTo(x + CRATE - 6, y + CRATE - 6);
      ctx.moveTo(x + CRATE - 6, y + 6); ctx.lineTo(x + 6, y + CRATE - 6);
      ctx.stroke();
    }
  }
}

function drawHero() {
  let anim, frame;
  if (hero.state === "jump") {
    anim = "jump";
    frame = jumpFrame();
  } else if (hero.state === "idle") {
    anim = "idle";
    frame = frameIndex("idle", hero.t);
  } else if (hero.state === "shoot") {
    anim = "shoot";
    frame = Math.min(Math.floor(hero.t * meta.animations.shoot_right.fps), meta.animations.shoot_right.frames - 1);
  } else {
    anim = "walk";
    frame = frameIndex("walk", hero.t);
  }
  const img = images[`${anim}_${hero.facing}`][frame];
  const ax = hero.facing === "right" ? meta.anchor.x : meta.cell.w - meta.anchor.x;
  const sx = toScreen(hero.x);

  const shadow = 1 / (1 + hero.y / 150);
  ctx.fillStyle = `rgba(0,0,0,${0.18 * shadow})`;
  ctx.beginPath();
  ctx.ellipse(sx, GROUND_Y + 2, 70 * shadow, 10 * shadow, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.drawImage(img, sx - ax * HERO_SCALE, GROUND_Y - hero.y - meta.anchor.y * HERO_SCALE,
                meta.cell.w * HERO_SCALE, meta.cell.h * HERO_SCALE);
}

function drawBolts() {
  for (const b of bolts) {
    const x = toScreen(b.x);
    const g = ctx.createLinearGradient(x - 30 * Math.sign(b.vx), 0, x, 0);
    g.addColorStop(0, "rgba(80,190,255,0)");
    g.addColorStop(1, "rgba(160,230,255,1)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x - 12 * Math.sign(b.vx), b.y, 26, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(x, b.y, 8, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSparks() {
  for (const s of sparks) {
    ctx.globalAlpha = Math.max(0, Math.min(1, s.life * 2));
    ctx.fillStyle = s.color;
    ctx.fillRect(toScreen(s.x) - 5, s.y - 5, 10, 10);
  }
  ctx.globalAlpha = 1;
}

function drawHud() {
  ctx.fillStyle = "rgba(20,25,40,0.55)";
  ctx.fillRect(16, 16, 440, 34);
  ctx.fillStyle = "#fff";
  ctx.font = "16px system-ui, sans-serif";
  ctx.fillText("← → / A D — идти     ↑ / W — прыжок     Пробел — стрелять", 28, 39);
}

function render() {
  drawBackground();
  drawCrates();
  drawHero();
  drawBolts();
  drawSparks();
  drawHud();
}

// ---------- loop ----------
let last = 0;
function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000 || 0);
  last = now;
  update(dt);
  render();
  requestAnimationFrame(tick);
}

loadSprites().then(() => requestAnimationFrame(tick)).catch((err) => {
  ctx.fillStyle = "#fff";
  ctx.font = "18px system-ui, sans-serif";
  ctx.fillText("Не удалось загрузить спрайты — запустите tools/build_sprites.py", 40, 60);
  console.error(err);
});
