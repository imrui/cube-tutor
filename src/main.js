// Fonts ship with the build (split by unicode range, so only the characters in use are downloaded).
import '@fontsource-variable/noto-sans-sc';
import '@fontsource-variable/outfit';
import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createIcons, Box, Check, CircleHelp, Blocks, ArrowUpRight, PlayCircle, Hand, Scan, Move, RotateCcw, SkipBack, Play, Pause, SkipForward, ArrowRight, Shuffle, X, BookOpen, Moon, Sun, ChevronLeft, ChevronRight, ChevronDown } from 'lucide';
import { parseMove, rotatePosition, inverse, moveFromDrag, practiceStep } from './cube.js';
import { lessons, moveText, resolveLesson } from './lessons.js';
import { evaluateGoal } from './cube-state.js';

const icon = (name, cls = '') => `<i data-lucide="${name}" class="${cls}"></i>`;
// Storage may be unavailable (private mode, blocked site data) or hold stale values.
const store = {
  get(key, fallback) { try { const value = localStorage.getItem(key); return value === null ? fallback : JSON.parse(value); } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* progress just won't persist */ } },
};
let selected = store.get('cube-lesson', 0);
if (!Number.isInteger(selected) || !lessons[selected]) selected = 0;
let completed = store.get('cube-completed', []);
completed = Array.isArray(completed) ? [...new Set(completed)].filter(i => Number.isInteger(i) && lessons[i]) : [];
const savedCases = store.get('cube-passed-cases', []);
const passedCases = new Set(Array.isArray(savedCases) ? savedCases.filter(key => typeof key === 'string') : []);
const coarse = matchMedia('(pointer: coarse)').matches;
const isPhone = () => matchMedia('(max-width: 620px)').matches;
let mode = 'learn', step = 0, playing = false, busy = false, speed = 1, focus = false, arrows = true, pendingHalf = null, generation = 0, playRun = 0;
let caseIndex = 0, activeMove = null, activeDirection = 'forward';
let lesson = resolveLesson(selected);
document.querySelector('#app').innerHTML = `
<aside class="sidebar">
  <a class="brand" href="#" aria-label="方寸首页"><span class="brand-mark">${icon('box')}</span><span>方寸<span class="brand-en">CUBE TUTOR</span></span></a>
  <nav id="lessons" aria-label="课程章节"></nav>
  <div class="sidebar-bottom"><div class="progress-label"><span>学习进度</span><b id="progress-label"></b></div><div class="progress-track"><span id="progress"></span></div></div>
</aside>
<div class="main-shell">
  <div class="lesson-bar"><button class="icon-button" id="lesson-prev" aria-label="上一节">${icon('chevron-left')}</button><button class="lesson-bar-title" id="lesson-open" aria-haspopup="dialog" aria-label="打开课程目录"><span id="lesson-bar-kicker"></span><b><span id="lesson-bar-name"></span>${icon('chevron-down')}</b></button><button class="icon-button" id="lesson-next" aria-label="下一节">${icon('chevron-right')}</button><button class="icon-button bar-help" data-open-help aria-label="使用帮助">${icon('circle-help')}</button></div>
  <main>
    <section class="page-heading"><h1 id="heading"></h1><div class="heading-actions"><button class="icon-button" id="theme" data-theme-toggle></button><button class="icon-button" id="help" data-open-help title="使用帮助" aria-label="使用帮助">${icon('circle-help')}</button></div></section>
    <div class="workspace">
      <div class="cube-column">
        <section class="cube-card"><div class="cube-top"><div class="mode-tabs"><button data-mode="learn" class="active">${icon('play-circle')} 动画教学</button><button data-mode="practice">${icon('hand')} 跟我练习</button><button data-mode="sandbox" id="sandbox">${icon('blocks')} 自由练习</button></div></div>
          <div class="viewport" id="viewport"><div class="view-label"><span class="view-dot"></span><span id="view-label">白色底面 · 黄色朝上</span></div><button class="view-reset icon-button" id="view-reset" title="恢复默认视角" aria-label="恢复默认视角">${icon('scan')}</button><div class="move-tag" id="move-tag" aria-hidden="true"><b id="move-tag-letter"></b><span id="move-tag-text"></span></div><div class="drag-hint">${icon('move')} <span id="drag-hint"></span></div></div>
          <div class="cube-options"><label><input id="focus" type="checkbox"/><span class="switch"></span> 聚焦目标块</label><label><input id="arrows" type="checkbox" checked/><span class="switch"></span> 转动指引</label></div>
          <div class="playback"><div class="timeline"><span id="step-status">动作 0 / 4</span><div class="timeline-track"><span id="timeline-fill"></span></div></div><div class="transport"><button id="reset" class="icon-button" title="重置本节" aria-label="重置">${icon('rotate-ccw')}</button><div class="transport-center"><button id="prev" class="icon-button" title="上一步" aria-label="上一步">${icon('skip-back')}</button><button id="play" class="play-button" title="播放或暂停" aria-label="播放">${icon('play')}</button><button id="next" class="icon-button" title="下一步" aria-label="下一步">${icon('skip-forward')}</button></div><button id="speed" class="speed-button" title="切换播放速度" aria-label="播放速度">1× <span>速度</span></button></div></div>
        </section>
        <section class="practice-card"><div class="section-title"><p id="practice-message" aria-live="polite"></p><button id="inverse" class="inverse-button" aria-pressed="false">逆时针 <span>′</span></button></div><div class="move-keys" id="move-keys"></div><div class="key-hint"><button id="scramble">${icon('shuffle')} 随机打乱</button></div></section>
      </div>
      <div class="lesson-column">
        <aside class="instruction-card">
          <div class="lesson-head"><h2 id="lesson-title"></h2><span id="lesson-kicker"></span></div>
          <div class="goal-line"><span class="goal-text">目标：<b id="goal"></b></span><span id="goal-status" class="goal-status" role="status" aria-live="polite"></span></div>
          <div class="case-chips" id="case-chips" role="radiogroup" aria-label="练习局面"></div>
          <p id="case-note" class="case-note"></p>
          <h3 id="formula-title" class="formula-title"></h3>
          <div id="formula" class="formula"></div>
          <details class="lesson-more" id="lesson-more"><summary>本节讲解与技巧 ${icon('chevron-down')}</summary><p id="lesson-desc"></p><p id="tip"></p><p id="detail"></p><button id="more-help">认识转动符号 ${icon('arrow-right')}</button></details>
          <button id="complete" class="complete-button"></button>
        </aside>
      </div>
    </div>
  </main>
</div><div id="toast" role="status"></div><dialog id="lesson-sheet" class="sheet" aria-labelledby="sheet-title"><div class="sheet-head"><div><h2 id="sheet-title">课程目录</h2><p id="sheet-progress"></p></div><button class="icon-button" data-theme-toggle></button><button class="icon-button" id="close-sheet" aria-label="关闭">${icon('x')}</button></div><nav id="sheet-lessons" aria-label="课程章节"></nav></dialog><dialog id="help-dialog" aria-labelledby="help-title"><button id="close-help" class="icon-button" aria-label="关闭">${icon('x')}</button><h2 id="help-title">使用帮助</h2>
  <h3>看和转</h3><p>拖动魔方改变视角，滚轮或双指缩放。在「跟我练习」和「自由练习」中，按住魔方的一面滑动即可转动那一层；拖动魔方外的空白处旋转视角。</p>
  <h3>转动符号</h3><div class="help-grid"><b>R / L</b><span>右面 / 左面</span><b>U / D</b><span>顶层 / 底层</span><b>F / B</b><span>前面 / 后面</span><b>R′</b><span>带 ′ 表示逆时针</span><b>R2</b><span>转 180°，即同一面转两次</span></div><p>顺时针、逆时针都以正对该面的方向为准。</p>
  <h3 class="keyboard-only">键盘</h3><div class="help-grid keyboard-only"><b>U D L R F B</b><span>转动对应的面</span><b>Shift + 字母</b><span>逆时针转动</span><b>Space</b><span>播放 / 暂停动画</span><b>← / →</b><span>后退 / 前进一步</span></div>
  <h3>进度</h3><p>在「跟我练习」中做完动作并达成目标，会自动记录这个局面；一节的所有局面都通过，这一节就完成了。进度只保存在本机浏览器。</p>
</dialog>`;
const $ = selector => document.querySelector(selector);
const refreshIcons = () => createIcons({ icons: { Box, Check, CircleHelp, Blocks, ArrowUpRight, PlayCircle, Hand, Scan, Move, RotateCcw, SkipBack, Play, Pause, SkipForward, ArrowRight, Shuffle, X, BookOpen, Moon, Sun, ChevronLeft, ChevronRight, ChevronDown }, attrs: { 'stroke-width': 1.7 } });

// Theme: follows the system unless the learner picks the other one; the 3D scene reads its colors from CSS tokens.
const root = document.documentElement, darkQuery = matchMedia('(prefers-color-scheme: dark)');
let theme = store.get('cube-theme', null);
if (theme !== 'light' && theme !== 'dark') theme = null;
const isDark = () => theme ? theme === 'dark' : darkQuery.matches;
const token = name => getComputedStyle(root).getPropertyValue(name).trim();
const palette = { faces: [], body: '', dim: '', arrow: '', arrowHalo: '' };
// Returns false while the stylesheet isn't applied yet (the tokens read as empty); the render loop then retries.
function applyTheme() {
  if (theme) root.dataset.theme = theme; else delete root.dataset.theme;
  const label = isDark() ? '切换到浅色模式' : '切换到深色模式';
  document.querySelectorAll('[data-theme-toggle]').forEach(b => { b.innerHTML = icon(isDark() ? 'sun' : 'moon'); b.title = label; b.setAttribute('aria-label', label); });
  refreshIcons();
  if (!token('--cube-body')) return false;
  palette.faces = ['red', 'orange', 'yellow', 'white', 'green', 'blue'].map(c => token(`--cube-${c}`));
  Object.assign(palette, { body: token('--cube-body'), dim: token('--cube-dim'), arrow: token('--cube-arrow'), arrowHalo: token('--cube-arrow-halo') });
  document.querySelector('meta[name="theme-color"]').content = token('--bg');
  return true;
}
let themeReady = applyTheme();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(34, 1, .1, 100);
camera.position.set(6.6, 5.1, 7.5);
// Layer 1 holds only the turn guide, so it can be drawn in its own pass while a layer turns.
const GUIDE_LAYER = 1; camera.layers.enable(GUIDE_LAYER);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
$('#viewport').prepend(renderer.domElement);
const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
let swipe = null;
function castPointer(e) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.set((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
}
renderer.domElement.addEventListener('pointerdown', e => {
  if (mode === 'learn' || swipe || !e.isPrimary) return;
  castPointer(e);
  const hit = raycaster.intersectObjects(cubies, true)[0];
  if (!hit) return;
  const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld).round();
  const cubie = hit.object.parent;
  swipe = { id: e.pointerId, plane: new THREE.Plane().setFromNormalAndCoplanarPoint(normal, hit.point), start: hit.point.clone(), normal: normal.toArray(), pos: [...cubie.userData.pos] };
  controls.enabled = false; renderer.domElement.setPointerCapture(e.pointerId);
});
renderer.domElement.addEventListener('pointermove', e => {
  if (!swipe || e.pointerId !== swipe.id || swipe.done) return;
  castPointer(e);
  const point = raycaster.ray.intersectPlane(swipe.plane, new THREE.Vector3());
  if (!point || point.distanceTo(swipe.start) < .4) return;
  swipe.done = true;
  const move = moveFromDrag(swipe.normal, point.sub(swipe.start).toArray(), swipe.pos);
  if (move) { requestMove(move); markHintSeen('swipe'); } else toast('中间层暂不支持滑动，请滑动外侧的一层');
});
const endSwipe = e => { if (swipe && e.pointerId === swipe.id) { swipe = null; controls.enabled = true; } };
renderer.domElement.addEventListener('pointerup', endSwipe);
renderer.domElement.addEventListener('pointercancel', endSwipe);
const controls = new OrbitControls(camera, renderer.domElement);
controls.addEventListener('change', () => { if (arrow.visible) updateArrow(); });
controls.enableDamping = true; controls.enablePan = false; controls.minDistance = 6; controls.maxDistance = 16;
scene.add(new THREE.AmbientLight(0xffffff, 2.5));
const light = new THREE.DirectionalLight(0xffffff, 3.0); light.position.set(3, 8, 5); scene.add(light);
const cubeRoot = new THREE.Group(); scene.add(cubeRoot);
let cubies = [];
const stickerGeo = new THREE.PlaneGeometry(.855, .855), bodyGeo = new THREE.BoxGeometry(.975, .975, .975);
const bodyMaterial = new THREE.MeshStandardMaterial({ color: palette.body, roughness: .55 });
function makeCube() {
  for (const cubie of cubies) { cubeRoot.remove(cubie); cubie.traverse(o => { if (o.userData.sticker) o.material.dispose(); }); }
  cubies = [];
  for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
    if (x === 0 && y === 0 && z === 0) continue;
    const group = new THREE.Group(); group.position.set(x, y, z); group.userData.pos = [x, y, z]; group.userData.home = [x, y, z];
    group.add(new THREE.Mesh(bodyGeo, bodyMaterial));
    const coords = [x, x, y, y, z, z];
    for (let f = 0; f < 6; f++) {
      if (coords[f] !== (f % 2 ? -1 : 1)) continue;
      const mat = new THREE.MeshStandardMaterial({ color: palette.faces[f], roughness: .42, metalness: .01 });
      const mesh = new THREE.Mesh(stickerGeo, mat); mesh.userData.face = f; mesh.userData.sticker = true;
      if (f === 0) { mesh.rotation.y = Math.PI / 2; mesh.position.x = .491; }
      if (f === 1) { mesh.rotation.y = -Math.PI / 2; mesh.position.x = -.491; }
      if (f === 2) { mesh.rotation.x = -Math.PI / 2; mesh.position.y = .491; }
      if (f === 3) { mesh.rotation.x = Math.PI / 2; mesh.position.y = -.491; }
      if (f === 4) mesh.position.z = .491;
      if (f === 5) { mesh.rotation.y = Math.PI; mesh.position.z = -.491; }
      group.add(mesh);
    }
    cubeRoot.add(group); cubies.push(group);
  }
}
function applyInstant(move) {
  const { axis, layer, turns } = parseMove(move); const axisVector = new THREE.Vector3(...[0, 1, 2].map(i => i === axis ? 1 : 0));
  const q = new THREE.Quaternion().setFromAxisAngle(axisVector, turns * Math.PI / 2);
  cubies.filter(c => c.userData.pos[axis] === layer).forEach(c => { c.userData.pos = rotatePosition(c.userData.pos, axis, turns); c.position.set(...c.userData.pos); c.quaternion.premultiply(q); });
}
// Turn guide: a solid curved arrow that wraps the turning layer just above its stickers. It follows a rounded square
// around the layer, centered on the edge nearest the camera; the halo keeps it readable over any sticker color.
const RING = 1.6, BEND = .2, TUBE = .075, HEAD = [.2, .44], HALO = .04;
const arrowMaterial = new THREE.MeshBasicMaterial({ color: palette.arrow });
const haloMaterial = new THREE.MeshBasicMaterial({ color: palette.arrowHalo, side: THREE.BackSide });
const arrow = new THREE.Group(); scene.add(arrow);
let arrowKey = '';
const arrowTip = new THREE.Vector3(), projected = new THREE.Vector3(), origin = new THREE.Vector3();
const cubeCorners = [-1.5, 1.5].flatMap(x => [-1.5, 1.5].flatMap(y => [-1.5, 1.5].map(z => new THREE.Vector3(x, y, z))));
// Where a ray at angle theta (in the layer plane) meets the rounded square of half-width RING and corner radius BEND.
function ringPoint(theta) {
  const c = Math.cos(theta), s = Math.sin(theta), hi = Math.max(Math.abs(c), Math.abs(s)), lo = Math.min(Math.abs(c), Math.abs(s)), k = RING - BEND;
  let d = RING / hi;
  if (d * lo > k) { const m = k * (hi + lo); d = m + Math.sqrt(m * m - 2 * k * k + BEND * BEND); }
  return [c * d, s * d];
}
// The plane axes (axis+1, axis+2) are ordered so that increasing theta is a positive turn about the axis.
class LayerArc extends THREE.Curve {
  constructor(axis, offset, from, to) { super(); Object.assign(this, { axis, offset, from, to }); }
  getPoint(t, target = new THREE.Vector3()) {
    const [u, v] = ringPoint(this.from + (this.to - this.from) * t);
    return target.setComponent(this.axis, this.offset).setComponent((this.axis + 1) % 3, u).setComponent((this.axis + 2) % 3, v);
  }
}
// A half turn's arc is about a third longer than a quarter turn's (about 106° against 81°); a near-half-ring arc
// wrapped two whole faces and read as too long. The move label already says 180° and counts the two turns.
function buildArrow(axis, layer, turns, center) {
  const dir = Math.sign(turns), half = Math.abs(turns) === 2;
  const curve = new LayerArc(axis, layer, center - dir * (half ? 1 : .8), center + dir * (half ? .85 : .62));
  const end = curve.getPoint(1); arrowTip.copy(end);
  const tangent = curve.getTangent(1), spin = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
  const head = (r, h, back) => { const g = new THREE.ConeGeometry(r, h, 28); g.translate(0, h / 2 - back, 0); g.applyQuaternion(spin); g.translate(...end.toArray()); return g; };
  const tail = r => new THREE.SphereGeometry(r, 16, 12).translate(...curve.getPoint(0).toArray());
  arrow.children.forEach(m => m.geometry.dispose()); arrow.clear();
  [[new THREE.TubeGeometry(curve, 96, TUBE + HALO, 12), head(HEAD[0] + HALO * 1.6, HEAD[1] + HALO * 3.4, HALO * 1.2), tail(TUBE + HALO)], [new THREE.TubeGeometry(curve, 96, TUBE, 12), head(...HEAD, 0), tail(TUBE)]]
    .forEach((geos, i) => geos.forEach(g => { const mesh = new THREE.Mesh(g, i ? arrowMaterial : haloMaterial); mesh.layers.set(GUIDE_LAYER); arrow.add(mesh); }));
}
const focusTargets = {
  centers: (x, y, z) => Math.abs(x) + Math.abs(y) + Math.abs(z) === 1,
  cross: (x, y, z, edge) => y === -1 && edge,
  corner: (x, y, z) => x === 1 && y === -1 && z === 1,
  middle: (x, y, z, edge) => y === 0 && edge,
  'top-edges': (x, y, z, edge) => y === 1 && edge,
  'top-corners': (x, y, z) => y === 1 && Math.abs(x) + Math.abs(z) === 2,
};
function focusCube() {
  cubies.forEach(c => {
    const [x, y, z] = c.userData.home;
    const target = focusTargets[lesson.focus](x, y, z, [x, y, z].filter(v => v !== 0).length === 2);
    c.children.filter(o => o.userData.sticker).forEach(s => s.material.color.set(focus && !target ? palette.dim : palette.faces[s.userData.face]));
  });
  updateArrow();
}
function guideMove() { return activeMove ?? pendingHalf ?? lesson.formula[step] ?? null; }
function updateArrow() {
  const move = guideMove();
  arrow.visible = arrows && mode !== 'sandbox' && !!move;
  $('#viewport').dataset.guideMove = arrow.visible ? move : '';
  if (!arrow.visible) return;
  const { axis, layer, turns } = parseMove(move);
  // Snap the arc to the corner of the layer's ring that faces the camera, so it stays in view as the learner orbits.
  const cam = camera.position, phi = Math.atan2(cam.getComponent((axis + 2) % 3), cam.getComponent((axis + 1) % 3));
  const center = Math.PI / 4 + Math.round((phi - Math.PI / 4) / (Math.PI / 2)) * Math.PI / 2, key = `${move} ${center.toFixed(2)}`;
  if (key !== arrowKey) { arrowKey = key; buildArrow(axis, layer, turns, center); }
}
async function turn(move, direction = 'forward') {
  if (busy) return false;
  busy = true; activeMove = move; activeDirection = direction; renderStep();
  const { axis, layer, turns } = parseMove(move), pivot = new THREE.Group(); cubeRoot.add(pivot); turning = pivot;
  const affected = cubies.filter(c => c.userData.pos[axis] === layer);
  affected.forEach(c => pivot.attach(c));
  // A half turn plays as two separate quarter turns with a short hold between them, so it reads as "turn twice".
  const beats = Math.abs(turns), sign = Math.sign(turns), beat = 470 / speed, hold = 90 / speed, start = performance.now();
  const ease = t => t * t * (3 - 2 * t);
  let shownBeat = -1;
  await new Promise(resolve => {
    function animate(now) {
      const elapsed = now - start, index = Math.min(Math.floor(elapsed / (beat + hold)), beats - 1);
      const local = Math.min((elapsed - index * (beat + hold)) / beat, 1);
      pivot.rotation[['x', 'y', 'z'][axis]] = sign * (index + ease(local)) * Math.PI / 2;
      if (beats > 1 && index !== shownBeat) { shownBeat = index; $('#move-tag-text').textContent = `${moveText(move)} · 第 ${index + 1} 次`; }
      if (index < beats - 1 || local < 1) requestAnimationFrame(animate); else resolve();
    }
    requestAnimationFrame(animate);
  });
  affected.forEach(c => { cubeRoot.attach(c); c.userData.pos = rotatePosition(c.userData.pos, axis, turns); c.position.set(...c.userData.pos); });
  cubeRoot.remove(pivot); turning = null; busy = false; activeMove = null; activeDirection = 'forward'; syncControls(); return true;
}
new ResizeObserver(() => { const el = $('#viewport'); camera.aspect = el.clientWidth / el.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(el.clientWidth, el.clientHeight); }).observe($('#viewport'));
// The move label floats beside the arrowhead, pushed away from the cube's center on screen so it never covers the cube.
function placeMoveTag() {
  const tag = $('#move-tag'), el = $('#viewport'), w = el.clientWidth, h = el.clientHeight;
  if (!tag.classList.contains('visible')) return;
  // Narrow viewports have no room beside the cube; the label docks at the bottom instead.
  const docked = w < 520; tag.classList.toggle('docked', docked);
  if (docked) { tag.style.transform = ''; return; }
  const toScreen = v => { projected.copy(v).project(camera); return [(projected.x + 1) / 2 * w, (1 - projected.y) / 2 * h]; };
  const [cx, cy] = toScreen(origin), [tx, ty] = toScreen(arrowTip), len = Math.hypot(tx - cx, ty - cy) || 1;
  // Clear the circle that encloses the cube's projected corners, measured from the cube's center along the arrowhead direction.
  const radius = Math.max(...cubeCorners.map(c => { const [px, py] = toScreen(c); return Math.hypot(px - cx, py - cy); }));
  const half = Math.hypot(tag.offsetWidth, tag.offsetHeight) / 2, pad = 10, dist = Math.max(len + 16 + half, radius + half * .75);
  const x = Math.min(Math.max(cx + (tx - cx) / len * dist, tag.offsetWidth / 2 + pad), w - tag.offsetWidth / 2 - pad);
  const y = Math.min(Math.max(cy + (ty - cy) / len * dist, tag.offsetHeight / 2 + pad), h - tag.offsetHeight / 2 - pad);
  tag.style.transform = `translate(${x - tag.offsetWidth / 2}px, ${y - tag.offsetHeight / 2}px)`;
  // Hide the first-use hint while the label sits on top of it.
  const hint = $('.drag-hint');
  if (!hint.hidden) {
    const a = tag.getBoundingClientRect(), b = hint.getBoundingClientRect();
    el.classList.toggle('tag-low', a.left < b.right + 8 && b.left < a.right + 8 && a.top < b.bottom + 8 && b.top < a.bottom + 8);
  }
}
// A turning layer's corners sweep out past the guide's ring and would hide it mid-turn. While a layer turns, the guide
// is depth-tested only against the layers that stay still: draw the scene, then rebuild depth from the still layers
// alone, then draw the guide on top of that.
let turning = null;
const depthOnly = new THREE.MeshBasicMaterial({ colorWrite: false });
function renderFrame() {
  if (!turning || !arrow.visible) { renderer.render(scene, camera); return; }
  arrow.visible = false; renderer.render(scene, camera);
  renderer.autoClear = false; renderer.clearDepth();
  turning.visible = false; scene.overrideMaterial = depthOnly; renderer.render(scene, camera);
  scene.overrideMaterial = null; turning.visible = true; arrow.visible = true;
  camera.layers.set(GUIDE_LAYER); renderer.render(scene, camera);
  camera.layers.enableAll(); renderer.autoClear = true;
}
renderer.setAnimationLoop(() => {
  // WebKit can apply the stylesheet after this module runs; pick up the scene colors as soon as it does.
  if (!themeReady) themeReady = retheme();
  controls.update(); renderFrame(); placeMoveTag();
});

function renderNavigation() {
  const items = lessons.map((l, i) => `<button class="nav-item ${i === selected ? 'selected' : ''}" data-lesson="${i}" ${i === selected ? 'aria-current="true"' : ''}><span class="nav-number ${completed.includes(i) ? 'done' : ''}">${completed.includes(i) ? icon('check') : i === 0 ? icon('box') : `0${i}`}</span><span>${l.title}</span>${i === selected ? '<span class="nav-current"></span>' : ''}</button>`).join('');
  $('#lessons').innerHTML = items; $('#sheet-lessons').innerHTML = items;
  const progress = `${completed.length} / ${lessons.length}`;
  $('#progress-label').textContent = progress; $('#progress').style.width = `${completed.length / lessons.length * 100}%`;
  // Small screens: a sticky bar with previous / next and a sheet listing every lesson.
  $('#lesson-bar-kicker').textContent = `${lessons[selected].label} · 已完成 ${progress}`; $('#lesson-bar-name').textContent = lessons[selected].title;
  $('#sheet-progress').textContent = `入门课程 · 已完成 ${progress}`;
  $('#lesson-prev').disabled = selected === 0; $('#lesson-next').disabled = selected === lessons.length - 1;
  refreshIcons();
}
function syncControls() {
  $('#prev').disabled = busy || step === 0 || mode !== 'learn'; $('#next').disabled = busy || step === lesson.formula.length || mode !== 'learn';
  $('#reset').disabled = busy;
  document.querySelectorAll('[data-case]').forEach(b => { b.disabled = busy; });
}
function readCubeState() {
  cubeRoot.updateMatrixWorld(true);
  return cubies.map(c => ({
    home: c.userData.home,
    pos: c.position.toArray().map(Math.round),
    stickers: c.children.filter(s => s.userData.sticker).map(s => ({
      face: s.userData.face,
      normal: new THREE.Vector3(0, 0, 1).applyQuaternion(s.getWorldQuaternion(new THREE.Quaternion())).round().toArray(),
    })),
  }));
}
const caseKey = () => `${selected}:${lesson.id}`;
// Lessons with several starting cases show them as chips; a check marks cases already passed in practice.
function renderCases() {
  const cases = lessons[selected].cases;
  $('#case-chips').hidden = cases.length < 2;
  $('#case-chips').innerHTML = cases.map((c, i) => {
    const passed = passedCases.has(`${selected}:${c.id}`);
    return `<button class="case-chip ${i === caseIndex ? 'active' : ''} ${passed ? 'passed' : ''}" data-case="${i}" role="radio" aria-checked="${i === caseIndex}" ${passed ? 'title="已跟练通过"' : ''}>${passed ? icon('check') : ''}${c.name}</button>`;
  }).join('');
  refreshIcons();
}
function renderGoal() {
  if (busy) return;
  const status = $('#goal-status');
  if (mode === 'sandbox') {
    const result = evaluateGoal(readCubeState(), 'solved');
    status.dataset.met = String(result.achieved); status.classList.toggle('passed', result.achieved);
    $('#goal').textContent = '还原六面';
    status.textContent = result.achieved ? '✓ 已还原' : `${result.correct} / ${result.total}`; status.title = result.achieved ? '' : `${result.correct} / ${result.total} 块归位`;
    return;
  }
  const result = evaluateGoal(readCubeState(), lesson.goalType, { step, totalSteps: lesson.formula.length });
  const finished = step === lesson.formula.length && !pendingHalf;
  const passed = finished && result.achieved;
  status.dataset.met = String(passed); status.classList.toggle('passed', passed);
  $('#goal').textContent = lesson.goal;
  status.textContent = passed ? '✓ 已达成' : !result.prerequisite ? '需保持已完成的层' : finished ? '未达成，请重置' : `${result.correct} / ${result.total}`;
  status.title = `${result.label} ${result.correct} / ${result.total}`;
  if (passed && mode === 'practice' && !passedCases.has(caseKey())) {
    passedCases.add(caseKey()); store.set('cube-passed-cases', [...passedCases]);
    if (lessons[selected].cases.every(c => passedCases.has(`${selected}:${c.id}`)) && !completed.includes(selected)) {
      completed.push(selected); store.set('cube-completed', completed); renderNavigation();
    }
    renderCases(); toast('目标已达成！本局面跟练进度已保存。');
  }
}
const notation = move => move.replace("'", '′');
function practicePrompt() {
  if (step === lesson.formula.length) return $('#goal-status').dataset.met === 'true' ? '做到了！目标已达成，本局面已记录。' : '动作已做完，但目标未达成。请重置后再练。';
  const move = lesson.formula[step];
  if (pendingHalf) return `很好，再转一次 ${notation(pendingHalf)}，完成 180° 半转。`;
  return `轮到你了：请转动 ${notation(move)} · ${moveText(move)}${move.endsWith('2') ? '（连转两次同一面）' : ''}`;
}
function renderStep() {
  updateArrow();
  const displayStep = activeMove && activeDirection === 'backward' ? step - 1 : step;
  $('#formula').innerHTML = lesson.formula.map((m, i) => `<button class="formula-move ${i === displayStep ? 'current' : ''} ${i < displayStep ? 'finished' : ''}" data-step="${i}" ${mode === 'learn' ? `aria-label="跳到第 ${i + 1} 步"` : 'tabindex="-1"'}>${notation(m)}<small>${i + 1}</small></button>`).join('');
  $('#formula').classList.toggle('locked', mode !== 'learn');
  $('#step-status').textContent = `动作 ${step} / ${lesson.formula.length}`;
  $('#timeline-fill').style.width = `${step / lesson.formula.length * 100}%`;
  const idx = Math.max(0, Math.min(displayStep, lesson.formula.length - 1)), move = guideMove();
  const label = activeDirection === 'backward' || pendingHalf ? null : lesson.stepLabels?.[idx];
  const tag = $('#move-tag'), letter = move ? notation(move) : '';
  tag.classList.toggle('visible', arrow.visible);
  if ($('#move-tag-letter').textContent !== letter || tag.dataset.step !== String(displayStep)) {
    $('#move-tag-letter').textContent = letter; tag.dataset.step = displayStep;
    tag.classList.remove('pop'); void tag.offsetWidth; tag.classList.add('pop');
  }
  $('#move-tag-text').textContent = move ? (label ? `${label} · ${moveText(move)}` : moveText(move)) : ''; // turn() adds the beat count to half turns
  $('#case-note').textContent = lesson.stages?.filter(s => s.start <= displayStep).at(-1)?.text ?? lesson.note;
  renderGoal();
  syncControls();
  $('#play').innerHTML = icon(playing ? 'pause' : 'play'); $('#play').setAttribute('aria-label', playing ? '暂停' : '播放');
  $('#play').disabled = mode !== 'learn';
  if (mode === 'practice') $('#practice-message').textContent = practicePrompt();
  refreshIcons();
}
function reset() {
  playing = false; generation++; playRun++; step = 0; pendingHalf = null; activeMove = null; makeCube();
  if (mode !== 'sandbox') lesson.setup.forEach(applyInstant);
  focusCube(); renderStep();
}
function selectLesson(i, nextCase = 0) {
  if (busy) return;
  selected = i; caseIndex = nextCase; lesson = resolveLesson(i, caseIndex); store.set('cube-lesson', i); mode = 'learn';
  $('#heading').textContent = lesson.intro;
  $('#lesson-kicker').textContent = `${lesson.label} · ${lesson.time}`;
  $('#lesson-title').textContent = lesson.title; $('#lesson-desc').textContent = lesson.desc; $('#goal').textContent = lesson.goal;
  $('#tip').textContent = lesson.tip; $('#detail').textContent = lesson.detail;
  $('#formula-title').textContent = lesson.algorithm ?? lesson.formulaTitle ?? '本节动作公式';
  $('#complete').innerHTML = `${caseIndex < lessons[selected].cases.length - 1 ? '下一个局面' : selected === lessons.length - 1 ? '返回第一节' : '继续下一节'} ${icon('arrow-right')}`;
  updateMode(); renderNavigation(); renderCases(); reset();
}
function updateMode() {
  document.querySelectorAll('.mode-tabs [data-mode]').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  $('#view-label').textContent = mode === 'sandbox' ? '自由练习 · 随心转动' : '白色底面 · 黄色朝上';
  updateDragHint();
  document.body.dataset.mode = mode;
  if (mode !== 'practice') $('#practice-message').textContent = mode === 'sandbox' ? '随心转动，重置可恢复六面。' : coarse ? '点按下方按键转动魔方' : '点击按键或按键盘字母转动魔方';
  refreshIcons();
}
// Mode changes made by the learner: on phones, bring the cube and the move pad into view together.
function switchMode(next) {
  if (busy) return;
  mode = next; updateMode(); reset();
  if (isPhone() && mode !== 'learn') $('.cube-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
async function next() {
  if (busy || step >= lesson.formula.length || mode === 'sandbox') return;
  const token = generation; await turn(lesson.formula[step]); if (token !== generation) return; step++; renderStep();
}
async function playback() {
  if (mode === 'sandbox' || mode === 'practice') { if (mode === 'practice') toast('跟练模式下，请用下方按键完成动作'); return; }
  if (playing) { playing = false; playRun++; renderStep(); return; }
  if (busy) return;
  if (step >= lesson.formula.length) reset();
  playing = true; const token = generation, run = ++playRun; renderStep();
  while (playing && step < lesson.formula.length && token === generation && run === playRun) { await next(); await new Promise(r => setTimeout(r, 340 / speed)); }
  if (token === generation && run === playRun) { playing = false; renderStep(); }
}
let reversed = false, moveQueue = Promise.resolve(), queued = 0;
const idle = () => new Promise(resolve => { const check = () => busy ? requestAnimationFrame(check) : resolve(); check(); });
// Quick taps are queued (up to three) so no input is lost while a layer is still turning.
function requestMove(move) {
  if (playing || queued >= 3) return;
  if (mode === 'learn') { mode = 'sandbox'; updateMode(); focusCube(); renderStep(); toast('已切换到自由练习，重置可恢复六面'); }
  const token = generation; queued++;
  moveQueue = moveQueue.then(async () => { await idle(); if (token === generation) await performMove(move); }).finally(() => queued--);
}
function wrongMove(message) {
  $('#move-keys').classList.remove('shake'); void $('#move-keys').offsetWidth; $('#move-keys').classList.add('shake'); navigator.vibrate?.(70); toast(message);
}
async function performMove(move) {
  if (mode !== 'practice') { await turn(move); renderStep(); return; }
  const expected = lesson.formula[step];
  if (!expected) return toast('本组动作已完成，点击重置再试一次');
  const result = practiceStep(expected, move, pendingHalf);
  if (result === 'wrong') return wrongMove(pendingHalf ? `半转还差一下：再转一次 ${notation(pendingHalf)}，或转 ${notation(inverse(pendingHalf))} 撤销` : `再观察一下，这一步是 ${notation(expected)}`);
  const token = generation; await turn(move); if (token !== generation) return;
  if (result === 'half-start') pendingHalf = move;
  else { if (result !== 'half-undo') step++; pendingHalf = null; }
  navigator.vibrate?.(12); renderStep();
}
let toastTimer;
function toast(message) { $('#toast').textContent = message; $('#toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3000); }
$('#move-keys').innerHTML = ['U', 'D', 'L', 'R', 'F', 'B'].map((m, i) => `<button data-move="${m}" aria-label="${['顶层', '底层', '左面', '右面', '前面', '后面'][i]} ${m}"><b>${m}</b><span>${['顶层', '底层', '左面', '右面', '前面', '后面'][i]}</span><small>↻</small></button>`).join('');
$('#lessons').onclick = e => { const b = e.target.closest('[data-lesson]'); if (b) selectLesson(Number(b.dataset.lesson)); };
// Lesson changes from the small-screen bar bring the new lesson's intro into view.
function goToLesson(i) {
  if (busy || !lessons[i]) return;
  selectLesson(i); $('#lesson-sheet').close();
  window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}
$('#sheet-lessons').onclick = e => { const b = e.target.closest('[data-lesson]'); if (b) goToLesson(Number(b.dataset.lesson)); };
$('#lesson-prev').onclick = () => goToLesson(selected - 1);
$('#lesson-next').onclick = () => goToLesson(selected + 1);
$('#lesson-open').onclick = () => { $('#lesson-sheet').showModal(); $('#sheet-lessons .selected').scrollIntoView({ block: 'nearest' }); };
$('#close-sheet').onclick = () => $('#lesson-sheet').close();
$('#lesson-sheet').onclick = e => { if (e.target === $('#lesson-sheet')) $('#lesson-sheet').close(); };
$('#play').onclick = playback; $('#next').onclick = next;
$('#prev').onclick = async () => { if (busy || step === 0 || mode !== 'learn') return; playing = false; playRun++; const token = generation; await turn(inverse(lesson.formula[step - 1]), 'backward'); if (token !== generation) return; step--; renderStep(); };
$('#reset').onclick = () => { if (!busy) { reset(); toast(mode === 'sandbox' ? '已恢复六面复原态' : '已回到本节起始局面'); } };
$('#speed').onclick = () => { speed = speed === 1 ? 1.5 : speed === 1.5 ? .5 : 1; $('#speed').innerHTML = `${speed}× <span>速度</span>`; };
// On phones the speed control sits in the switch row, away from the play button, so it isn't tapped by accident.
const phoneQuery = matchMedia('(max-width: 620px)');
const placeSpeed = () => (phoneQuery.matches ? $('.cube-options') : $('.transport')).append($('#speed'));
placeSpeed(); phoneQuery.addEventListener('change', placeSpeed);
$('#focus').onchange = e => { focus = e.target.checked; focusCube(); };
$('#arrows').onchange = e => { arrows = e.target.checked; focusCube(); renderStep(); };
$('#view-reset').onclick = () => { camera.position.set(6.6, 5.1, 7.5); controls.target.set(0, 0, 0); controls.update(); };
document.querySelectorAll('.mode-tabs [data-mode]').forEach(b => b.onclick = () => switchMode(b.dataset.mode));
$('#move-keys').onclick = e => { const b = e.target.closest('[data-move]'); if (b) requestMove(b.dataset.move + (reversed ? "'" : '')); };
$('#inverse').onclick = () => { reversed = !reversed; $('#inverse').classList.toggle('on', reversed); $('#inverse').setAttribute('aria-pressed', String(reversed)); document.querySelectorAll('[data-move] small').forEach(el => el.textContent = reversed ? '↺' : '↻'); };
$('#scramble').onclick = async () => {
  if (busy || playing) return;
  switchMode('sandbox');
  const faces = ['R', 'L', 'U', 'D', 'F', 'B']; let previous = ''; const moves = [];
  for (let i = 0; i < 22; i++) { const options = faces.filter(f => f !== previous); previous = options[Math.floor(Math.random() * options.length)]; moves.push(previous + ['', "'", '2'][Math.floor(Math.random() * 3)]); }
  moves.forEach(applyInstant); renderGoal(); $('#practice-message').textContent = `已随机打乱 22 步。试着自己还原吧！`; toast('新的挑战准备好了');
};
function selectCase(index) {
  const previousMode = mode; selectLesson(selected, index);
  if (previousMode === 'practice') switchMode('practice');
}
$('#complete').onclick = () => { if (busy) return; if (caseIndex < lessons[selected].cases.length - 1) selectCase(caseIndex + 1); else selectLesson(selected === lessons.length - 1 ? 0 : selected + 1); };
$('#case-chips').onclick = e => { const b = e.target.closest('[data-case]'); if (b && Number(b.dataset.case) !== caseIndex) selectCase(Number(b.dataset.case)); };
$('#formula').onclick = e => { const b = e.target.closest('[data-step]'); if (!b || busy || mode !== 'learn') return; const target = Number(b.dataset.step); reset(); for (let i = 0; i < target; i++) applyInstant(lesson.formula[i]); step = target; renderStep(); };
document.querySelectorAll('[data-theme-toggle]').forEach(b => b.onclick = () => {
  const next = isDark() ? 'light' : 'dark';
  theme = next === (darkQuery.matches ? 'dark' : 'light') ? null : next;
  store.set('cube-theme', theme); retheme();
});
function retheme() {
  if (!applyTheme()) return false;
  bodyMaterial.color.set(palette.body); arrowMaterial.color.set(palette.arrow); haloMaterial.color.set(palette.arrowHalo);
  focusCube(); renderStep(); return true;
}
darkQuery.addEventListener('change', () => { if (!theme) retheme(); });
document.querySelectorAll('[data-open-help], #more-help').forEach(b => b.onclick = () => { $('#lesson-sheet').close(); $('#help-dialog').showModal(); });
// Usage hints show until the learner has tried each gesture once.
const hintsSeen = { orbit: store.get('cube-hint-orbit', false) === true, swipe: store.get('cube-hint-swipe', false) === true };
function updateDragHint() {
  const kind = mode === 'learn' ? 'orbit' : 'swipe';
  $('#drag-hint').textContent = kind === 'orbit' ? '拖动魔方，换个角度观察' : coarse ? '在魔方上滑动，也能转动那一层' : '在魔方面上拖动，也能转动那一层';
  $('.drag-hint').hidden = hintsSeen[kind];
}
function markHintSeen(kind) {
  if (hintsSeen[kind]) return;
  hintsSeen[kind] = true; store.set(`cube-hint-${kind}`, true); updateDragHint();
}
controls.addEventListener('start', () => markHintSeen('orbit'));
$('#close-help').onclick = () => $('#help-dialog').close();
$('#help-dialog').onclick = e => { if (e.target === $('#help-dialog')) $('#help-dialog').close(); };
$('.brand').onclick = e => { e.preventDefault(); selectLesson(0); };
window.addEventListener('keydown', e => {
  if (document.querySelector('dialog[open]') || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
  const key = e.key.toUpperCase();
  if ('UDLRFB'.includes(key) && key.length === 1) { e.preventDefault(); requestMove(key + (e.shiftKey || reversed ? "'" : '')); }
  else if (e.code === 'Space' && e.target.tagName !== 'BUTTON') { e.preventDefault(); playback(); }
  else if (e.key === 'ArrowRight' && mode === 'learn') { e.preventDefault(); next(); }
  else if (e.key === 'ArrowLeft' && mode === 'learn') { e.preventDefault(); $('#prev').click(); }
});
selectLesson(selected);
