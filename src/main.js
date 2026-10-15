import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createIcons, Box, Sprout, Check, Cloud, CircleHelp, Blocks, ArrowUpRight, PlayCircle, Hand, Scan, Move, Mouse, RotateCcw, SkipBack, Play, Pause, SkipForward, Focus, Lightbulb, ArrowRight, Keyboard, Shuffle, Bookmark, X, BookOpen, Moon, Sun } from 'lucide';
import { parseMove, rotatePosition, inverse, moveFromDrag, practiceStep } from './cube.js';
import { lessons, moveText } from './lessons.js';

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
const coarse = matchMedia('(pointer: coarse)').matches;
const isPhone = () => matchMedia('(max-width: 620px)').matches;
let mode = 'learn', step = 0, playing = false, busy = false, speed = 1, focus = false, arrows = true, pendingHalf = null, generation = 0, playRun = 0;
let lesson = lessons[selected];
document.querySelector('#app').innerHTML = `
<aside class="sidebar">
  <a class="brand" href="#" aria-label="方寸首页"><span class="brand-mark">${icon('box')}</span><span>方寸<span class="brand-en">CUBE TUTOR</span></span></a>
  <div class="course-label">你的第一颗魔方 <span>入门课程</span></div>
  <nav id="lessons" aria-label="课程章节"></nav>
  <div class="sidebar-bottom"><div class="little-cube">${icon('sprout')}</div><h4>慢慢来，比较快。</h4><p>每一个高手，都从第一次转动开始。</p><div class="progress-label"><span>学习进度</span><b id="progress-label"></b></div><div class="progress-track"><span id="progress"></span></div></div>
  <div class="sidebar-footer"><span class="status-dot"></span>为每一个「我不会」而设计</div>
</aside>
<div class="main-shell">
  <header><div class="breadcrumb">入门课程 <span>/</span> <b id="crumb"></b></div><div class="header-right"><span>${icon('cloud')} 进度自动保存</span><button class="icon-button" id="theme"></button><button class="icon-button" id="help" title="操作说明" aria-label="操作说明">${icon('circle-help')}</button><div class="avatar">Hi</div></div></header>
  <main>
    <section class="page-heading"><div><div class="eyebrow"><span></span> LET’S MAKE IT CLICK</div><h1 id="heading"></h1><p>不用背下来。看一遍，转一遍，手就记住了。</p></div><button id="sandbox" class="outline-button">${icon('blocks')} 自由练习 ${icon('arrow-up-right')}</button></section>
    <div class="workspace">
      <section class="cube-card"><div class="cube-top"><div class="mode-tabs"><button data-mode="learn" class="active">${icon('play-circle')} 动画教学</button><button data-mode="practice">${icon('hand')} 跟我练习</button></div><span class="live-badge"><span></span> 3D 实时演示</span></div>
        <div class="viewport" id="viewport"><div class="view-label"><span class="view-dot"></span><span id="view-label">白色底面 · 黄色朝上</span></div><button class="view-reset icon-button" id="view-reset" title="恢复默认视角" aria-label="恢复默认视角">${icon('scan')}</button><div class="move-tag" id="move-tag" aria-hidden="true"><b id="move-tag-letter"></b><span id="move-tag-text"></span></div><div class="drag-hint">${icon('move')} <span id="drag-hint"></span></div><div class="axis"><b class="axis-y">Y</b><b class="axis-z">Z</b><b class="axis-x">X</b><span></span></div></div>
        <div class="cube-options"><label><input id="focus" type="checkbox"/><span class="switch"></span> 聚焦目标块</label><label><input id="arrows" type="checkbox" checked/><span class="switch"></span> 转动指引</label><span class="orientation">${icon(coarse ? 'hand' : 'mouse')} ${coarse ? '双指缩放' : '滚轮缩放'}</span></div>
        <div class="playback"><div class="timeline"><span id="step-status">动作 0 / 4</span><div class="timeline-track"><span id="timeline-fill"></span></div><span id="duration">右手四步法</span></div><div class="transport"><button id="reset" class="icon-button" title="重置本节" aria-label="重置">${icon('rotate-ccw')}</button><div class="transport-center"><button id="prev" class="icon-button" title="上一步" aria-label="上一步">${icon('skip-back')}</button><button id="play" class="play-button" title="播放或暂停" aria-label="播放">${icon('play')}</button><button id="next" class="icon-button" title="下一步" aria-label="下一步">${icon('skip-forward')}</button></div><button id="speed" class="speed-button" title="切换播放速度">1× <span>速度</span></button></div></div>
      </section>
      <aside class="instruction-card"><div class="lesson-kicker" id="lesson-kicker"></div><h2 id="lesson-title"></h2><p id="lesson-desc" class="lesson-desc"></p><div class="goal-box">${icon('focus')}<div><span>这一节的小目标</span><strong id="goal"></strong></div></div><div class="formula-heading"><h3 id="formula-title">右手四步法</h3><span>跟着做就好</span></div><div id="formula" class="formula"></div><div class="action-detail"><span class="step-number" id="action-number">01</span><div><strong id="action-title">右手抬起</strong><span id="action-subtitle">右面顺时针转 90°</span></div><span class="action-arrow" id="action-arrow">↻</span></div><div class="coach-note">${icon('lightbulb')}<p id="tip"></p></div><button id="complete" class="complete-button">我学会了，下一节 ${icon('arrow-right')}</button><div class="no-rush">不着急，随时可以回来再练一次</div></aside>
    </div>
    <section class="bottom-grid"><div class="practice-card"><div class="section-title"><span class="section-icon">${icon('keyboard')}</span><div><h3>动手转一下</h3><p id="practice-message" aria-live="polite"></p></div><button id="inverse" class="inverse-button" aria-pressed="false">逆时针 <span>′</span></button></div><div class="move-keys" id="move-keys"></div><div class="key-hint"><span class="keyboard-only"><kbd>Shift</kbd> + 字母 = 逆时针</span><span class="keyboard-only"><kbd>Space</kbd> 播放 / 暂停</span><span class="touch-only">也可以直接在魔方上滑动转层</span><button id="scramble">${icon('shuffle')} 随机打乱</button></div></div><div class="knowledge-card"><div class="knowledge-title">${icon('bookmark')} 新手小贴士 <span>GOOD TO KNOW</span></div><h3>记动作，比记公式更容易。</h3><p id="detail"></p><button id="more-help">认识转动符号 ${icon('arrow-right')}</button></div></section>
    <footer><span>方寸之间，大有可为。</span><span>Made for your first solve <span class="footer-cube">✳</span></span></footer>
  </main>
</div><div id="toast" role="status"></div><dialog id="help-dialog"><button id="close-help" class="icon-button" aria-label="关闭">${icon('x')}</button><div class="eyebrow">A LITTLE HELP</div><h2>你的魔方，听你的。</h2><p>拖动魔方改变视角，滚轮或双指缩放。在「跟我练习」和「自由练习」中，按住魔方的一面滑动即可转动那一层；拖动魔方外的空白处旋转视角。</p><div class="help-grid"><b>R / L</b><span>右面 / 左面</span><b>U / D</b><span>顶层 / 底层</span><b>F / B</b><span>前面 / 后面</span><b>Shift + 字母</b><span>逆时针转动</span><b>Space</b><span>播放 / 暂停动画</span><b>← / →</b><span>后退 / 前进一步</span></div><p>所有顺逆时针都以正对该面的方向为准。跟练模式会按公式检查每个动作，半转可以连按两次同一个字母；自由练习可以任意转动。</p></dialog>`;
const $ = selector => document.querySelector(selector);
const refreshIcons = () => createIcons({ icons: { Box, Sprout, Check, Cloud, CircleHelp, Blocks, ArrowUpRight, PlayCircle, Hand, Scan, Move, Mouse, RotateCcw, SkipBack, Play, Pause, SkipForward, Focus, Lightbulb, ArrowRight, Keyboard, Shuffle, Bookmark, X, BookOpen, Moon, Sun }, attrs: { 'stroke-width': 1.7 } });

// Theme: follows the system unless the learner picks the other one; the 3D scene reads its colors from CSS tokens.
const root = document.documentElement, darkQuery = matchMedia('(prefers-color-scheme: dark)');
let theme = store.get('cube-theme', null);
if (theme !== 'light' && theme !== 'dark') theme = null;
const isDark = () => theme ? theme === 'dark' : darkQuery.matches;
const token = name => getComputedStyle(root).getPropertyValue(name).trim();
const palette = { faces: [], body: '', dim: '', arrow: '', arrowHalo: '' };
function applyTheme() {
  if (theme) root.dataset.theme = theme; else delete root.dataset.theme;
  palette.faces = ['red', 'orange', 'yellow', 'white', 'green', 'blue'].map(c => token(`--cube-${c}`));
  Object.assign(palette, { body: token('--cube-body'), dim: token('--cube-dim'), arrow: token('--cube-arrow'), arrowHalo: token('--cube-arrow-halo') });
  document.querySelector('meta[name="theme-color"]').content = token('--bg');
  const label = isDark() ? '切换到浅色模式' : '切换到深色模式';
  $('#theme').innerHTML = icon(isDark() ? 'sun' : 'moon'); $('#theme').title = label; $('#theme').setAttribute('aria-label', label);
  refreshIcons();
}
applyTheme();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(34, 1, .1, 100);
camera.position.set(6.6, 5.1, 7.5);
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
  if (move) requestMove(move); else toast('中间层暂不支持滑动，请滑动外侧的一层');
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
function buildArrow(axis, layer, turns, center) {
  const dir = Math.sign(turns), half = Math.abs(turns) === 2;
  const curve = new LayerArc(axis, layer, center - dir * (half ? 1.55 : .8), center + dir * (half ? 1.35 : .62));
  const end = curve.getPoint(1); arrowTip.copy(end);
  const tangent = curve.getTangent(1), spin = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
  const head = (r, h, back) => { const g = new THREE.ConeGeometry(r, h, 28); g.translate(0, h / 2 - back, 0); g.applyQuaternion(spin); g.translate(...end.toArray()); return g; };
  const tail = r => new THREE.SphereGeometry(r, 16, 12).translate(...curve.getPoint(0).toArray());
  arrow.children.forEach(m => m.geometry.dispose()); arrow.clear();
  [[new THREE.TubeGeometry(curve, 96, TUBE + HALO, 12), head(HEAD[0] + HALO * 1.6, HEAD[1] + HALO * 3.4, HALO * 1.2), tail(TUBE + HALO)], [new THREE.TubeGeometry(curve, 96, TUBE, 12), head(...HEAD, 0), tail(TUBE)]]
    .forEach((geos, i) => geos.forEach(g => arrow.add(new THREE.Mesh(g, i ? arrowMaterial : haloMaterial))));
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
  arrow.visible = arrows && mode !== 'sandbox';
  updateArrow();
}
function updateArrow() {
  const move = lesson.formula[Math.min(step, lesson.formula.length - 1)], { axis, layer, turns } = parseMove(move);
  // Snap the arc to the corner of the layer's ring that faces the camera, so it stays in view as the learner orbits.
  const cam = camera.position, phi = Math.atan2(cam.getComponent((axis + 2) % 3), cam.getComponent((axis + 1) % 3));
  const center = Math.PI / 4 + Math.round((phi - Math.PI / 4) / (Math.PI / 2)) * Math.PI / 2, key = `${move} ${center.toFixed(2)}`;
  if (key !== arrowKey) { arrowKey = key; buildArrow(axis, layer, turns, center); }
}
async function turn(move) {
  if (busy) return false;
  busy = true; syncControls();
  const { axis, layer, turns } = parseMove(move), pivot = new THREE.Group(); cubeRoot.add(pivot);
  const affected = cubies.filter(c => c.userData.pos[axis] === layer);
  affected.forEach(c => pivot.attach(c));
  const start = performance.now(), duration = (Math.abs(turns) === 2 ? 650 : 470) / speed;
  await new Promise(resolve => {
    function animate(now) {
      const t = Math.min((now - start) / duration, 1); const eased = t * t * (3 - 2 * t);
      pivot.rotation[['x', 'y', 'z'][axis]] = turns * Math.PI / 2 * eased;
      if (t < 1) requestAnimationFrame(animate); else resolve();
    }
    requestAnimationFrame(animate);
  });
  affected.forEach(c => { cubeRoot.attach(c); c.userData.pos = rotatePosition(c.userData.pos, axis, turns); c.position.set(...c.userData.pos); });
  cubeRoot.remove(pivot); busy = false; syncControls(); return true;
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
}
renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); placeMoveTag(); });

function renderNavigation() {
  $('#lessons').innerHTML = lessons.map((l, i) => `<button class="nav-item ${i === selected ? 'selected' : ''}" data-lesson="${i}"><span class="nav-number ${completed.includes(i) ? 'done' : ''}">${completed.includes(i) ? icon('check') : i === 0 ? icon('box') : `0${i}`}</span><span>${l.title}<small>${i === 0 ? '从这里开始' : l.en}</small></span>${i === selected ? '<span class="nav-current"></span>' : ''}</button>`).join('');
  $('#progress-label').textContent = `${completed.length} / ${lessons.length}`; $('#progress').style.width = `${completed.length / lessons.length * 100}%`; refreshIcons();
  // Keep the current lesson visible in the horizontal strip on small screens.
  const nav = $('#lessons'), current = nav.querySelector('.selected');
  if (nav.scrollWidth > nav.clientWidth) nav.scrollLeft = current.offsetLeft - (nav.clientWidth - current.offsetWidth) / 2;
}
function syncControls() {
  $('#prev').disabled = busy || step === 0 || mode !== 'learn'; $('#next').disabled = busy || step === lesson.formula.length || mode !== 'learn';
  $('#reset').disabled = busy;
}
const notation = move => move.replace("'", '′');
function practicePrompt() {
  if (step === lesson.formula.length) return '做到了！整组动作已完成，点击重置再练一次。';
  const move = lesson.formula[step];
  if (pendingHalf) return `很好，再转一次 ${notation(pendingHalf)}，完成 180° 半转。`;
  return `轮到你了：请转动 ${notation(move)} · ${moveText(move)}${move.endsWith('2') ? '（连转两次同一面）' : ''}`;
}
function renderStep() {
  updateArrow();
  $('#formula').innerHTML = lesson.formula.map((m, i) => `<button class="formula-move ${i === step ? 'current' : ''} ${i < step ? 'finished' : ''}" data-step="${i}" ${mode === 'learn' ? `aria-label="跳到第 ${i + 1} 步"` : 'tabindex="-1"'}>${notation(m)}<small>${i + 1}</small></button>`).join('');
  $('#formula').classList.toggle('locked', mode !== 'learn');
  $('#step-status').textContent = `动作 ${step} / ${lesson.formula.length}`;
  $('#timeline-fill').style.width = `${step / lesson.formula.length * 100}%`;
  const idx = Math.min(step, lesson.formula.length - 1), move = lesson.formula[idx];
  $('#action-number').textContent = String(idx + 1).padStart(2, '0');
  $('#action-title').textContent = step === lesson.formula.length ? '这组动作，完成了！' : lesson.stepLabels?.[idx] ?? moveText(move);
  $('#action-subtitle').textContent = step === lesson.formula.length ? '再播放一次，或者动手跟练吧' : moveText(move);
  $('#action-arrow').textContent = move.endsWith("'") ? '↺' : '↻';
  const tag = $('#move-tag'), letter = notation(move);
  tag.classList.toggle('visible', arrow.visible && step < lesson.formula.length);
  if ($('#move-tag-letter').textContent !== letter || tag.dataset.step !== String(step)) {
    $('#move-tag-letter').textContent = letter; $('#move-tag-text').textContent = moveText(move); tag.dataset.step = step;
    tag.classList.remove('pop'); void tag.offsetWidth; tag.classList.add('pop');
  }
  syncControls();
  $('#play').innerHTML = icon(playing ? 'pause' : 'play'); $('#play').setAttribute('aria-label', playing ? '暂停' : '播放');
  $('#play').disabled = mode !== 'learn';
  if (mode === 'practice') $('#practice-message').textContent = practicePrompt();
  refreshIcons();
}
function reset() {
  playing = false; generation++; playRun++; step = 0; pendingHalf = null; makeCube();
  if (mode !== 'sandbox') lesson.setup.forEach(applyInstant);
  focusCube(); renderStep();
}
function selectLesson(i) {
  if (busy) return;
  selected = i; lesson = lessons[i]; store.set('cube-lesson', i); mode = 'learn';
  $('#crumb').textContent = `${lesson.label} · ${lesson.title}`; $('#heading').textContent = lesson.intro;
  $('#lesson-kicker').innerHTML = `${lesson.label} <span>·</span> ${lesson.time}`;
  $('#lesson-title').textContent = lesson.title; $('#lesson-desc').textContent = lesson.desc; $('#goal').textContent = lesson.goal;
  $('#tip').textContent = lesson.tip; $('#detail').textContent = lesson.detail;
  $('#formula-title').textContent = lesson.algorithm ?? lesson.formulaTitle ?? '本节动作公式';
  $('#duration').textContent = lesson.algorithm ?? lesson.en;
  $('#complete').innerHTML = `${selected === lessons.length - 1 ? '完成课程，再练一次' : '我学会了，下一节'} ${icon('arrow-right')}`;
  updateMode(); renderNavigation(); reset();
}
function updateMode() {
  document.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  $('#sandbox').classList.toggle('sandbox-active', mode === 'sandbox');
  $('#sandbox').innerHTML = `${icon(mode === 'sandbox' ? 'book-open' : 'blocks')} ${mode === 'sandbox' ? '返回教学' : '自由练习'} ${icon('arrow-up-right')}`;
  $('#view-label').textContent = mode === 'sandbox' ? '自由练习 · 随心转动' : '白色底面 · 黄色朝上';
  $('#drag-hint').textContent = mode === 'learn' ? '拖动魔方，自由观察' : coarse ? '滑动魔方转层 · 拖动空白处换视角' : '拖动魔方面转层 · 拖动空白处换视角';
  document.body.dataset.mode = mode;
  if (mode !== 'practice') $('#practice-message').textContent = mode === 'sandbox' ? '随心转动，探索六个面的变化。重置可恢复六面。' : coarse ? '点按下方按键转动，让理解发生在指尖。' : '用键盘或点击按键，让理解发生在指尖。';
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
  if (mode !== 'practice') { await turn(move); return; }
  const expected = lesson.formula[step];
  if (!expected) return toast('本组动作已完成，点击重置再试一次');
  const result = practiceStep(expected, move, pendingHalf);
  if (result === 'wrong') return wrongMove(pendingHalf ? `半转还差一下：再转一次 ${notation(pendingHalf)}，或转 ${notation(inverse(pendingHalf))} 撤销` : `再观察一下，这一步是 ${notation(expected)}`);
  const token = generation; await turn(move); if (token !== generation) return;
  if (result === 'half-start') pendingHalf = move;
  else { if (result !== 'half-undo') step++; pendingHalf = null; }
  navigator.vibrate?.(12); renderStep();
  if (step === lesson.formula.length) toast('漂亮！你完成了这组手法。');
}
let toastTimer;
function toast(message) { $('#toast').textContent = message; $('#toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3000); }
$('#move-keys').innerHTML = ['U', 'D', 'L', 'R', 'F', 'B'].map((m, i) => `<button data-move="${m}" aria-label="${['顶层', '底层', '左面', '右面', '前面', '后面'][i]} ${m}"><b>${m}</b><span>${['顶层', '底层', '左面', '右面', '前面', '后面'][i]}</span><small>↻</small></button>`).join('');
$('#lessons').onclick = e => { const b = e.target.closest('[data-lesson]'); if (b) selectLesson(Number(b.dataset.lesson)); };
$('#play').onclick = playback; $('#next').onclick = next;
$('#prev').onclick = async () => { if (busy || step === 0 || mode !== 'learn') return; playing = false; const token = generation; await turn(inverse(lesson.formula[step - 1])); if (token !== generation) return; step--; renderStep(); };
$('#reset').onclick = () => { if (!busy) { reset(); toast(mode === 'sandbox' ? '已恢复六面复原态' : '已回到本节起始局面'); } };
$('#speed').onclick = () => { speed = speed === 1 ? 1.5 : speed === 1.5 ? .5 : 1; $('#speed').innerHTML = `${speed}× <span>速度</span>`; };
$('#focus').onchange = e => { focus = e.target.checked; focusCube(); };
$('#arrows').onchange = e => { arrows = e.target.checked; focusCube(); renderStep(); };
$('#view-reset').onclick = () => { camera.position.set(6.6, 5.1, 7.5); controls.target.set(0, 0, 0); controls.update(); };
document.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => switchMode(b.dataset.mode));
$('#sandbox').onclick = () => switchMode(mode === 'sandbox' ? 'learn' : 'sandbox');
$('#move-keys').onclick = e => { const b = e.target.closest('[data-move]'); if (b) requestMove(b.dataset.move + (reversed ? "'" : '')); };
$('#inverse').onclick = () => { reversed = !reversed; $('#inverse').classList.toggle('on', reversed); $('#inverse').setAttribute('aria-pressed', String(reversed)); document.querySelectorAll('[data-move] small').forEach(el => el.textContent = reversed ? '↺' : '↻'); };
$('#scramble').onclick = async () => {
  if (busy || playing) return;
  switchMode('sandbox');
  const faces = ['R', 'L', 'U', 'D', 'F', 'B']; let previous = ''; const moves = [];
  for (let i = 0; i < 22; i++) { const options = faces.filter(f => f !== previous); previous = options[Math.floor(Math.random() * options.length)]; moves.push(previous + ['', "'", '2'][Math.floor(Math.random() * 3)]); }
  moves.forEach(applyInstant); $('#practice-message').textContent = `已随机打乱 22 步。试着自己还原吧！`; toast('新的挑战准备好了');
};
$('#complete').onclick = () => { if (busy) return; if (!completed.includes(selected)) completed.push(selected); store.set('cube-completed', completed); const last = selected === lessons.length - 1; selectLesson(last ? 0 : selected + 1); if (last) toast('恭喜完成课程！每一次练习都会更熟练。'); };
$('#formula').onclick = e => { const b = e.target.closest('[data-step]'); if (!b || busy || mode !== 'learn') return; const target = Number(b.dataset.step); reset(); for (let i = 0; i < target; i++) applyInstant(lesson.formula[i]); step = target; renderStep(); };
$('#theme').onclick = () => {
  const next = isDark() ? 'light' : 'dark';
  theme = next === (darkQuery.matches ? 'dark' : 'light') ? null : next;
  store.set('cube-theme', theme); retheme();
};
function retheme() { applyTheme(); bodyMaterial.color.set(palette.body); arrowMaterial.color.set(palette.arrow); haloMaterial.color.set(palette.arrowHalo); focusCube(); }
darkQuery.addEventListener('change', () => { if (!theme) retheme(); });
$('#help').onclick = $('#more-help').onclick = () => $('#help-dialog').showModal();
$('#close-help').onclick = () => $('#help-dialog').close();
$('#help-dialog').onclick = e => { if (e.target === $('#help-dialog')) $('#help-dialog').close(); };
$('.brand').onclick = e => { e.preventDefault(); selectLesson(0); };
window.addEventListener('keydown', e => {
  if ($('#help-dialog').open || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
  const key = e.key.toUpperCase();
  if ('UDLRFB'.includes(key) && key.length === 1) { e.preventDefault(); requestMove(key + (e.shiftKey || reversed ? "'" : '')); }
  else if (e.code === 'Space' && e.target.tagName !== 'BUTTON') { e.preventDefault(); playback(); }
  else if (e.key === 'ArrowRight' && mode === 'learn') { e.preventDefault(); next(); }
  else if (e.key === 'ArrowLeft' && mode === 'learn') { e.preventDefault(); $('#prev').click(); }
});
selectLesson(selected);
