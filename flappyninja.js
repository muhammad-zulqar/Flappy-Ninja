const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");
const overlay = document.querySelector("#gameOverlay");
const startButton = document.querySelector("#startButton");
const pauseButton = document.querySelector("#pauseButton");
const soundButton = document.querySelector("#soundButton");
const scoreEl = document.querySelector("#score");
const bestScoreEl = document.querySelector("#bestScore");
const comboEl = document.querySelector("#combo");
const scoreProgress = document.querySelector("#scoreProgress");
const rankProgress = document.querySelector("#rankProgress");
const rankName = document.querySelector("#rankName");
const rankHint = document.querySelector("#rankHint");
const windValue = document.querySelector("#windValue");
const overlayTitle = document.querySelector("#overlayTitle");
const overlayText = document.querySelector("#overlayText");
const overlayEyebrow = document.querySelector("#overlayEyebrow");
const overlayIcon = document.querySelector("#overlayIcon");
const W = canvas.width, H = canvas.height, GROUND = 612;
let state = "ready", score = 0, level = 1;
let best = Number(localStorage.getItem("flappyNinjaBest") || 0);
let lastTime = 0, spawnTimer = 0, worldTime = 0, muted = false, audioCtx;
let ninja, obstacles = [], particles = [], clouds = [];
const ranks = [{ name: "ROOKIE", next: 5 }, { name: "SHADOW", next: 15 }, { name: "BLADE", next: 30 }, { name: "LEGEND", next: 60 }];
bestScoreEl.textContent = best;
for (let i = 0; i < 13; i++) clouds.push({ x: Math.random() * W, y: 80 + Math.random() * 250, s: .6 + Math.random() * 1.2, speed: 5 + Math.random() * 11 });
function reset() {
  ninja = { x: 155, y: GROUND - 54, vy: 0, jump: 0, run: 0, grounded: true };
  obstacles = []; particles = []; score = 0; level = 1; spawnTimer = .9; worldTime = 0; updateHud();
}
function start() { reset(); state = "playing"; overlay.classList.add("hidden"); jump(); }
function jump() {
  if (state === "ready" || state === "over") return start();
  if (state === "paused") return togglePause();
  if (state !== "playing" || !ninja.grounded) return;
  ninja.vy = -585; ninja.grounded = false; ninja.jump = 1; burst(ninja.x - 12, GROUND - 5, "#51e4ff", 6); beep(340, .04);
}
function togglePause() {
  if (state === "playing") { state = "paused"; showOverlay("MISSION PAUSED", "The city waits. Your run is still alive.", "Ⅱ", "Resume run"); }
  else if (state === "paused") { state = "playing"; overlay.classList.add("hidden"); }
}
function gameOver(impossible = false) {
  state = "over"; best = Math.max(best, score); localStorage.setItem("flappyNinjaBest", best); bestScoreEl.textContent = best;
  burst(ninja.x, ninja.y, "#ff6eb4", 28); beep(100, .2);
  showOverlay(impossible ? "IMPOSSIBLE LEVEL" : "RUN COMPLETE", impossible ? "No ninja has cleared Level 10 yet. You reached the final challenge." : `You survived ${score} obstacle${score === 1 ? "" : "s"}.`, "✦", "Run again");
}
function showOverlay(eyebrow, text, icon, button) {
  overlayEyebrow.textContent = eyebrow; overlayTitle.textContent = level >= 10 ? "The final gauntlet." : score ? `Level ${level} cleared.` : "Run the rooftops.";
  overlayText.textContent = text; overlayIcon.textContent = icon; startButton.innerHTML = `${button} <span>→</span>`; overlay.classList.remove("hidden");
}
function updateHud() {
  scoreEl.textContent = score; comboEl.textContent = `x${Math.min(9, 1 + Math.floor(score / 5))}`;
  const rank = ranks.find((r) => score < r.next) || ranks.at(-1), previous = ranks[ranks.indexOf(rank) - 1]?.next || 0;
  rankName.textContent = rank.name; rankProgress.style.width = `${Math.min(100, ((score - previous) / (rank.next - previous)) * 100)}%`;
  rankHint.textContent = score >= 60 ? "Maximum rank achieved" : `${Math.max(0, rank.next - score)} points to ${rank.name === "ROOKIE" ? "Shadow" : ranks[ranks.indexOf(rank) + 1].name}`;
  scoreProgress.style.width = `${Math.min(100, (score % 10) * 10 + 5)}%`;
  document.querySelector(".mission-panel .mission-line strong").textContent = `LEVEL ${level}`;
}
function addObstacle() {
  const finalLevel = level >= 10;
  const width = finalLevel ? 42 + Math.random() * 25 : 30 + Math.random() * 28;
  const height = finalLevel ? 72 + Math.random() * 35 : 35 + Math.random() * 48;
  obstacles.push({ x: W + 30, width, height, type: Math.random() > .55 ? "spikes" : "barrel", scored: false });
  if (finalLevel && Math.random() > .45) obstacles.push({ x: W + 150, width: 42, height: 110, type: "spikes", scored: false });
}
function burst(x, y, color, count) { for (let i = 0; i < count; i++) particles.push({ x, y, vx: (Math.random() - .5) * 180, vy: (Math.random() - .8) * 180, life: .35 + Math.random() * .3, color, size: 2 + Math.random() * 4 }); }
function beep(freq, duration) {
  if (muted) return;
  audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
  const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.frequency.value = freq; o.type = "sine";
  g.gain.setValueAtTime(.035, audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(.001, audioCtx.currentTime + duration);
  o.connect(g).connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + duration);
}
function update(dt) {
  clouds.forEach(c => { c.x -= c.speed * dt; if (c.x < -100) c.x = W + 40; });
  if (state !== "playing") return;
  worldTime += dt; ninja.run += dt * (8 + level * .4); ninja.jump = Math.max(0, ninja.jump - dt * 5);
  const speed = 230 + Math.min(210, (level - 1) * 20), interval = Math.max(.46, 1.05 - level * .055);
  spawnTimer += dt;
  if (spawnTimer > interval) { addObstacle(); spawnTimer = 0; }
  ninja.vy += 1500 * dt; ninja.y += ninja.vy * dt;
  if (ninja.y >= GROUND - 54) { ninja.y = GROUND - 54; ninja.vy = 0; ninja.grounded = true; }
  obstacles.forEach(o => {
    o.x -= speed * dt;
    if (!o.scored && o.x + o.width < ninja.x - 24) { o.scored = true; score++; const nextLevel = Math.floor(score / 5) + 1; if (nextLevel > level) { level = nextLevel; burst(ninja.x, ninja.y, "#a777ff", 20); beep(700, .1); } updateHud(); }
  });
  obstacles = obstacles.filter(o => o.x > -100);
  const nx = ninja.x - 20, ny = ninja.y - 46, nw = 40, nh = 47;
  if (obstacles.some(o => nx < o.x + o.width && nx + nw > o.x && ny + nh > GROUND - o.height + 5)) gameOver(level >= 10);
  particles.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 240 * dt; p.life -= dt; });
  particles = particles.filter(p => p.life > 0);
  windValue.textContent = level >= 8 ? "CROSSWIND" : level >= 4 ? "LIGHT" : "CALM";
}
function draw() {
  const gradient = ctx.createLinearGradient(0, 0, 0, H); gradient.addColorStop(0, level >= 10 ? "#311531" : "#111b43"); gradient.addColorStop(1, "#080d23");
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#2d3670"; ctx.globalAlpha = .25;
  for (let i = 0; i < 18; i++) { const x = (i * 73) % W, h = 70 + (i * 43) % 170; ctx.fillRect(x, GROUND - h, 45, h); }
  ctx.globalAlpha = 1; clouds.forEach(c => { ctx.fillStyle = "#7184d8"; ctx.globalAlpha = .08; ctx.beginPath(); ctx.arc(c.x, c.y, 26 * c.s, 0, Math.PI * 2); ctx.arc(c.x + 26 * c.s, c.y + 5, 18 * c.s, 0, Math.PI * 2); ctx.fill(); }); ctx.globalAlpha = 1;
  ctx.fillStyle = "#0a1028"; ctx.fillRect(0, GROUND, W, H - GROUND); ctx.strokeStyle = "#51e4ff"; ctx.globalAlpha = .18; ctx.lineWidth = 2;
  for (let x = -((worldTime * 90) % 80); x < W; x += 80) ctx.strokeRect(x, GROUND + 24, 45, 2); ctx.globalAlpha = 1;
  obstacles.forEach(drawObstacle); particles.forEach(p => { ctx.globalAlpha = Math.max(0, p.life * 2); ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.size, p.size); }); ctx.globalAlpha = 1;
  if (ninja) drawNinja();
  ctx.fillStyle = "#dce7ff"; ctx.font = "700 12px DM Sans"; ctx.fillText(`LEVEL ${level}${level >= 10 ? " • IMPOSSIBLE" : ""}`, 24, 34);
}
function drawObstacle(o) {
  const y = GROUND - o.height, grd = ctx.createLinearGradient(o.x, y, o.x + o.width, GROUND); grd.addColorStop(0, "#ff6eb4"); grd.addColorStop(1, "#823d9e");
  if (o.type === "spikes") { ctx.fillStyle = grd; ctx.beginPath(); for (let x = o.x; x <= o.x + o.width; x += 14) { ctx.lineTo(x, GROUND); ctx.lineTo(x + 7, y); ctx.lineTo(x + 14, GROUND); } ctx.fill(); }
  else { ctx.fillStyle = grd; ctx.fillRect(o.x, y + 7, o.width, o.height - 7); ctx.fillStyle = "#ffc2e4"; ctx.fillRect(o.x + 5, y + 15, o.width - 10, 4); ctx.fillStyle = "#301b57"; ctx.fillRect(o.x + 7, y + 27, o.width - 14, 8); }
  ctx.fillStyle = "#ffb8df"; ctx.fillRect(o.x - 4, y, o.width + 8, 5);
}
function drawNinja() {
  const bob = ninja.grounded ? Math.abs(Math.sin(ninja.run)) * 3 : 0, leg = ninja.grounded ? Math.sin(ninja.run) * 10 : 0;
  ctx.save(); ctx.translate(ninja.x, ninja.y + bob);
  ctx.globalAlpha = .22; ctx.fillStyle = "#ff6eb4"; ctx.beginPath(); ctx.ellipse(0, 3, 37, 48, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
  ctx.strokeStyle = "#10162f"; ctx.lineWidth = 9; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-7, 12); ctx.lineTo(-14 + leg, 48); ctx.moveTo(7, 12); ctx.lineTo(15 - leg, 48); ctx.stroke();
  ctx.fillStyle = "#161d3d"; ctx.beginPath(); ctx.roundRect(-15, -20, 30, 39, 9); ctx.fill();
  ctx.strokeStyle = "#ff6eb4"; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-12, -9); ctx.lineTo(-28, 8 + leg * .3); ctx.moveTo(12, -9); ctx.lineTo(29, -1 - leg * .3); ctx.stroke();
  ctx.fillStyle = "#0c122a"; ctx.beginPath(); ctx.arc(0, -31, 16, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#51e4ff"; ctx.fillRect(-15, -35, 30, 7); ctx.fillStyle = "#fff"; ctx.fillRect(4, -33, 5, 3);
  ctx.strokeStyle = "#ff6eb4"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-12, -42); ctx.lineTo(-31, -52); ctx.lineTo(-22, -37); ctx.stroke(); ctx.restore();
}
function loop(time) { const dt = Math.min(.035, (time - lastTime) / 1000 || 0); lastTime = time; update(dt); draw(); requestAnimationFrame(loop); }
startButton.addEventListener("click", () => state === "paused" ? togglePause() : start());
pauseButton.addEventListener("click", togglePause);
soundButton.addEventListener("click", () => { muted = !muted; soundButton.textContent = muted ? "×" : "◉"; });
canvas.addEventListener("pointerdown", jump);
document.addEventListener("keydown", e => { if (e.code === "Space" || e.code === "ArrowUp") { e.preventDefault(); jump(); } if (e.key.toLowerCase() === "p") togglePause(); if (e.key.toLowerCase() === "r") start(); });
reset(); requestAnimationFrame(loop);