function createBaseBlock() {
const w = clamp(state.width * 0.45, 150, 240);
const h = 58;
return {
x: state.width / 2 - w / 2,
y: state.height - clamp(state.height * 0.15, 92, 142),
w,
h,
floor: 0,
palette: buildingPalettes[0],
type: 'base',
settled: true,
glow: 0,
leanOffset: 0,
seed: Math.random(),
roofType: 0,
sign: 'SKYLINE',
windowsLit: 0.7
};
}
function createActiveBlock() {
const top = state.blocks[state.blocks.length - 1];
const difficulty = Math.min(state.floors / 32, 1);
const widthVariation = randomRange(-12, 18) * (0.2 + difficulty);
const w = clamp(top.w + widthVariation, 112, 235);
const h = randomRange(49, 66);
const paletteIndex = Math.floor(state.floors / 4 + Math.random() * 2) % buildingPalettes.length;
const ropeLength = clamp(state.height * 0.17, 80, 145);
const hookY = clamp(state.height * 0.09, 46, 82);
const swingAmp = clamp(0.11 + difficulty * 0.13 + Math.abs(state.wind) * 0.018, 0.1, 0.34);
state.craneX = clamp(state.craneX || state.width * 0.2, 65, state.width - 65);
state.activeBlock = {
x: state.craneX - w / 2,
y: hookY + ropeLength,
w,
h,
floor: state.floors + 1,
palette: buildingPalettes[paletteIndex],
type: 'hanging',
settled: false,
dropped: false,
vy: 0,
vx: 0,
angle: 0,
angularVelocity: 0,
ropeLength,
hookY,
swingAmp,
seed: Math.random(),
roofType: Math.floor(Math.random() * 4),
sign: state.floors > 0 && state.floors % 8 === 0 ? ['HOTEL', 'SKY', 'METRO', 'NOVA'][Math.floor(Math.random() * 4)] : '',
windowsLit: randomRange(0.42, 0.82)
};
}
function resetGame(mode = 'classic') {
state.mode = mode;
state.running = false;
state.paused = false;
state.countdown = true;
state.over = false;
state.score = 0;
state.floors = 0;
state.lives = 3;
state.combo = 1;
state.bestCombo = 1;
state.perfects = 0;
state.consecutivePerfects = 0;
state.slowCount = 1;
state.stabilizeCount = 1;
state.slowTimer = 0;
state.stabilizeTimer = 0;
state.timeLeft = 60;
state.cameraY = 0;
state.targetCameraY = 0;
state.towerLean = 0;
state.targetLean = 0;
state.craneX = state.width * 0.18;
state.craneDirection = 1;
state.craneSpeed = 150;
state.cranePhase = 0;
state.wind = 0;
state.windTarget = 0;
state.windTimer = 0;
state.shake = 0;
state.flash = 0;
state.debris = [];
state.particles = [];
state.floaters = [];
state.blocks = [createBaseBlock()];
state.activeBlock = null;
state.modeEndReason = '';
updateHud();
startCountdown();
}
function startCountdown() {
showOnlyScreen('countdown');
ui.hud.classList.remove('hidden');
let count = 3;
ui.countdownValue.textContent = count;
const tick = () => {
if (!state.countdown) return;
if (count > 0) {
ui.countdownValue.textContent = count;
sound.tone(330 + (3 - count) * 70, 0.1, 'triangle', 0.18);
count -= 1;
setTimeout(tick, 650);
} else {
ui.countdownValue.textContent = 'GO';
sound.tone(620, 0.16, 'triangle', 0.25, 0, 930);
setTimeout(() => {
state.countdown = false;
state.running = true;
ui.countdown.classList.remove('active');
createActiveBlock();
updateHud();
}, 420);
}
};
tick();
}
function showOnlyScreen(name) {
const screens = [ui.home, ui.howTo, ui.pause, ui.countdown, ui.gameOver];
screens.forEach(el => el.classList.remove('active'));
if (name === 'home') ui.home.classList.add('active');
if (name === 'howTo') ui.howTo.classList.add('active');
if (name === 'pause') ui.pause.classList.add('active');
if (name === 'countdown') ui.countdown.classList.add('active');
if (name === 'gameOver') ui.gameOver.classList.add('active');
state.screen = name;
}
function goHome() {
state.running = false;
state.paused = false;
state.countdown = false;
state.over = false;
state.activeBlock = null;
ui.hud.classList.add('hidden');
updateHomeStats();
showOnlyScreen('home');
}
function pauseGame() {
if (!state.running || state.over || state.countdown) return;
state.paused = true;
state.running = false;
showOnlyScreen('pause');
sound.tap();
}
function resumeGame() {
if (!state.paused) return;
state.paused = false;
state.running = true;
ui.pause.classList.remove('active');
state.screen = 'game';
state.lastTime = performance.now();
sound.tap();
}
function updateHomeStats() {
ui.bestScoreHome.textContent = state.bestScore.toLocaleString();
ui.bestFloorsHome.textContent = state.bestFloors.toLocaleString();
ui.soundButton.textContent = `SOUND: ${state.soundEnabled ? 'ON' : 'OFF'}`;
}
function updateHud() {
ui.score.textContent = Math.round(state.score).toLocaleString();
ui.floors.textContent = state.mode === 'time' ? `${Math.ceil(state.timeLeft)}s` : state.floors.toString();
ui.combo.textContent = `x${state.combo}`;
ui.comboLabel.textContent = state.slowTimer > 0 ? 'SLOW TIME' : state.stabilizeTimer > 0 ? 'STABLE' : 'COMBO';
ui.lives.forEach((el, index) => el.classList.toggle('active', index < state.lives));
ui.slowCount.textContent = state.slowCount;
ui.stabilizeCount.textContent = state.stabilizeCount;
ui.slowPower.disabled = state.slowCount <= 0 || state.slowTimer > 0 || !state.running;
ui.stabilizePower.disabled = state.stabilizeCount <= 0 || state.stabilizeTimer > 0 || !state.running;
}
function toggleSound() {
state.soundEnabled = !state.soundEnabled;
localStorage.setItem(STORAGE_KEYS.sound, String(state.soundEnabled));
if (state.soundEnabled) sound.tap();
updateHomeStats();
toast(`Sound ${state.soundEnabled ? 'on' : 'off'}`);
}
function toast(message) {
ui.toast.textContent = message;
ui.toast.classList.add('show');
clearTimeout(toast.timer);
toast.timer = setTimeout(() => ui.toast.classList.remove('show'), 1200);
}
function useSlowTime(event) {
event?.stopPropagation();
if (!state.running || state.slowCount <= 0 || state.slowTimer > 0) return;
state.slowCount -= 1;
state.slowTimer = 5.5;
state.flash = 0.55;
state.flashColor = '85,230,255';
sound.power();
vibrate(20);
toast('Slow time activated');
updateHud();
}
function useStabilizer(event) {
event?.stopPropagation();
if (!state.running || state.stabilizeCount <= 0 || state.stabilizeTimer > 0) return;
state.stabilizeCount -= 1;
state.stabilizeTimer = 8;
state.targetLean *= 0.2;
state.towerLean *= 0.3;
state.flash = 0.55;
state.flashColor = '255,215,90';
sound.power();
vibrate([15, 20, 15]);
toast('Tower stabilized');
updateHud();
}
function handleDropInput(event) {
if (event && event.target instanceof HTMLElement && event.target.closest('button')) return;
if (!state.running || state.paused || state.countdown || state.over || !state.activeBlock || state.activeBlock.dropped) return;
dropBlock();
}
function dropBlock() {
const block = state.activeBlock;
if (!block || block.dropped) return;
block.dropped = true;
block.type = 'falling';
const swing = Math.sin(state.cranePhase) * block.swingAmp;
block.angle = swing;
block.angularVelocity = Math.cos(state.cranePhase) * 0.35;
block.vx = Math.cos(state.cranePhase) * block.swingAmp * 135 + state.wind * 7;
block.vy = 34;
sound.drop();
vibrate(9);
}
function updateGame(dt) {
state.time += dt;
updateAmbient(dt);
updateParticles(dt);
if (!state.running || state.paused || state.countdown || state.over) return;
if (state.mode === 'time') {
state.timeLeft = Math.max(0, state.timeLeft - dt);
if (state.timeLeft <= 0) {
state.modeEndReason = 'time';
endGame();
return;
}
}
if (state.slowTimer > 0) state.slowTimer = Math.max(0, state.slowTimer - dt);
if (state.stabilizeTimer > 0) state.stabilizeTimer = Math.max(0, state.stabilizeTimer - dt);
const timeScale = state.slowTimer > 0 ? 0.5 : 1;
const gameDt = dt * timeScale;
state.windTimer -= gameDt;
if (state.windTimer <= 0) {
state.windTimer = randomRange(3.2, 6.5);
const difficulty = Math.min(state.floors / 28, 1);
state.windTarget = randomRange(-1.8, 1.8) * difficulty;
}
state.wind = lerp(state.wind, state.windTarget, 0.015 * gameDt * 60);
const difficulty = Math.min(state.floors / 35, 1.3);
const baseSpeed = 145 + difficulty * 130;
state.craneSpeed = lerp(state.craneSpeed, baseSpeed, 0.025 * gameDt * 60);
state.cranePhase += gameDt * (1.75 + difficulty * 1.35);
state.craneX += state.craneDirection * state.craneSpeed * gameDt;
const edgePadding = clamp(state.width * 0.12, 48, 88);
if (state.craneX > state.width - edgePadding) {
state.craneX = state.width - edgePadding;
state.craneDirection = -1;
} else if (state.craneX < edgePadding) {
state.craneX = edgePadding;
state.craneDirection = 1;
}
if (state.activeBlock) updateActiveBlock(gameDt);
state.targetCameraY = calculateCameraTarget();
state.cameraY = lerp(state.cameraY, state.targetCameraY, 0.07 * dt * 60);
const naturalSway = Math.sin(state.time * (0.75 + state.floors * 0.012)) * Math.min(state.floors * 0.025, 1.2);
const stabilization = state.stabilizeTimer > 0 ? 0.12 : 1;
state.targetLean = lerp(state.targetLean, (state.targetLean + naturalSway * 0.025) * stabilization, 0.01 * dt * 60);
state.towerLean = lerp(state.towerLean, state.targetLean, 0.035 * dt * 60);
state.targetLean *= Math.pow(0.996, dt * 60);
state.shake *= Math.pow(0.82, dt * 60);
state.flash *= Math.pow(0.86, dt * 60);
updateHud();
}
function updateAmbient(dt) {
for (const cloud of state.clouds) {
cloud.x += cloud.speed * dt * (0.7 + state.wind * 0.06);
if (cloud.x - cloud.size * 2 > state.width) cloud.x = -cloud.size * 2;
}
state.musicTimer -= dt;
if (state.running && state.soundEnabled && state.musicTimer <= 0 && state.audioReady) {
state.musicTimer = 4.4;
const root = [130.81, 146.83, 164.81, 196][state.floors % 4];
sound.tone(root, 1.9, 'sine', 0.025, 0, root * 0.99);
sound.tone(root * 1.5, 1.3, 'triangle', 0.015, 0.3, root * 1.49);
}
}
function calculateCameraTarget() {
const top = state.blocks[state.blocks.length - 1];
if (!top) return 0;
const visibleTop = state.height * 0.39;
return Math.max(0, visibleTop - top.y);
}
function updateActiveBlock(dt) {
const block = state.activeBlock;
const top = state.blocks[state.blocks.length - 1];
if (!block.dropped) {
const swing = Math.sin(state.cranePhase) * block.swingAmp;
const ropeX = state.craneX + Math.sin(swing) * block.ropeLength;
const ropeY = block.hookY + Math.cos(swing) * block.ropeLength;
block.x = ropeX - block.w / 2;
block.y = ropeY;
block.angle = swing * 0.72;
return;
}
block.vy += 1180 * dt;
block.vx += state.wind * 13 * dt;
block.x += block.vx * dt;
block.y += block.vy * dt;
block.angularVelocity += (-block.angle * 2.4 - block.angularVelocity * 1.3) * dt;
block.angle += block.angularVelocity * dt;
const topSurface = top.y;
if (block.y + block.h >= topSurface && block.vy > 0) {
resolveLanding(block, top);
return;
}
if (block.y > state.height - state.cameraY + 180 || block.x + block.w < -120 || block.x > state.width + 120) {
missBlock(block);
}
}
function resolveLanding(block, top) {
const overlapLeft = Math.max(block.x, top.x);
const overlapRight = Math.min(block.x + block.w, top.x + top.w);
const overlap = overlapRight - overlapLeft;
const minRequired = Math.min(block.w, top.w) * 0.18;
if (overlap < minRequired) {
block.y = top.y - block.h;
missBlock(block);
return;
}
const blockCenter = block.x + block.w / 2;
const topCenter = top.x + top.w / 2;
const offset = blockCenter - topCenter;
const normalizedOffset = Math.abs(offset) / Math.max(1, Math.min(block.w, top.w) / 2);
const accuracy = clamp(1 - normalizedOffset, 0, 1);
const perfectThreshold = 0.085 + Math.min(state.combo * 0.003, 0.02);
const perfect = normalizedOffset <= perfectThreshold;
block.y = top.y - block.h;
block.vx = 0;
block.vy = 0;
block.angle = clamp(block.angle, -0.055, 0.055);
block.type = 'settled';
block.settled = true;
block.glow = perfect ? 1 : 0.25;
const trimLoss = perfect ? 0 : Math.max(0, Math.min(block.w * 0.11, Math.abs(offset) * 0.12));
block.w = Math.max(105, block.w - trimLoss);
block.x += offset > 0 ? trimLoss * 0.18 : trimLoss * 0.82;
const balanceForce = offset / Math.max(top.w, 1);
state.targetLean += balanceForce * (state.stabilizeTimer > 0 ? 0.09 : 0.46);
block.leanOffset = state.targetLean * (state.blocks.length / 14);
state.blocks.push(block);
state.activeBlock = null;
state.floors += 1;
let points;
if (perfect) {
state.combo = Math.min(12, state.combo + 1);
state.consecutivePerfects += 1;
state.perfects += 1;
state.bestCombo = Math.max(state.bestCombo, state.combo);
points = Math.round((180 + state.floors * 11) * state.combo);
spawnPerfectEffects(block, points);
sound.perfect(state.combo);
vibrate([10, 18, 12]);
state.flash = 0.34;
state.flashColor = '255,215,90';
if (state.consecutivePerfects > 0 && state.consecutivePerfects % 4 === 0) {
if ((state.consecutivePerfects / 4) % 2 === 0) state.stabilizeCount += 1;
else state.slowCount += 1;
toast('Power-up earned');
}
} else {
state.combo = Math.max(1, Math.floor(state.combo * 0.52));
state.consecutivePerfects = 0;
points = Math.round((70 + state.floors * 8) * (0.45 + accuracy * 0.7) * state.combo);
spawnLandingEffects(block, accuracy, points);
sound.land(accuracy);
vibrate(13);
}
state.score += points;
if (state.mode === 'time') state.timeLeft = Math.min(60, state.timeLeft + (perfect ? 1.25 : 0.35));
state.shake = perfect ? 2.2 : 4.8 * (1 - accuracy * 0.55);
state.craneSpeed += 3.5;
setTimeout(() => {
if (state.running && !state.over) createActiveBlock();
}, perfect ? 210 : 340);
}
function missBlock(block) {
if (!state.running || state.over) return;
state.activeBlock = null;
state.debris.push({
...block,
type: 'debris',
vx: block.vx || randomRange(-90, 90),
vy: Math.max(100, block.vy || 160),
angularVelocity: block.angularVelocity || randomRange(-2.4, 2.4),
life: 4
});
state.lives -= 1;
state.combo = 1;
state.consecutivePerfects = 0;
state.shake = 10;
state.flash = 0.48;
state.flashColor = '255,107,133';
sound.miss();
vibrate([28, 45, 35]);
spawnMissEffects(block);
updateHud();
if (state.lives <= 0) {
state.modeEndReason = 'lives';
setTimeout(endGame, 720);
} else {
toast(`${state.lives} ${state.lives === 1 ? 'life' : 'lives'} left`);
setTimeout(() => {
if (state.running && !state.over) createActiveBlock();
}, 700);
}
}
function spawnLandingEffects(block, accuracy, points) {
const centerX = block.x + block.w / 2;
const y = block.y + 4;
const count = Math.round(8 + accuracy * 12);
for (let i = 0; i < count; i += 1) {
state.particles.push({
x: centerX + randomRange(-block.w * 0.35, block.w * 0.35),
y,
vx: randomRange(-80, 80),
vy: randomRange(-120, -35),
gravity: 300,
size: randomRange(1.8, 4.2),
life: randomRange(0.35, 0.72),
maxLife: 0.72,
color: accuracy > 0.7 ? '#fff1a8' : '#e7f8ff',
shape: 'square'
});
}
addFloater(centerX, block.y - 15, `+${points}`, '#ffffff', 0.9);
if (accuracy > 0.72) addFloater(centerX, block.y - 43, 'GREAT', '#55e6ff', 0.82);
}
function spawnPerfectEffects(block, points) {
const centerX = block.x + block.w / 2;
const y = block.y + block.h * 0.25;
for (let i = 0; i < 28; i += 1) {
const angle = (i / 28) * TAU + randomRange(-0.12, 0.12);
const speed = randomRange(70, 190);
state.particles.push({
x: centerX,
y,
vx: Math.cos(angle) * speed,
vy: Math.sin(angle) * speed,
gravity: 170,
size: randomRange(2.4, 5.2),
life: randomRange(0.5, 1.05),
maxLife: 1.05,
color: i % 3 === 0 ? '#55e6ff' : '#ffd75a',
shape: i % 4 === 0 ? 'star' : 'square'
});
}
addFloater(centerX, block.y - 22, 'PERFECT!', '#ffd75a', 1.25);
addFloater(centerX, block.y - 55, `+${points}`, '#ffffff', 1.0);
}
function spawnMissEffects(block) {
const centerX = block.x + block.w / 2;
for (let i = 0; i < 18; i += 1) {
state.particles.push({
x: centerX + randomRange(-block.w * 0.4, block.w * 0.4),
y: block.y + block.h * 0.6,
vx: randomRange(-120, 120),
vy: randomRange(-140, 40),
gravity: 430,
size: randomRange(2, 5),
life: randomRange(0.45, 0.9),
maxLife: 0.9,
color: i % 2 ? '#ff6b85' : '#ffc06f',
shape: 'square'
});
}
addFloater(clamp(centerX, 65, state.width - 65), Math.min(block.y, state.height * 0.55), 'MISSED!', '#ff8297', 1.0);
}
function addFloater(x, y, text, color, life = 1) {
state.floaters.push({ x, y, text, color, life, maxLife: life, vy: -32, scale: 0.65 });
}
function updateParticles(dt) {
for (const p of state.particles) {
p.life -= dt;
p.vy += p.gravity * dt;
p.x += p.vx * dt;
p.y += p.vy * dt;
p.vx *= Math.pow(0.985, dt * 60);
}
state.particles = state.particles.filter(p => p.life > 0);
for (const f of state.floaters) {
f.life -= dt;
f.y += f.vy * dt;
f.scale = lerp(f.scale, 1, 0.15 * dt * 60);
}
state.floaters = state.floaters.filter(f => f.life > 0);
for (const d of state.debris) {
d.life -= dt;
d.vy += 1050 * dt;
d.x += d.vx * dt;
d.y += d.vy * dt;
d.angle += d.angularVelocity * dt;
}
state.debris = state.debris.filter(d => d.life > 0 && d.y < state.height + 450);
for (const b of state.blocks) b.glow = Math.max(0, (b.glow || 0) - dt * 1.8);
}
function endGame() {
if (state.over) return;
state.running = false;
state.over = true;
state.activeBlock = null;
sound.gameOver();
const previousBest = state.bestScore;
const isNewBest = state.score > state.bestScore;
state.bestScore = Math.max(state.bestScore, Math.round(state.score));
state.bestFloors = Math.max(state.bestFloors, state.floors);
localStorage.setItem(STORAGE_KEYS.bestScore, String(state.bestScore));
localStorage.setItem(STORAGE_KEYS.bestFloors, String(state.bestFloors));
localStorage.setItem(STORAGE_KEYS.played, 'true');
ui.finalScore.textContent = Math.round(state.score).toLocaleString();
ui.finalFloors.textContent = state.floors;
ui.finalCombo.textContent = `x${state.bestCombo}`;
ui.finalPerfects.textContent = state.perfects;
ui.newBest.classList.toggle('hidden', !isNewBest || state.score === 0);
if (state.modeEndReason === 'time') {
ui.resultEyebrow.textContent = 'TIME IS UP';
ui.resultTitle.textContent = state.floors >= 15 ? 'Lightning builder!' : 'Fast hands!';
} else if (state.floors >= 30) {
ui.resultEyebrow.textContent = 'MEGA TOWER';
ui.resultTitle.textContent = 'Skyline legend!';
} else if (state.floors >= 15) {
ui.resultEyebrow.textContent = 'TOWER COMPLETE';
ui.resultTitle.textContent = 'City icon!';
} else {
ui.resultEyebrow.textContent = 'TOWER COMPLETE';
ui.resultTitle.textContent = previousBest && state.score > previousBest ? 'Your best yet!' : 'Nice skyline!';
}
updateHomeStats();
setTimeout(() => showOnlyScreen('gameOver'), 500);
}
