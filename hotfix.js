'use strict';

const v2RenderedHomeDemo = renderHomeDemo;
renderHomeDemo = function cleanSquareHomeDemo(dt) {
  v2RenderedHomeDemo(dt);
  if (state.screen === 'home') state.activeBlock = null;
};

const pauseControl = document.getElementById('pauseButton');
pauseControl?.addEventListener('pointerdown', v2SaveGame, { capture: true });

['quitButton', 'menuButton'].forEach(id => {
  document.getElementById(id)?.addEventListener('click', v2ClearSave, { capture: true });
});

ui.slowPower?.addEventListener('pointerdown', () => setTimeout(v2SaveGame, 0));
ui.stabilizePower?.addEventListener('pointerdown', () => {
  setTimeout(() => {
    if (state.stabilizeTimer > 0) {
      state.v2WobbleAngle = (state.v2WobbleAngle || 0) * 0.3;
      state.v2WobbleVelocity = (state.v2WobbleVelocity || 0) * 0.16;
    }
    v2SaveGame();
  }, 0);
});