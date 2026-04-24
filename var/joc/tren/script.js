const canvas = document.getElementById('canvas');
const ctx    = canvas.getContext('2d');

const W = 600, H = 400;
canvas.width  = W;
canvas.height = H;

const GROUND_Y   = H - 60;
const LANE_W     = W / 3;
const LANES      = [LANE_W * 0.5, LANE_W * 1.5, LANE_W * 2.5];
const TRAIN_W    = 64, TRAIN_H = 40;
const OBS_W      = 36, OBS_H = 36;
const JUMP_VEL   = -14;
const GRAVITY    = 0.7;

let state, train, obstacles, score, lives, speed, frameId, spawnTimer;

const keys = {};
document.addEventListener('keydown', e => {
  if (!keys[e.code]) {
    keys[e.code] = true;
    handleInput(e.code);
  }
});
document.addEventListener('keyup', e => { keys[e.code] = false; });

document.getElementById('start-btn').addEventListener('click', startGame);

function handleInput(code) {
  if (state !== 'playing') return;
  if ((code === 'ArrowLeft' || code === 'KeyA') && train.lane > 0) {
    train.lane--;
    train.targetX = LANES[train.lane];
  }
  if ((code === 'ArrowRight' || code === 'KeyD') && train.lane < 2) {
    train.lane++;
    train.targetX = LANES[train.lane];
  }
  if ((code === 'Space' || code === 'ArrowUp' || code === 'KeyW') && !train.jumping) {
    train.vy = JUMP_VEL;
    train.jumping = true;
  }
}

function startGame() {
  document.getElementById('overlay').classList.remove('visible');
  state      = 'playing';
  score      = 0;
  lives      = 3;
  speed      = 4;
  spawnTimer = 0;
  train = { lane: 1, x: LANES[1], targetX: LANES[1], y: GROUND_Y, vy: 0, jumping: false, flash: 0 };
  obstacles  = [];
  cancelAnimationFrame(frameId);
  loop();
}

function spawnObstacle() {
  const lane = Math.floor(Math.random() * 3);
  obstacles.push({ lane, x: LANES[lane], y: GROUND_Y + TRAIN_H * 0.5 - OBS_H, dead: false });
}

function update() {
  score++;
  if (score % 400 === 0) speed = Math.min(speed + 0.5, 14);

  // Train horizontal glide
  train.x += (train.targetX - train.x) * 0.22;

  // Jump physics
  if (train.jumping) {
    train.vy += GRAVITY;
    train.y  += train.vy;
    if (train.y >= GROUND_Y) {
      train.y       = GROUND_Y;
      train.vy      = 0;
      train.jumping = false;
    }
  }
  if (train.flash > 0) train.flash--;

  // Spawn
  spawnTimer--;
  if (spawnTimer <= 0) {
    spawnObstacle();
    spawnTimer = Math.max(40, 90 - speed * 4) + Math.random() * 30;
  }

  // Move & collide
  obstacles.forEach(o => {
    o.x -= speed;
    if (o.dead) return;
    const tx = train.x, ty = train.y - TRAIN_H * 0.5;
    const ox = o.x,     oy = o.y;
    const hit = Math.abs(tx - ox) < (TRAIN_W * 0.45 + OBS_W * 0.45)
             && Math.abs((ty + TRAIN_H * 0.5) - (oy + OBS_H * 0.5)) < (TRAIN_H * 0.45 + OBS_H * 0.45);
    if (hit && train.flash === 0) {
      o.dead    = true;
      lives--;
      train.flash = 90;
      if (lives <= 0) endGame();
    }
  });
  obstacles = obstacles.filter(o => o.x > -80);
}

function drawBackground() {
  // Sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  sky.addColorStop(0, '#0f0c29');
  sky.addColorStop(1, '#302b63');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, GROUND_Y);

  // Ground
  ctx.fillStyle = '#4a3728';
  ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);

  // Rails
  [LANE_W * 0.5, LANE_W * 1.5, LANE_W * 2.5].forEach(lx => {
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(lx - 10, GROUND_Y);
    ctx.lineTo(lx - 10, H);
    ctx.moveTo(lx + 10, GROUND_Y);
    ctx.lineTo(lx + 10, H);
    ctx.stroke();

    // Sleepers
    for (let sy = GROUND_Y; sy < H; sy += 20) {
      ctx.fillStyle = '#5c3d2e';
      ctx.fillRect(lx - 18, sy + 6, 36, 6);
    }
  });

  // Lane dividers
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.moveTo(LANE_W, 0); ctx.lineTo(LANE_W, H);
  ctx.moveTo(LANE_W * 2, 0); ctx.lineTo(LANE_W * 2, H);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawTrain() {
  const x = train.x;
  const top = train.y - TRAIN_H;

  if (train.flash > 0 && Math.floor(train.flash / 6) % 2 === 0) return;

  // Body
  ctx.fillStyle = '#e94560';
  ctx.beginPath();
  ctx.roundRect(x - TRAIN_W / 2, top, TRAIN_W, TRAIN_H, 6);
  ctx.fill();

  // Cab
  ctx.fillStyle = '#c73652';
  ctx.fillRect(x + TRAIN_W * 0.1, top - 12, TRAIN_W * 0.35, 14);

  // Windows
  ctx.fillStyle = '#aee8f5';
  ctx.fillRect(x + TRAIN_W * 0.12, top - 10, 14, 10);
  ctx.fillRect(x - TRAIN_W * 0.38, top + 4, 14, 10);

  // Wheels
  ctx.fillStyle = '#222';
  [x - 18, x + 2, x + 20].forEach(wx => {
    ctx.beginPath();
    ctx.arc(wx, train.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  // Chimney smoke
  if (!train.jumping) {
    ctx.fillStyle = 'rgba(200,200,200,0.4)';
    ctx.beginPath();
    ctx.arc(x + TRAIN_W * 0.22, top - 20, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + TRAIN_W * 0.3, top - 28, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawObstacles() {
  obstacles.forEach(o => {
    if (o.dead) return;
    // Boulder / rock obstacle
    ctx.fillStyle = '#7f8c8d';
    ctx.beginPath();
    ctx.roundRect(o.x - OBS_W / 2, o.y, OBS_W, OBS_H, 8);
    ctx.fill();
    ctx.fillStyle = '#95a5a6';
    ctx.beginPath();
    ctx.roundRect(o.x - OBS_W / 2 + 4, o.y + 4, OBS_W * 0.4, OBS_H * 0.3, 4);
    ctx.fill();
  });
}

function drawHUD() {
  document.getElementById('score-val').textContent = Math.floor(score / 10);
  document.getElementById('lives-val').textContent = lives;
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  drawBackground();
  drawObstacles();
  drawTrain();
  drawHUD();
}

function loop() {
  if (state !== 'playing') return;
  update();
  draw();
  frameId = requestAnimationFrame(loop);
}

function endGame() {
  state = 'over';
  cancelAnimationFrame(frameId);
  const ov = document.getElementById('overlay');
  ov.innerHTML = `
    <h1>💥 Game Over</h1>
    <p>Distanță parcursă: <strong>${Math.floor(score / 10)} m</strong></p>
    <button id="start-btn">ÎNCEARCĂ DIN NOU</button>
  `;
  ov.classList.add('visible');
  ov.querySelector('#start-btn').addEventListener('click', startGame);
}

// Initial draw
drawBackground();
