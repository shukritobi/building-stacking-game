'use strict';

/* Skyline Stack v2 gameplay upgrades */
const V2_SAVE_KEY = 'skylineStack.activeGame.v2';
const V2_COOKIE = 'skylineStackResume';
const V2_MAX_AGE = 60 * 60 * 24 * 7;
const continueButton = document.getElementById('continueButton');

function v2CraneMetrics() {
  const boomY = clamp(state.height * 0.13, 112, 148) + 30;
  return { boomY, hookY: boomY + 10, ropeLength: clamp(state.height * 0.145, 92, 132) };
}

function v2PaletteIndex(block) {
  const found = buildingPalettes.indexOf(block.palette);
  return found < 0 ? 0 : found;
}

function v2SetCookie() {
  document.cookie = `${V2_COOKIE}=1; Max-Age=${V2_MAX_AGE}; Path=/; SameSite=Lax`;
}

function v2ClearCookie() {
  document.cookie = `${V2_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
}

function v2ClearSave() {
  localStorage.removeItem(V2_SAVE_KEY);
  v2ClearCookie();
  v2UpdateContinue();
}

function v2ReadSave() {
  const raw = localStorage.getItem(V2_SAVE_KEY);
  if (!raw) return null;
  try {
    const save = JSON.parse(raw);
    const valid = save.version === 2 && Array.isArray(save.blocks) && save.blocks.length && save.lives > 0 && Date.now() - save.savedAt < V2_MAX_AGE * 1000;
    if (!valid) {
      localStorage.removeItem(V2_SAVE_KEY);
      v2ClearCookie();
      return null;
    }
    v2SetCookie();
    return save;
  } catch (error) {
    localStorage.removeItem(V2_SAVE_KEY);
    v2ClearCookie();
    return null;
  }
}

function v2SaveGame() {
  if ((!state.running && !state.paused && !state.countdown) || state.over || !state.blocks.length || state.screen === 'home') return;
  const blocks = state.blocks.map(block => ({
    x: block.x, y: block.y, w: block.w, h: block.h, floor: block.floor,
    type: block.type, settled: true, glow: block.glow || 0, angle: block.angle || 0,
    seed: block.seed, roofType: block.roofType || 0, sign: block.sign || '',
    windowsLit: block.windowsLit, paletteIndex: v2PaletteIndex(block)
  }));
  const save = {
    version: 2, savedAt: Date.now(), viewport: { width: state.width, height: state.height },
    mode: state.mode, score: state.score, floors: state.floors, lives: state.lives,
    combo: state.combo, bestCombo: state.bestCombo, perfects: state.perfects,
    consecutivePerfects: state.consecutivePerfects, slowCount: state.slowCount,
    stabilizeCount: state.stabilizeCount, slowTimer: state.slowTimer,
    stabilizeTimer: state.stabilizeTimer, timeLeft: state.timeLeft,
    wobbleAngle: state.v2WobbleAngle || 0, wobbleVelocity: state.v2WobbleVelocity || 0,
    craneX: state.craneX, craneDirection: state.craneDirection, cranePhase: state.cranePhase,
    wind: state.wind, windTarget: state.windTarget, blocks
  };
  try {
    localStorage.setItem(V2_SAVE_KEY, JSON.stringify(save));
    v2SetCookie();
    v2UpdateContinue(save);
  } catch (error) {
    console.warn('Unable to save tower', error);
  }
}

function v2UpdateContinue(existingSave) {
  if (!continueButton) return;
  const save = existingSave || v2ReadSave();
  if (save) {
    continueButton.style.display = '';
    continueButton.textContent = `CONTINUE FLOOR ${save.floors}`;
  } else {
    continueButton.style.display = 'none';
  }
}

function v2RestoreGame() {
  const save = v2ReadSave();
  if (!save) {
    toast('No saved tower found');
    v2UpdateContinue();
    return;
  }
  sound.ensure();
  const oldWidth = Math.max(1, save.viewport?.width || state.width);
  const oldHeight = Math.max(1, save.viewport?.height || state.height);
  const scale = clamp(state.width / oldWidth, 0.72, 1.4);
  const bottomShift = state.height - oldHeight * scale;
  state.mode = save.mode === 'time' ? 'time' : 'classic';
  state.score = Number(save.score) || 0;
  state.floors = Number(save.floors) || 0;
  state.lives = clamp(Number(save.lives) || 3, 1, 3);
  state.combo = clamp(Number(save.combo) || 1, 1, 12);
  state.bestCombo = clamp(Number(save.bestCombo) || 1, 1, 12);
  state.perfects = Number(save.perfects) || 0;
  state.consecutivePerfects = Number(save.consecutivePerfects) || 0;
  state.slowCount = Number(save.slowCount) || 0;
  state.stabilizeCount = Number(save.stabilizeCount) || 0;
  state.slowTimer = Math.max(0, Number(save.slowTimer) || 0);
  state.stabilizeTimer = Math.max(0, Number(save.stabilizeTimer) || 0);
  state.timeLeft = Math.max(0.1, Number(save.timeLeft) || 60);
  state.v2WobbleAngle = Number(save.wobbleAngle) || 0;
  state.v2WobbleVelocity = Number(save.wobbleVelocity) || 0;
  state.craneX = clamp((Number(save.craneX) || oldWidth / 2) * scale, 52, state.width - 52);
  state.craneDirection = Number(save.craneDirection) < 0 ? -1 : 1;
  state.cranePhase = Number(save.cranePhase) || 0;
  state.wind = Number(save.wind) || 0;
  state.windTarget = Number(save.windTarget) || 0;
  state.blocks = save.blocks.map(item => ({
    ...item,
    x: item.x * scale,
    y: item.y * scale + bottomShift,
    w: item.w * scale,
    h: item.h * scale,
    palette: buildingPalettes[clamp(item.paletteIndex || 0, 0, buildingPalettes.length - 1)],
    type: item.floor === 0 ? 'base' : 'settled', settled: true
  }));
  state.activeBlock = null;
  state.debris = [];
  state.particles = [];
  state.floaters = [];
  state.over = false;
  state.paused = false;
  state.running = false;
  state.countdown = true;
  state.cameraY = calculateCameraTarget();
  state.targetCameraY = state.cameraY;
  ui.hud.classList.remove('hidden');
  updateHud();
  startCountdown();
}

const v2OriginalCreateBase = createBaseBlock;
createBaseBlock = function createSquareBase() {
  const w = clamp(state.width * 0.31, 106, 132);
  const h = clamp(w * 0.78, 82, 102);
  return {
    x: state.width / 2 - w / 2,
    y: state.height - clamp(state.height * 0.14, 112, 148),
    w, h, floor: 0, palette: buildingPalettes[0], type: 'base', settled: true,
    glow: 0, leanOffset: 0, seed: Math.random(), roofType: 0, sign: '', windowsLit: 0.72
  };
};

createActiveBlock = function createSquareApartment() {
  const top = state.blocks[state.blocks.length - 1];
  if (!top || state.over) return;
  const difficulty = clamp(state.floors / 28, 0, 1.25);
  const w = clamp(top.w * randomRange(0.92, 1.04) + randomRange(-4, 5), 88, 134);
  const h = clamp(w * randomRange(0.72, 0.86), 72, 102);
  const paletteIndex = (Math.floor(state.floors / 3) + Math.floor(Math.random() * 2)) % buildingPalettes.length;
  const metrics = v2CraneMetrics();
  state.activeBlock = {
    x: state.craneX - w / 2, y: metrics.hookY + metrics.ropeLength, screenY: metrics.hookY + metrics.ropeLength,
    w, h, floor: state.floors + 1, palette: buildingPalettes[paletteIndex], type: 'hanging', settled: false,
    dropped: false, vy: 0, vx: 0, angle: 0, angularVelocity: 0,
    ropeLength: metrics.ropeLength, hookY: metrics.hookY,
    swingAmp: clamp(0.11 + difficulty * 0.08 + Math.abs(state.wind) * 0.012, 0.1, 0.25),
    seed: Math.random(), roofType: Math.floor(Math.random() * 4),
    sign: state.floors > 0 && state.floors % 9 === 0 ? ['CITY', 'NOVA', 'SKY', 'METRO'][Math.floor(Math.random() * 4)] : '',
    windowsLit: randomRange(0.45, 0.83), glow: 0
  };
  updateActiveBlock(0);
};

calculateCameraTarget = function fixedCraneCameraTarget() {
  const top = state.blocks[state.blocks.length - 1];
  if (!top) return 0;
  const metrics = v2CraneMetrics();
  const desiredTop = Math.max(state.height * 0.49, metrics.hookY + metrics.ropeLength + 126);
  return Math.max(0, desiredTop - top.y);
};

dropBlock = function dropFromFixedCrane() {
  const block = state.activeBlock;
  if (!block || block.dropped) return;
  block.dropped = true;
  block.type = 'falling';
  block.y = (block.screenY ?? block.y) - state.cameraY;
  const swing = Math.sin(state.cranePhase) * block.swingAmp;
  block.angle = swing;
  block.angularVelocity = Math.cos(state.cranePhase) * 0.3;
  block.vx = Math.cos(state.cranePhase) * block.swingAmp * 112 + state.wind * 6;
  block.vy = 34;
  sound.drop();
  vibrate(9);
  v2SaveGame();
};

updateActiveBlock = function updateFixedCraneBlock(dt) {
  const block = state.activeBlock;
  const top = state.blocks[state.blocks.length - 1];
  if (!block || !top) return;
  if (!block.dropped) {
    const metrics = v2CraneMetrics();
    block.hookY = metrics.hookY;
    block.ropeLength = metrics.ropeLength;
    const swing = Math.sin(state.cranePhase) * block.swingAmp;
    const ropeX = state.craneX + Math.sin(swing) * block.ropeLength;
    const ropeY = block.hookY + Math.cos(swing) * block.ropeLength;
    block.x = ropeX - block.w / 2;
    block.screenY = ropeY + 8;
    block.y = block.screenY;
    block.angle = swing * 0.72;
    return;
  }
  const previousBottom = block.y + block.h;
  block.vy += 1180 * dt;
  block.vx += state.wind * 11 * dt;
  block.x += block.vx * dt;
  block.y += block.vy * dt;
  block.angularVelocity += (-block.angle * 2.25 - block.angularVelocity * 1.3) * dt;
  block.angle += block.angularVelocity * dt;
  if (previousBottom <= top.y + 8 && block.y + block.h >= top.y && block.vy > 0) {
    resolveLanding(block, top);
    return;
  }
  if (block.y + state.cameraY > state.height + 180 || block.x + block.w < -120 || block.x > state.width + 120) missBlock(block);
};

resolveLanding = function squareBlockLanding(block, top) {
  const overlap = Math.min(block.x + block.w, top.x + top.w) - Math.max(block.x, top.x);
  if (overlap < Math.min(block.w, top.w) * 0.42) {
    block.y = top.y - block.h;
    missBlock(block);
    return;
  }
  const blockCenter = block.x + block.w / 2;
  const topCenter = top.x + top.w / 2;
  const offset = blockCenter - topCenter;
  const normalized = Math.abs(offset) / Math.max(1, Math.min(block.w, top.w) / 2);
  const accuracy = clamp(1 - normalized, 0, 1);
  const perfect = normalized <= 0.09 && Math.abs(block.angle) < 0.08;
  block.y = top.y - block.h;
  block.vx = 0;
  block.vy = 0;
  block.angularVelocity = 0;
  block.angle = clamp(block.angle * 0.18, -0.022, 0.022);
  block.type = 'settled';
  block.settled = true;
  block.glow = perfect ? 1 : 0.3;
  if (perfect) block.x = topCenter - block.w / 2;
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
    state.v2WobbleVelocity *= 0.72;
    if (state.consecutivePerfects % 4 === 0) {
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
  const signedOffset = offset / Math.max(top.w, 1);
  state.v2WobbleVelocity = (state.v2WobbleVelocity || 0) + signedOffset * (0.035 + state.floors * 0.003);
  state.v2WobbleAngle = (state.v2WobbleAngle || 0) + signedOffset * 0.003;
  v2SaveGame();
  setTimeout(() => {
    if (state.running && !state.over) createActiveBlock();
  }, perfect ? 210 : 340);
};

const v2OriginalUpdateGame = updateGame;
updateGame = function updateWithTallTowerWobble(dt) {
  const previousDirection = state.craneDirection;
  v2OriginalUpdateGame(dt);
  if (state.running && previousDirection !== state.craneDirection && state.soundEnabled && state.audioReady) {
    sound.tone(190, 0.045, 'triangle', 0.035, 0, 145);
  }
  if (!state.running || state.paused || state.countdown || state.over) return;
  const heightFactor = clamp(state.floors / 7, 0, 4);
  if (!Number.isFinite(state.v2WobbleAngle)) state.v2WobbleAngle = 0;
  if (!Number.isFinite(state.v2WobbleVelocity)) state.v2WobbleVelocity = 0;
  const stable = state.stabilizeTimer > 0;
  const stiffness = stable ? 7.2 : Math.max(2.1, 4.9 - heightFactor * 0.48);
  const damping = stable ? 4.8 : Math.max(1.15, 2.65 - heightFactor * 0.24);
  const drive = Math.sin(state.time * (1.12 + heightFactor * 0.08)) * 0.00105 * heightFactor + state.wind * 0.00115 * heightFactor;
  state.v2WobbleVelocity += (-state.v2WobbleAngle * stiffness - state.v2WobbleVelocity * damping + drive) * dt;
  state.v2WobbleAngle += state.v2WobbleVelocity * dt;
  const maxAngle = stable ? 0.025 : clamp(0.014 + state.floors * 0.0062, 0.02, 0.18);
  if (Math.abs(state.v2WobbleAngle) > maxAngle) {
    state.v2WobbleAngle = Math.sign(state.v2WobbleAngle) * maxAngle;
    state.v2WobbleVelocity *= -0.3;
  }
  state.towerLean = state.v2WobbleAngle;
};

const v2OriginalStabilizer = useStabilizer;
useStabilizer = function strongerStabilizer(event) {
  v2OriginalStabilizer(event);
  if (state.stabilizeTimer > 0) {
    state.v2WobbleAngle = (state.v2WobbleAngle || 0) * 0.3;
    state.v2WobbleVelocity = (state.v2WobbleVelocity || 0) * 0.16;
    v2SaveGame();
  }
};

renderHomeDemo = function renderSquareHomeDemo(dt) {
  if (state.screen !== 'home') return;
  if (!state.blocks.length || state.blocks.length < 5 || state.blocks[0].w > 140) {
    const base = createBaseBlock();
    base.y = state.height - clamp(state.height * 0.14, 100, 132);
    const blocks = [base];
    let y = base.y;
    for (let i = 1; i < 7; i += 1) {
      const w = clamp(base.w + Math.sin(i * 1.7) * 5, 96, 132);
      const h = clamp(w * 0.78, 76, 100);
      y -= h;
      blocks.push({
        x: state.width / 2 - w / 2 + Math.sin(i * 1.8) * 8, y, w, h, floor: i,
        palette: buildingPalettes[i % buildingPalettes.length], type: 'settled', settled: true,
        glow: 0, angle: Math.sin(i * 2.2) * 0.012, seed: i * 0.137, roofType: i % 4,
        sign: i === 4 ? 'NOVA' : '', windowsLit: 0.66
      });
    }
    state.blocks = blocks;
    state.cameraY = 0;
    state.targetCameraY = 0;
  }
  state.time += dt;
  for (const cloud of state.clouds) {
    cloud.x += cloud.speed * dt * 0.7;
    if (cloud.x - cloud.size * 2 > state.width) cloud.x = -cloud.size * 2;
  }
  state.v2WobbleAngle = Math.sin(state.time * 0.75) * 0.025;
  state.towerLean = state.v2WobbleAngle;
};

drawWorld = function drawWorldWithFixedCrane() {
  ctx.save();
  ctx.translate(0, state.cameraY);
  drawGround();
  drawTowerShadow();
  const baseBottom = state.blocks[0]?.y + state.blocks[0]?.h || state.height;
  const topY = state.blocks[state.blocks.length - 1]?.y || baseBottom;
  const totalHeight = Math.max(1, baseBottom - topY);
  const wobble = state.v2WobbleAngle || 0;
  const strength = clamp(state.floors / 6, 0, 3.5);
  for (let i = 0; i < state.blocks.length; i += 1) {
    const block = state.blocks[i];
    const distance = Math.max(0, baseBottom - (block.y + block.h));
    const ratio = distance / totalHeight;
    const micro = Math.sin(state.time * 2.05 + i * 0.62) * 0.0012 * strength * ratio;
    const angle = wobble + micro;
    const shift = Math.sin(angle) * distance * 0.82;
    drawBuildingBlock(block, block.x + shift, block.y, angle * ratio * 0.82 + (block.angle || 0), i);
  }
  if (state.activeBlock?.dropped) drawBuildingBlock(state.activeBlock, state.activeBlock.x, state.activeBlock.y, state.activeBlock.angle || 0, state.activeBlock.floor, true);
  for (const block of state.debris) drawBuildingBlock(block, block.x, block.y, block.angle || 0, block.floor, true);
  ctx.restore();
  drawCrane(state.activeBlock && !state.activeBlock.dropped ? state.activeBlock : null);
  if (state.activeBlock && !state.activeBlock.dropped) {
    drawBuildingBlock(state.activeBlock, state.activeBlock.x, state.activeBlock.screenY ?? state.activeBlock.y, state.activeBlock.angle || 0, state.activeBlock.floor, true);
  }
};

drawCrane = function drawFixedCrane(block) {
  const metrics = v2CraneMetrics();
  const topY = metrics.boomY;
  const boomLength = clamp(state.width * 0.28, 105, 155);
  const counter = clamp(state.width * 0.13, 45, 70);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(20,31,42,0.9)';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(state.craneX - counter, topY);
  ctx.lineTo(state.craneX + boomLength, topY);
  ctx.stroke();
  ctx.strokeStyle = '#f6c744';
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(state.craneX - counter, topY);
  ctx.lineTo(state.craneX + boomLength, topY);
  ctx.moveTo(state.craneX, topY - 26);
  ctx.lineTo(state.craneX, topY + 16);
  ctx.moveTo(state.craneX - counter, topY);
  ctx.lineTo(state.craneX, topY - 26);
  ctx.moveTo(state.craneX + boomLength, topY);
  ctx.lineTo(state.craneX, topY - 26);
  ctx.stroke();
  for (let x = state.craneX - counter + 12; x < state.craneX + boomLength - 8; x += 22) {
    ctx.strokeStyle = 'rgba(91,55,22,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, topY - 6);
    ctx.lineTo(x + 12, topY + 6);
    ctx.stroke();
  }
  ctx.fillStyle = '#263342';
  roundedRectPath(ctx, state.craneX - 18, topY - 9, 36, 18, 5);
  ctx.fill();
  ctx.fillStyle = '#67e4ff';
  roundedRectPath(ctx, state.craneX - 8, topY - 5, 14, 8, 2);
  ctx.fill();
  if (block) {
    const swing = Math.sin(state.cranePhase) * block.swingAmp;
    const hookX = state.craneX + Math.sin(swing) * block.ropeLength;
    const hookBottom = metrics.hookY + Math.cos(swing) * block.ropeLength;
    ctx.strokeStyle = '#172130';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(state.craneX, metrics.hookY);
    ctx.lineTo(hookX, hookBottom + 2);
    ctx.stroke();
    ctx.fillStyle = '#ffc83f';
    ctx.beginPath();
    ctx.arc(hookX, hookBottom + 2, 5.5, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#2a1b0c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hookX - block.w * 0.27, hookBottom + 10);
    ctx.lineTo(hookX, hookBottom + 2);
    ctx.lineTo(hookX + block.w * 0.27, hookBottom + 10);
    ctx.stroke();
  }
  ctx.restore();
};

// Louder generated sound effects, still fully offline.
const v2OriginalEnsure = sound.ensure.bind(sound);
sound.ensure = function boostedAudio() {
  const ready = v2OriginalEnsure();
  if (ready && state.masterGain) state.masterGain.gain.value = 0.24;
  return ready;
};
sound.drop = function v2DropSound() {
  this.tone(330, 0.11, 'sine', 0.25, 0, 110);
  this.noise(0.08, 0.06);
};
sound.land = function v2LandSound(accuracy) {
  this.noise(0.1, 0.17);
  this.tone(95 + accuracy * 110, 0.14, 'triangle', 0.28, 0, 68);
};
sound.perfect = function v2PerfectSound(combo) {
  const root = 540 + Math.min(combo, 8) * 18;
  this.tone(root, 0.11, 'triangle', 0.25);
  this.tone(root * 1.25, 0.15, 'triangle', 0.2, 0.055);
  this.tone(root * 1.5, 0.2, 'sine', 0.17, 0.11);
};

const v2OriginalReset = resetGame;
resetGame = function resetAndSave(mode) {
  v2ClearSave();
  state.v2WobbleAngle = 0;
  state.v2WobbleVelocity = 0;
  v2OriginalReset(mode);
  setTimeout(v2SaveGame, 1200);
};

const v2OriginalPause = pauseGame;
pauseGame = function pauseAndSave() {
  v2SaveGame();
  v2OriginalPause();
};

const v2OriginalGoHome = goHome;
goHome = function quitAndClear() {
  v2ClearSave();
  v2OriginalGoHome();
};

const v2OriginalEndGame = endGame;
endGame = function finishAndClear() {
  v2ClearSave();
  v2OriginalEndGame();
};

continueButton?.addEventListener('click', v2RestoreGame);
window.addEventListener('pagehide', v2SaveGame);
window.addEventListener('beforeunload', v2SaveGame);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) v2SaveGame();
});
setInterval(() => {
  if (state.running) v2SaveGame();
}, 1600);

v2UpdateContinue();