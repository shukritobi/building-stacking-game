function drawGame() {
const shakeX = state.shake ? randomRange(-state.shake, state.shake) : 0;
const shakeY = state.shake ? randomRange(-state.shake * 0.6, state.shake * 0.6) : 0;
ctx.save();
ctx.translate(shakeX, shakeY);
drawBackground(0);
drawWorld();
ctx.restore();
drawParticles();
drawFloaters();
if (state.mode === 'time' && state.running) drawTimeArc();
if (state.flash > 0.01) {
ctx.fillStyle = `rgba(${state.flashColor},${state.flash * 0.22})`;
ctx.fillRect(0, 0, state.width, state.height);
}
}
function drawWorld() {
ctx.save();
ctx.translate(0, state.cameraY);
drawGround();
drawTowerShadow();
const baseY = state.blocks[0]?.y + state.blocks[0]?.h || state.height;
for (let i = 0; i < state.blocks.length; i += 1) {
const block = state.blocks[i];
const heightRatio = state.blocks.length > 1 ? i / (state.blocks.length - 1) : 0;
const lean = state.towerLean * heightRatio * 16;
drawBuildingBlock(block, block.x + lean, block.y, block.angle || 0, i);
}
if (state.activeBlock) {
if (!state.activeBlock.dropped) drawCrane(state.activeBlock);
drawBuildingBlock(state.activeBlock, state.activeBlock.x, state.activeBlock.y, state.activeBlock.angle || 0, state.activeBlock.floor, true);
} else if (state.running && !state.over) {
drawCrane(null);
}
for (const block of state.debris) drawBuildingBlock(block, block.x, block.y, block.angle || 0, block.floor, true);
ctx.restore();
}
function drawGround() {
const base = state.blocks[0];
const y = base ? base.y + base.h : state.height - 100;
const grad = ctx.createLinearGradient(0, y, 0, y + 180);
grad.addColorStop(0, 'rgba(3,14,34,0.96)');
grad.addColorStop(1, 'rgba(1,6,18,1)');
ctx.fillStyle = grad;
ctx.fillRect(0, y, state.width, 260);
ctx.strokeStyle = 'rgba(120,220,255,0.08)';
ctx.lineWidth = 1;
for (let i = -5; i < 16; i += 1) {
ctx.beginPath();
ctx.moveTo(state.width / 2, y);
ctx.lineTo(state.width / 2 + i * 80, y + 200);
ctx.stroke();
}
for (let j = 1; j < 9; j += 1) {
const yy = y + Math.pow(j / 8, 1.6) * 200;
ctx.beginPath();
ctx.moveTo(0, yy);
ctx.lineTo(state.width, yy);
ctx.stroke();
}
}
function drawTowerShadow() {
const base = state.blocks[0];
if (!base) return;
const y = base.y + base.h + 6;
const grad = ctx.createRadialGradient(state.width / 2, y, 4, state.width / 2, y, base.w * 0.85);
grad.addColorStop(0, 'rgba(0,0,0,0.42)');
grad.addColorStop(1, 'rgba(0,0,0,0)');
ctx.fillStyle = grad;
ctx.fillRect(state.width / 2 - base.w, y - 30, base.w * 2, 70);
}
function drawCrane(block) {
const hookY = block ? block.hookY : clamp(state.height * 0.09, 46, 82);
const topY = hookY - 42;
const boomLength = clamp(state.width * 0.38, 140, 280);
const counter = 52;
ctx.save();
ctx.lineCap = 'round';
ctx.lineJoin = 'round';
ctx.strokeStyle = 'rgba(20,31,42,0.85)';
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
for (let x = state.craneX - counter + 15; x < state.craneX + boomLength - 10; x += 24) {
ctx.strokeStyle = 'rgba(91,55,22,0.8)';
ctx.lineWidth = 2;
ctx.beginPath();
ctx.moveTo(x, topY - 6);
ctx.lineTo(x + 13, topY + 6);
ctx.stroke();
}
ctx.fillStyle = '#263342';
roundedRectPath(ctx, state.craneX - 18, topY - 9, 36, 18, 5);
ctx.fill();
ctx.fillStyle = '#67e4ff';
roundedRectPath(ctx, state.craneX - 8, topY - 5, 14, 8, 2);
ctx.fill();
if (block && !block.dropped) {
const swing = Math.sin(state.cranePhase) * block.swingAmp;
const hookX = state.craneX + Math.sin(swing) * block.ropeLength;
const hookBottom = block.hookY + Math.cos(swing) * block.ropeLength;
ctx.strokeStyle = '#172130';
ctx.lineWidth = 3;
ctx.beginPath();
ctx.moveTo(state.craneX, hookY);
ctx.lineTo(hookX, hookBottom + 2);
ctx.stroke();
ctx.fillStyle = '#ffc83f';
ctx.beginPath();
ctx.arc(hookX, hookBottom + 2, 6, 0, TAU);
ctx.fill();
ctx.strokeStyle = '#2a1b0c';
ctx.lineWidth = 2;
ctx.beginPath();
ctx.moveTo(hookX - block.w * 0.28, hookBottom + 8);
ctx.lineTo(hookX, hookBottom + 2);
ctx.lineTo(hookX + block.w * 0.28, hookBottom + 8);
ctx.stroke();
}
ctx.restore();
}
function drawBuildingBlock(block, drawX, drawY, angle, index, airborne = false) {
const { w, h, palette } = block;
const depth = clamp(w * 0.075, 7, 14);
ctx.save();
ctx.translate(drawX + w / 2, drawY + h / 2);
ctx.rotate(angle);
ctx.translate(-w / 2, -h / 2);
if (airborne) {
ctx.shadowColor = 'rgba(0,0,0,0.28)';
ctx.shadowBlur = 18;
ctx.shadowOffsetY = 10;
}
if (block.glow > 0) {
ctx.shadowColor = block.glow > 0.55 ? 'rgba(255,215,90,0.85)' : 'rgba(85,230,255,0.45)';
ctx.shadowBlur = 24 * block.glow;
}
ctx.fillStyle = palette.side;
ctx.beginPath();
ctx.moveTo(w - depth, depth * 0.7);
ctx.lineTo(w, 0);
ctx.lineTo(w, h - depth * 0.1);
ctx.lineTo(w - depth, h);
ctx.closePath();
ctx.fill();
const bodyGrad = ctx.createLinearGradient(0, 0, w, h);
bodyGrad.addColorStop(0, palette.roof);
bodyGrad.addColorStop(0.12, palette.body);
bodyGrad.addColorStop(1, mixColor(palette.body, palette.side, 0.23));
ctx.fillStyle = bodyGrad;
roundedRectPath(ctx, 0, depth * 0.55, w - depth, h - depth * 0.55, Math.min(6, h * 0.1));
ctx.fill();
ctx.fillStyle = palette.roof;
ctx.beginPath();
ctx.moveTo(0, depth * 0.55);
ctx.lineTo(depth, 0);
ctx.lineTo(w, 0);
ctx.lineTo(w - depth, depth * 0.55);
ctx.closePath();
ctx.fill();
ctx.strokeStyle = 'rgba(30,24,18,0.36)';
ctx.lineWidth = 1.6;
roundedRectPath(ctx, 0.7, depth * 0.55 + 0.7, w - depth - 1.4, h - depth * 0.55 - 1.4, Math.min(6, h * 0.1));
ctx.stroke();
drawWindows(block, w - depth, h, palette, index);
drawRoofDetails(block, w, h, palette);
if (block.sign) drawBuildingSign(block.sign, w - depth, h, palette);
if (block.type === 'base') {
ctx.fillStyle = 'rgba(7,18,28,0.92)';
roundedRectPath(ctx, w * 0.27, h * 0.35, w * 0.46, h * 0.46, 5);
ctx.fill();
ctx.fillStyle = palette.glass;
ctx.globalAlpha = 0.72;
ctx.fillRect(w * 0.46, h * 0.45, w * 0.08, h * 0.36);
ctx.globalAlpha = 1;
}
ctx.restore();
}
function drawWindows(block, frontW, h, palette, index) {
const marginX = clamp(frontW * 0.075, 8, 15);
const top = clamp(h * 0.24, 13, 18);
const bottom = 8;
const usableW = frontW - marginX * 2;
const usableH = h - top - bottom;
const cols = clamp(Math.floor(usableW / 25), 3, 8);
const rows = clamp(Math.floor(usableH / 18), 1, 3);
const gapX = clamp(usableW * 0.035, 3, 7);
const gapY = 6;
const winW = (usableW - gapX * (cols - 1)) / cols;
const winH = (usableH - gapY * (rows - 1)) / rows;
for (let row = 0; row < rows; row += 1) {
for (let col = 0; col < cols; col += 1) {
const x = marginX + col * (winW + gapX);
const y = top + row * (winH + gapY);
const litValue = ((row * 17 + col * 11 + Math.floor(block.seed * 100) + index * 5) % 100) / 100;
const lit = litValue < block.windowsLit;
ctx.fillStyle = palette.frame;
roundedRectPath(ctx, x - 1.5, y - 1.5, winW + 3, winH + 3, 2.5);
ctx.fill();
const glassGrad = ctx.createLinearGradient(x, y, x, y + winH);
if (lit) {
glassGrad.addColorStop(0, '#d7fbff');
glassGrad.addColorStop(1, palette.glass);
} else {
glassGrad.addColorStop(0, mixColor(palette.glass, '#07182f', 0.45));
glassGrad.addColorStop(1, '#132a43');
}
ctx.fillStyle = glassGrad;
roundedRectPath(ctx, x, y, winW, winH, 1.5);
ctx.fill();
ctx.strokeStyle = 'rgba(255,255,255,0.24)';
ctx.lineWidth = 0.8;
ctx.beginPath();
ctx.moveTo(x + winW * 0.5, y + 1);
ctx.lineTo(x + winW * 0.5, y + winH - 1);
ctx.stroke();
}
}
}
function drawRoofDetails(block, w, h, palette) {
const frontW = w - clamp(w * 0.075, 7, 14);
const type = block.roofType || 0;
ctx.save();
ctx.shadowBlur = 0;
if (type === 1 && w > 145) {
ctx.fillStyle = palette.frame;
ctx.fillRect(frontW * 0.18, 3, frontW * 0.64, 4);
for (let i = 0; i < 4; i += 1) {
ctx.fillRect(frontW * (0.2 + i * 0.2), -4, 3, 10);
}
} else if (type === 2 && w > 130) {
ctx.fillStyle = palette.frame;
roundedRectPath(ctx, frontW * 0.42, -7, frontW * 0.18, 10, 2);
ctx.fill();
ctx.fillStyle = palette.glass;
ctx.fillRect(frontW * 0.46, -5, frontW * 0.1, 5);
} else if (type === 3 && w > 120) {
ctx.strokeStyle = palette.frame;
ctx.lineWidth = 2;
ctx.beginPath();
ctx.moveTo(frontW * 0.5, 1);
ctx.lineTo(frontW * 0.5, -12);
ctx.stroke();
ctx.fillStyle = '#ffdf64';
ctx.beginPath();
ctx.arc(frontW * 0.5, -13, 2.4, 0, TAU);
ctx.fill();
}
ctx.restore();
}
function drawBuildingSign(text, frontW, h, palette) {
const signW = clamp(frontW * 0.44, 50, 86);
const signH = 15;
const x = frontW * 0.5 - signW * 0.5;
const y = Math.max(8, h * 0.1);
ctx.fillStyle = 'rgba(6,17,35,0.86)';
roundedRectPath(ctx, x, y, signW, signH, 4);
ctx.fill();
ctx.fillStyle = palette.trim;
ctx.font = `900 ${Math.max(7, signH * 0.48)}px ui-sans-serif, system-ui`;
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText(text, x + signW / 2, y + signH / 2 + 0.5);
}
function drawParticles() {
ctx.save();
ctx.translate(0, state.cameraY);
for (const p of state.particles) {
const alpha = clamp(p.life / p.maxLife, 0, 1);
ctx.globalAlpha = alpha;
ctx.fillStyle = p.color;
if (p.shape === 'star') {
drawStar(p.x, p.y, p.size * 1.3, p.size * 0.55, 5);
} else {
ctx.save();
ctx.translate(p.x, p.y);
ctx.rotate((p.x + p.y) * 0.015);
ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
ctx.restore();
}
}
ctx.restore();
ctx.globalAlpha = 1;
}
function drawStar(x, y, outer, inner, points) {
ctx.beginPath();
for (let i = 0; i < points * 2; i += 1) {
const radius = i % 2 === 0 ? outer : inner;
const angle = -Math.PI / 2 + (i / (points * 2)) * TAU;
const px = x + Math.cos(angle) * radius;
const py = y + Math.sin(angle) * radius;
if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
}
ctx.closePath();
ctx.fill();
}
function drawFloaters() {
ctx.save();
ctx.translate(0, state.cameraY);
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
for (const f of state.floaters) {
const alpha = clamp(f.life / f.maxLife, 0, 1);
ctx.globalAlpha = Math.min(1, alpha * 1.4);
ctx.save();
ctx.translate(f.x, f.y);
ctx.scale(f.scale, f.scale);
ctx.font = '950 18px ui-sans-serif, system-ui';
ctx.lineWidth = 5;
ctx.strokeStyle = 'rgba(5,14,30,0.72)';
ctx.strokeText(f.text, 0, 0);
ctx.fillStyle = f.color;
ctx.fillText(f.text, 0, 0);
ctx.restore();
}
ctx.restore();
ctx.globalAlpha = 1;
}
function drawTimeArc() {
const radius = 22;
const x = state.width - 35;
const y = 90 + (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-top')) || 0);
const ratio = state.timeLeft / 60;
ctx.save();
ctx.lineWidth = 4;
ctx.strokeStyle = 'rgba(255,255,255,0.14)';
ctx.beginPath();
ctx.arc(x, y, radius, 0, TAU);
ctx.stroke();
ctx.strokeStyle = ratio < 0.2 ? '#ff6b85' : '#55e6ff';
ctx.lineCap = 'round';
ctx.beginPath();
ctx.arc(x, y, radius, -Math.PI / 2, -Math.PI / 2 + TAU * ratio);
ctx.stroke();
ctx.fillStyle = '#ffffff';
ctx.font = '900 11px ui-sans-serif, system-ui';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText(Math.ceil(state.timeLeft), x, y + 0.5);
ctx.restore();
}
