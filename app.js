function renderHomeDemo(dt) {
if (state.screen !== 'home') return;
if (!state.blocks.length || state.blocks.length < 5) {
const base = createBaseBlock();
base.y = state.height - clamp(state.height * 0.14, 90, 130);
const blocks = [base];
let y = base.y;
let x = base.x;
let width = base.w;
for (let i = 1; i < 7; i += 1) {
const h = 48 + (i % 2) * 8;
width = clamp(width + (i % 3 === 0 ? -10 : 7), 135, 230);
x = state.width / 2 - width / 2 + Math.sin(i * 1.8) * 11;
y -= h;
blocks.push({
x, y, w: width, h, floor: i, palette: buildingPalettes[i % buildingPalettes.length], type: 'settled',
settled: true, glow: 0, angle: Math.sin(i * 2.2) * 0.015, seed: i * 0.137, roofType: i % 4,
sign: i === 4 ? 'NOVA' : '', windowsLit: 0.66
});
}
state.blocks = blocks;
state.cameraY = 0;
state.targetCameraY = 0;
state.craneX = state.width * 0.72;
state.activeBlock = {
x: state.width * 0.72 - 72, y: 185, w: 144, h: 54, floor: 8,
palette: buildingPalettes[2], type: 'hanging', dropped: false, angle: 0,
ropeLength: 105, hookY: 70, swingAmp: 0.13, seed: 0.48, roofType: 2, sign: '', windowsLit: 0.7
};
}
state.time += dt;
for (const cloud of state.clouds) {
cloud.x += cloud.speed * dt * 0.7;
if (cloud.x - cloud.size * 2 > state.width) cloud.x = -cloud.size * 2;
}
state.cranePhase += dt * 1.2;
state.craneX = state.width * 0.5 + Math.sin(state.time * 0.48) * state.width * 0.25;
if (state.activeBlock) {
const block = state.activeBlock;
const swing = Math.sin(state.cranePhase) * block.swingAmp;
block.x = state.craneX + Math.sin(swing) * block.ropeLength - block.w / 2;
block.y = block.hookY + Math.cos(swing) * block.ropeLength;
block.angle = swing * 0.75;
}
state.towerLean = Math.sin(state.time * 0.7) * 0.32;
}
function frame(now) {
const rawDt = Math.min((now - state.lastTime) / 1000, 0.033);
state.lastTime = now;
if (state.screen === 'home') renderHomeDemo(rawDt);
else updateGame(rawDt);
drawGame();
requestAnimationFrame(frame);
}
async function shareScore() {
const text = `I stacked ${state.floors} floors and scored ${Math.round(state.score).toLocaleString()} in Skyline Stack. Can you beat it?`;
const shareData = { title: 'Skyline Stack', text, url: window.location.href };
try {
if (navigator.share) {
await navigator.share(shareData);
} else if (navigator.clipboard) {
await navigator.clipboard.writeText(`${text} ${window.location.href}`);
toast('Score copied');
} else {
toast('Share unavailable');
}
} catch (error) {
if (error?.name !== 'AbortError') toast('Could not share');
}
}
function bindEvents() {
document.getElementById('playButton').addEventListener('click', () => {
sound.ensure();
resetGame('classic');
});
document.getElementById('timeAttackButton').addEventListener('click', () => {
sound.ensure();
resetGame('time');
});
document.getElementById('howToButton').addEventListener('click', () => showOnlyScreen('howTo'));
document.getElementById('soundButton').addEventListener('click', toggleSound);
document.getElementById('pauseButton').addEventListener('click', pauseGame);
document.getElementById('resumeButton').addEventListener('click', resumeGame);
document.getElementById('restartFromPauseButton').addEventListener('click', () => resetGame(state.mode));
document.getElementById('quitButton').addEventListener('click', goHome);
document.getElementById('playAgainButton').addEventListener('click', () => resetGame(state.mode));
document.getElementById('menuButton').addEventListener('click', goHome);
document.getElementById('shareButton').addEventListener('click', shareScore);
ui.slowPower.addEventListener('pointerdown', useSlowTime);
ui.stabilizePower.addEventListener('pointerdown', useStabilizer);
document.querySelectorAll('[data-close]').forEach(button => {
button.addEventListener('click', () => {
const target = button.getAttribute('data-close');
document.getElementById(target)?.classList.remove('active');
showOnlyScreen('home');
});
});
canvas.addEventListener('pointerdown', handleDropInput, { passive: true });
document.addEventListener('keydown', event => {
if ((event.code === 'Space' || event.code === 'Enter') && state.running) {
event.preventDefault();
handleDropInput(event);
}
if (event.code === 'Escape') {
if (state.running) pauseGame();
else if (state.paused) resumeGame();
}
});
document.addEventListener('visibilitychange', () => {
if (document.hidden && state.running) pauseGame();
});
window.addEventListener('resize', resize, { passive: true });
window.addEventListener('orientationchange', () => setTimeout(resize, 180), { passive: true });
}
function registerServiceWorker() {
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
}
function init() {
resize();
bindEvents();
updateHomeStats();
state.blocks = [];
renderHomeDemo(0);
registerServiceWorker();
requestAnimationFrame(frame);
}
init();
