import * as T from 'three';
import { nearPrompt } from './game.js';

export function hudText(state, paused, notice = '') {
  const {p, enemy} = state;
  return {
    mission: ['遗迹回收行动', state.core ? '将核心带回营地' : !state.door ? state.key ? '前往北侧，开启封印' : '寻找琥珀庭院中的钥匙' : enemy.hp > 0 ? '击败星核守卫' : '拾取能量核心', '营地 → 钥匙 → 封印 → 核心 → 返回'],
    clock: [new Date(Math.floor(state.time) * 1000).toISOString().slice(14, 19)],
    health: ['♥'.repeat(Math.ceil(p.hp / 20)) + '♡'.repeat(5 - Math.ceil(p.hp / 20)), `生命 ${p.hp}/100`],
    inventory: [state.core ? '◈ 携带槽 · 能量核心' : state.key ? '⚿ 携带槽 · 琥珀钥匙' : '◇ 携带槽 · 空'],
    cooldown: [p.cool > 0 ? '闪避冷却中' : '闪避就绪', `守卫 ${Math.max(0, enemy.hp)}/3`],
    prompt: [paused ? '已暂停 · 点击继续或按 Esc' : nearPrompt(state)],
    notice: [notice],
  };
}

// Each panel owns a fixed-resolution canvas. Resizing moves/scales meshes only;
// unchanged text never redraws the canvas or marks its texture for upload.
export class TextPanel {
  constructor(width, height, sizes, {canvasFactory = () => document.createElement('canvas'), centered = false} = {}) {
    this.width = width;
    this.height = height;
    this.sizes = sizes;
    this.centered = centered;
    this.canvas = canvasFactory();
    this.canvas.width = width * 2;
    this.canvas.height = height * 2;
    this.ctx = this.canvas.getContext('2d');
    this.texture = new T.CanvasTexture(this.canvas);
    this.texture.colorSpace = T.SRGBColorSpace;
    this.texture.generateMipmaps = false;
    this.texture.minFilter = T.LinearFilter;
    this.mesh = new T.Mesh(new T.PlaneGeometry(width, height), new T.MeshBasicMaterial({
      map: this.texture, transparent: true, depthTest: false, depthWrite: false, toneMapped: false, side: T.DoubleSide,
    }));
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    this.key = null;
  }

  update(lines) {
    const key = JSON.stringify(lines);
    if (this.key === key) return false;
    this.key = key;
    this.mesh.visible = lines.some(Boolean);
    const ctx = this.ctx;
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);
    if (this.mesh.visible) {
      ctx.fillStyle = 'rgba(16, 35, 39, 0.88)';
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.fillStyle = '#eac483';
      ctx.fillRect(0, 0, 2, this.height);
      ctx.textBaseline = 'top';
      ctx.textAlign = this.centered ? 'center' : 'left';
      let y = 12;
      lines.forEach((line, i) => {
        const size = this.sizes[i] ?? 14;
        ctx.font = `${size >= 20 ? 600 : 400} ${size}px system-ui, sans-serif`;
        ctx.fillStyle = i === 0 ? '#f1d5a2' : '#d3e5dd';
        ctx.fillText(line, this.centered ? this.width / 2 : 16, y, this.width - 32);
        y += size + 9;
      });
    }
    this.texture.needsUpdate = true;
    return true;
  }

  place(x, y, scale = 1) {
    this.mesh.scale.set(scale, -scale, 1);
    this.mesh.position.set(x + this.width * scale / 2, y + this.height * scale / 2, 0);
  }

  dispose() {
    this.texture.dispose();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}

export function createHud(options = {}) {
  const scene = new T.Scene();
  const camera = new T.OrthographicCamera(0, 1, 0, 1, -1, 1);
  const panels = {
    mission: new TextPanel(390, 110, [11, 23, 12], options),
    clock: new TextPanel(78, 38, [12], options),
    health: new TextPanel(240, 76, [23, 12], options),
    inventory: new TextPanel(240, 44, [14], options),
    cooldown: new TextPanel(240, 64, [13, 12], options),
    prompt: new TextPanel(360, 46, [15], {...options, centered: true}),
    notice: new TextPanel(360, 42, [13], {...options, centered: true}),
  };
  Object.values(panels).forEach((panel, index) => {
    panel.mesh.renderOrder = index;
    scene.add(panel.mesh);
  });
  return {
    panels,
    update(text) { for (const [name, lines] of Object.entries(text)) panels[name].update(lines); },
    resize(width, height) {
      camera.right = width;
      camera.bottom = height;
      camera.updateProjectionMatrix();
      const compact = width <= 700;
      const margin = compact ? 15 : 32;
      const scale = Math.min(1, (width - margin * 2) / 390, height / 620);
      const top = compact ? 75 : 112;
      panels.mission.place(margin, top, scale);
      panels.clock.place(margin + 294 * scale, top, scale);
      const bottom = height - (compact ? 105 : 92);
      panels.health.place(margin, bottom - 188 * scale, scale);
      panels.inventory.place(margin, bottom - 108 * scale, scale);
      panels.cooldown.place(margin, bottom - 60 * scale, scale);
      // On narrow screens put interaction messages above the status stack.
      const promptY = compact ? bottom - 286 * scale : height - 181;
      panels.prompt.place((width - 360 * scale) / 2, promptY, scale);
      panels.notice.place((width - 360 * scale) / 2, promptY + 50 * scale, scale);
    },
    render(renderer) {
      const autoClear = renderer.autoClear;
      renderer.autoClear = false;
      try {
        renderer.clearDepth();
        renderer.render(scene, camera);
      } finally {
        renderer.autoClear = autoClear;
      }
    },
    dispose() { Object.values(panels).forEach(panel => panel.dispose()); },
  };
}
