import test from 'node:test';
import assert from 'node:assert/strict';
import { createHud, hudText } from '../src/hud.js';
import { createGame } from '../src/game.js';
function fixture() {
  let clears = 0;
  const hud = createHud({canvasFactory: () => ({getContext: () => ({
    setTransform() {}, clearRect() { clears++; }, fillRect() {}, fillText() {},
  })})});
  return {hud, clears: () => clears};
}
test('stable text causes no redraw or texture upload, including cooldown ticks and resizing', () => {
  const {hud, clears} = fixture(), state = createGame();
  state.p.cool = .8;
  hud.update(hudText(state, false));
  const versions = Object.values(hud.panels).map(p => p.texture.version);
  const count = clears();
  state.p.cool = .3;
  state.time = .4;
  for (let i = 0; i < 120; i++) hud.update(hudText(state, false));
  hud.resize(375, 800);
  hud.resize(1440, 900);
  assert.equal(clears(), count);
  assert.deepEqual(Object.values(hud.panels).map(p => p.texture.version), versions);
  state.p.cool = 0;
  hud.update(hudText(state, false));
  assert.equal(clears(), count + 1);
  assert.equal(hud.panels.cooldown.texture.version, versions[4] + 1);
  hud.dispose();
});
test('inventory, objective, damage, pause, and disappearing prompts invalidate relevant panels', () => {
  const {hud} = fixture(), state = createGame();
  hud.update(hudText(state, false));
  const health = hud.panels.health.texture.version;
  state.p.hp = 75;
  state.key = true;
  hud.update(hudText(state, true, '拾取琥珀钥匙'));
  assert.equal(hud.panels.health.texture.version, health + 1);
  assert.match(hud.panels.inventory.key, /琥珀钥匙/);
  assert.match(hud.panels.mission.key, /开启封印/);
  assert.equal(hud.panels.prompt.mesh.visible, true);
  hud.update(hudText(state, false));
  assert.equal(hud.panels.prompt.mesh.visible, false);
  assert.equal(hud.panels.notice.mesh.visible, false);
  hud.dispose();
});
test('overlay preserves world color and restores renderer clear state', () => {
  const {hud} = fixture(), calls = [];
  const renderer = {autoClear: true, clearDepth() {calls.push('depth');}, render() {
    assert.equal(this.autoClear, false);calls.push('overlay');
  }};
  hud.render(renderer);
  assert.deepEqual(calls, ['depth', 'overlay']);
  assert.equal(renderer.autoClear, true);
  renderer.render = () => {throw Error('render failed');};
  assert.throws(() => hud.render(renderer));
  assert.equal(renderer.autoClear, true);
  hud.dispose();
});
