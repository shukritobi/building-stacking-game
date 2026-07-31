'use strict';
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
const ui = {
hud: document.getElementById('hud'),
home: document.getElementById('homeScreen'),
howTo: document.getElementById('howToScreen'),
pause: document.getElementById('pauseScreen'),
countdown: document.getElementById('countdownScreen'),
gameOver: document.getElementById('gameOverScreen'),
countdownValue: document.getElementById('countdownValue'),
score: document.getElementById('scoreValue'),
floors: document.getElementById('floorsValue'),
combo: document.getElementById('comboValue'),
comboLabel: document.getElementById('comboLabel'),
lives: [document.getElementById('life1'), document.getElementById('life2'), document.getElementById('life3')],
slowCount: document.getElementById('slowCount'),
stabilizeCount: document.getElementById('stabilizeCount'),
slowPower: document.getElementById('slowPower'),
stabilizePower: document.getElementById('stabilizePower'),
bestScoreHome: document.getElementById('bestScoreHome'),
bestFloorsHome: document.getElementById('bestFloorsHome'),
finalScore: document.getElementById('finalScore'),
finalFloors: document.getElementById('finalFloors'),
finalCombo: document.getElementById('finalCombo'),
finalPerfects: document.getElementById('finalPerfects'),
resultEyebrow: document.getElementById('resultEyebrow'),
resultTitle: document.getElementById('resultTitle'),
newBest: document.getElementById('newBestBadge'),
soundButton: document.getElementById('soundButton'),
toast: document.getElementById('toast')
};
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
const TAU = Math.PI * 2;
const STORAGE_KEYS = {
bestScore: 'skylineStack.bestScore',
bestFloors: 'skylineStack.bestFloors',
sound: 'skylineStack.sound',
played: 'skylineStack.played'
};
const paletteSets = [
{ skyTop: '#081b45', skyBottom: '#22a8df', haze: '#a5f2ff', sun: '#fff1b2', cityFar: '#134a7f', cityNear: '#08284f' },
{ skyTop: '#241044', skyBottom: '#f06f8c', haze: '#ffd7cf', sun: '#ffd36f', cityFar: '#54275d', cityNear: '#231b45' },
{ skyTop: '#030818', skyBottom: '#143b76', haze: '#5f8bc7', sun: '#f5f2df', cityFar: '#102750', cityNear: '#06142d' },
{ skyTop: '#192143', skyBottom: '#e2a85d', haze: '#ffe5bd', sun: '#fff2c8', cityFar: '#475373', cityNear: '#202943' }
];
const buildingPalettes = [
{ body: '#f1b94f', side: '#bd7430', roof: '#ffe49a', frame: '#57381f', glass: '#6de7ff', trim: '#fff0bb' },
{ body: '#74c8d8', side: '#377695', roof: '#b9f4f7', frame: '#173654', glass: '#e7fbff', trim: '#f8ffff' },
{ body: '#e17b83', side: '#8f4058', roof: '#ffc1b7', frame: '#51243b', glass: '#8ee8ff', trim: '#ffe6da' },
{ body: '#b9a4e8', side: '#675a9e', roof: '#eee3ff', frame: '#3b315f', glass: '#8ee8ff', trim: '#fbf4ff' },
{ body: '#90c46b', side: '#4f7c48', roof: '#d3efa0', frame: '#2f4b30', glass: '#abecff', trim: '#efffdc' }
];
const state = {
screen: 'home',
mode: 'classic',
running: false,
paused: false,
countdown: false,
over: false,
time: 0,
lastTime: performance.now(),
width: 0,
height: 0,
dpr: 1,
score: 0,
floors: 0,
lives: 3,
combo: 1,
bestCombo: 1,
perfects: 0,
consecutivePerfects: 0,
slowCount: 0,
stabilizeCount: 0,
slowTimer: 0,
stabilizeTimer: 0,
timeLeft: 60,
shake: 0,
flash: 0,
flashColor: '255,255,255',
cameraY: 0,
targetCameraY: 0,
towerLean: 0,
targetLean: 0,
craneX: 0,
craneDirection: 1,
craneSpeed: 155,
cranePhase: 0,
wind: 0,
windTarget: 0,
windTimer: 0,
activeBlock: null,
blocks: [],
debris: [],
particles: [],
floaters: [],
clouds: [],
citySeed: [],
touchLocked: false,
soundEnabled: localStorage.getItem(STORAGE_KEYS.sound) !== 'false',
bestScore: Number(localStorage.getItem(STORAGE_KEYS.bestScore) || 0),
bestFloors: Number(localStorage.getItem(STORAGE_KEYS.bestFloors) || 0),
audioReady: false,
audioContext: null,
masterGain: null,
musicTimer: 0,
modeEndReason: ''
};
class SoundEngine {
ensure() {
if (!state.soundEnabled) return false;
if (!state.audioContext) {
const AudioCtx = window.AudioContext || window.webkitAudioContext;
if (!AudioCtx) return false;
state.audioContext = new AudioCtx();
state.masterGain = state.audioContext.createGain();
state.masterGain.gain.value = 0.15;
state.masterGain.connect(state.audioContext.destination);
}
if (state.audioContext.state === 'suspended') state.audioContext.resume().catch(() => {});
state.audioReady = true;
return true;
}
tone(freq, duration, type = 'sine', volume = 0.5, delay = 0, slideTo = null) {
if (!this.ensure()) return;
const now = state.audioContext.currentTime + delay;
const osc = state.audioContext.createOscillator();
const gain = state.audioContext.createGain();
osc.type = type;
osc.frequency.setValueAtTime(freq, now);
if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + duration);
gain.gain.setValueAtTime(0.0001, now);
gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), now + 0.012);
gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
osc.connect(gain);
gain.connect(state.masterGain);
osc.start(now);
osc.stop(now + duration + 0.04);
}
noise(duration = 0.12, volume = 0.2) {
if (!this.ensure()) return;
const rate = state.audioContext.sampleRate;
const buffer = state.audioContext.createBuffer(1, rate * duration, rate);
const data = buffer.getChannelData(0);
for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
const src = state.audioContext.createBufferSource();
const filter = state.audioContext.createBiquadFilter();
const gain = state.audioContext.createGain();
filter.type = 'lowpass';
filter.frequency.value = 900;
gain.gain.value = volume;
src.buffer = buffer;
src.connect(filter);
filter.connect(gain);
gain.connect(state.masterGain);
src.start();
}
tap() { this.tone(360, 0.055, 'triangle', 0.22, 0, 520); }
drop() { this.tone(260, 0.09, 'sine', 0.32, 0, 120); }
land(accuracy) {
this.noise(0.08, 0.12);
this.tone(120 + accuracy * 160, 0.12, 'triangle', 0.26, 0, 95);
}
perfect(combo) {
const root = 520 + Math.min(combo, 8) * 18;
this.tone(root, 0.12, 'triangle', 0.28);
this.tone(root * 1.25, 0.15, 'triangle', 0.22, 0.06);
this.tone(root * 1.5, 0.18, 'sine', 0.18, 0.12);
}
miss() {
this.tone(165, 0.28, 'sawtooth', 0.2, 0, 55);
this.noise(0.18, 0.18);
}
power() {
this.tone(440, 0.14, 'sine', 0.24, 0, 880);
this.tone(660, 0.18, 'triangle', 0.18, 0.08, 1320);
}
gameOver() {
this.tone(280, 0.22, 'triangle', 0.2, 0, 210);
this.tone(210, 0.3, 'triangle', 0.2, 0.18, 120);
}
}
const sound = new SoundEngine();
function vibrate(pattern) {
if ('vibrate' in navigator) navigator.vibrate(pattern);
}
function randomRange(min, max) {
return min + Math.random() * (max - min);
}
function roundedRectPath(context, x, y, w, h, r) {
const radius = Math.min(r, w / 2, h / 2);
context.beginPath();
context.moveTo(x + radius, y);
context.arcTo(x + w, y, x + w, y + h, radius);
context.arcTo(x + w, y + h, x, y + h, radius);
context.arcTo(x, y + h, x, y, radius);
context.arcTo(x, y, x + w, y, radius);
context.closePath();
}
function resize() {
const rect = canvas.getBoundingClientRect();
state.dpr = Math.min(window.devicePixelRatio || 1, 2.25);
state.width = Math.max(320, rect.width);
state.height = Math.max(480, rect.height);
canvas.width = Math.floor(state.width * state.dpr);
canvas.height = Math.floor(state.height * state.dpr);
ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
initializeBackground();
if (state.screen === 'home') {
state.blocks = [];
state.activeBlock = null;
} else if (state.blocks.length && !state.running) {
const base = state.blocks[0];
base.x = state.width / 2 - base.w / 2;
}
}
function initializeBackground() {
const cloudCount = clamp(Math.round(state.width / 120), 4, 11);
if (state.clouds.length !== cloudCount) {
state.clouds = Array.from({ length: cloudCount }, (_, i) => ({
x: (i / cloudCount) * state.width + randomRange(-50, 50),
y: randomRange(70, state.height * 0.55),
size: randomRange(28, 74),
speed: randomRange(3, 10),
alpha: randomRange(0.06, 0.18)
}));
}
const cityCount = Math.ceil(state.width / 35) + 8;
state.citySeed = Array.from({ length: cityCount }, (_, i) => ({
x: i * 35 - 70,
w: randomRange(28, 68),
h1: randomRange(55, 180),
h2: randomRange(95, 260),
antenna: Math.random() > 0.78,
windowSeed: Math.random()
}));
}
function getThemeProgress() {
if (!state.running && state.screen === 'home') return 0.05;
return (state.floors % 36) / 12;
}
function hexToRgb(hex) {
const value = parseInt(hex.slice(1), 16);
return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}
function mixColor(a, b, t) {
const ca = hexToRgb(a);
const cb = hexToRgb(b);
return `rgb(${Math.round(lerp(ca.r, cb.r, t))}, ${Math.round(lerp(ca.g, cb.g, t))}, ${Math.round(lerp(ca.b, cb.b, t))})`;
}
function currentPalette() {
const p = getThemeProgress();
const index = Math.floor(p) % paletteSets.length;
const next = (index + 1) % paletteSets.length;
const t = easeOutCubic(p - Math.floor(p));
const result = {};
for (const key of Object.keys(paletteSets[0])) result[key] = mixColor(paletteSets[index][key], paletteSets[next][key], t);
return result;
}
function drawBackground(dt) {
const palette = currentPalette();
const gradient = ctx.createLinearGradient(0, 0, 0, state.height);
gradient.addColorStop(0, palette.skyTop);
gradient.addColorStop(0.68, palette.skyBottom);
gradient.addColorStop(1, palette.haze);
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, state.width, state.height);
const dayPhase = (state.floors % 36) / 36;
const sunX = state.width * (0.12 + dayPhase * 0.76);
const sunY = state.height * (0.23 - Math.sin(dayPhase * Math.PI) * 0.13);
const sunRadius = clamp(state.width * 0.07, 24, 52);
const sunGlow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunRadius * 3.1);
sunGlow.addColorStop(0, 'rgba(255,245,190,0.58)');
sunGlow.addColorStop(0.25, 'rgba(255,233,150,0.18)');
sunGlow.addColorStop(1, 'rgba(255,230,160,0)');
ctx.fillStyle = sunGlow;
ctx.fillRect(sunX - sunRadius * 3.1, sunY - sunRadius * 3.1, sunRadius * 6.2, sunRadius * 6.2);
ctx.beginPath();
ctx.arc(sunX, sunY, sunRadius, 0, TAU);
ctx.fillStyle = palette.sun;
ctx.globalAlpha = 0.78;
ctx.fill();
ctx.globalAlpha = 1;
for (const cloud of state.clouds) drawCloud(cloud);
const horizon = state.height - clamp(state.height * 0.15, 70, 130);
drawCityLayer(state.citySeed, horizon, palette.cityFar, 0.42, state.cameraY * 0.04);
drawCityLayer(state.citySeed, horizon + 25, palette.cityNear, 0.72, state.cameraY * 0.08, true);
const haze = ctx.createLinearGradient(0, horizon - 110, 0, state.height);
haze.addColorStop(0, 'rgba(255,255,255,0)');
haze.addColorStop(1, 'rgba(220,248,255,0.16)');
ctx.fillStyle = haze;
ctx.fillRect(0, horizon - 110, state.width, state.height - horizon + 110);
}
function drawCloud(cloud) {
ctx.save();
ctx.globalAlpha = cloud.alpha;
ctx.fillStyle = '#ffffff';
ctx.beginPath();
ctx.ellipse(cloud.x, cloud.y, cloud.size * 0.74, cloud.size * 0.28, 0, 0, TAU);
ctx.ellipse(cloud.x - cloud.size * 0.38, cloud.y + 3, cloud.size * 0.48, cloud.size * 0.22, 0, 0, TAU);
ctx.ellipse(cloud.x + cloud.size * 0.38, cloud.y + 2, cloud.size * 0.52, cloud.size * 0.24, 0, 0, TAU);
ctx.fill();
ctx.restore();
}
function drawCityLayer(seed, horizon, color, scale, parallax, windows = false) {
ctx.save();
ctx.translate(0, parallax);
ctx.fillStyle = color;
for (let i = 0; i < seed.length; i += 1) {
const b = seed[i];
const x = b.x - ((state.time * (windows ? 1.5 : 0.7)) % 35);
const w = b.w * scale;
const h = (windows ? b.h2 : b.h1) * scale;
ctx.fillRect(x, horizon - h, w, h + 10);
if (b.antenna) {
ctx.fillRect(x + w * 0.52, horizon - h - 18 * scale, 2, 18 * scale);
}
if (windows && w > 18) {
const cols = Math.max(1, Math.floor(w / 14));
const rows = Math.max(2, Math.floor(h / 19));
for (let row = 0; row < rows; row += 1) {
for (let col = 0; col < cols; col += 1) {
const on = ((row * 7 + col * 11 + Math.floor(b.windowSeed * 19)) % 5) < 2;
if (!on) continue;
ctx.fillStyle = 'rgba(255,225,130,0.18)';
ctx.fillRect(x + 5 + col * 13, horizon - h + 8 + row * 18, 4, 7);
ctx.fillStyle = color;
}
}
}
}
ctx.restore();
}
