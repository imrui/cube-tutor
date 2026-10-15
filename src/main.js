import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createIcons, Box, Sprout, Check, Cloud, CircleHelp, Blocks, ArrowUpRight, PlayCircle, Hand, Scan, Move, Mouse, RotateCcw, SkipBack, Play, Pause, SkipForward, Focus, Lightbulb, ArrowRight, Keyboard, Shuffle, Bookmark, X, BookOpen } from 'lucide';
import { parseMove, rotatePosition, inverse } from './cube.js';
import { lessons, moveText } from './lessons.js';

const icon = (name, cls = '') => `<i data-lucide="${name}" class="${cls}"></i>`;
let selected = Number(localStorage.getItem('cube-lesson') ?? 2);
if (!lessons[selected]) selected = 2;
let completed = JSON.parse(localStorage.getItem('cube-completed') || '[]');
let mode = 'learn', step = 0, playing = false, busy = false, speed = 1, focus = false, arrows = true, history = [], generation = 0, playRun = 0;
let lesson = lessons[selected];
document.querySelector('#app').innerHTML = `
<aside class="sidebar">
  <a class="brand" href="#" aria-label="方寸首页"><span class="brand-mark">${icon('box')}</span><span>方寸<span class="brand-en">CUBE TUTOR</span></span></a>
  <div class="course-label">你的第一颗魔方 <span>入门课程</span></div>
  <nav id="lessons" aria-label="课程章节"></nav>
  <div class="sidebar-bottom"><div class="little-cube">${icon('sprout')}</div><h4>慢慢来，比较快。</h4><p>每一个高手，都从第一次转动开始。</p><div class="progress-label"><span>学习进度</span><b id="progress-label">0 / 8</b></div><div class="progress-track"><span id="progress"></span></div></div>
  <div class="sidebar-footer"><span class="status-dot"></span>为每一个「我不会」而设计</div>
</aside>
<div class="main-shell">
  <header><div class="breadcrumb">入门课程 <span>/</span> <b id="crumb"></b></div><div class="header-right"><span>${icon('cloud')} 进度自动保存</span><button class="icon-button" id="help" title="键盘快捷键">${icon('circle-help')}</button><div class="avatar">Hi</div></div></header>
  <main>
    <section class="page-heading"><div><div class="eyebrow"><span></span> LET’S MAKE IT CLICK</div><h1 id="heading"></h1><p>不用背下来。看一遍，转一遍，手就记住了。</p></div><button id="sandbox" class="outline-button">${icon('blocks')} 自由练习 ${icon('arrow-up-right')}</button></section>
    <div class="workspace">
      <section class="cube-card"><div class="cube-top"><div class="mode-tabs"><button data-mode="learn" class="active">${icon('play-circle')} 动画教学</button><button data-mode="practice">${icon('hand')} 跟我练习</button></div><span class="live-badge"><span></span> 3D 实时演示</span></div>
        <div class="viewport" id="viewport"><div class="view-label"><span class="view-dot"></span><span id="view-label">白色底面 · 黄色朝上</span></div><button class="view-reset icon-button" id="view-reset" title="恢复默认视角">${icon('scan')}</button><div class="drag-hint">${icon('move')} 拖动魔方，自由观察</div><div class="axis"><b class="axis-y">Y</b><b class="axis-z">Z</b><b class="axis-x">X</b><span></span></div></div>
        <div class="cube-options"><label><input id="focus" type="checkbox"/><span class="switch"></span> 聚焦目标块</label><label><input id="arrows" type="checkbox" checked/><span class="switch"></span> 转动指引</label><span class="orientation">${icon('mouse')} 滚动缩放</span></div>
        <div class="playback"><div class="timeline"><span id="step-status">动作 0 / 4</span><div class="timeline-track"><span id="timeline-fill"></span></div><span id="duration">右手四步法</span></div><div class="transport"><button id="reset" class="icon-button" title="重置本节">${icon('rotate-ccw')}</button><div class="transport-center"><button id="prev" class="icon-button" title="上一步">${icon('skip-back')}</button><button id="play" class="play-button" title="播放或暂停">${icon('play')}</button><button id="next" class="icon-button" title="下一步">${icon('skip-forward')}</button></div><button id="speed" class="speed-button" title="切换播放速度">1× <span>速度</span></button></div></div>
      </section>
      <aside class="instruction-card"><div class="lesson-kicker" id="lesson-kicker"></div><h2 id="lesson-title"></h2><p id="lesson-desc" class="lesson-desc"></p><div class="goal-box">${icon('focus')}<div><span>这一节的小目标</span><strong id="goal"></strong></div></div><div class="formula-heading"><h3 id="formula-title">右手四步法</h3><span>跟着做就好</span></div><div id="formula" class="formula"></div><div class="action-detail"><span class="step-number" id="action-number">01</span><div><strong id="action-title">右手抬起</strong><span id="action-subtitle">右面顺时针转 90°</span></div><span class="action-arrow" id="action-arrow">↻</span></div><div class="coach-note">${icon('lightbulb')}<p id="tip"></p></div><button id="complete" class="complete-button">我学会了，下一节 ${icon('arrow-right')}</button><div class="no-rush">不着急，随时可以回来再练一次</div></aside>
    </div>
    <section class="bottom-grid"><div class="practice-card"><div class="section-title"><span class="section-icon">${icon('keyboard')}</span><div><h3>动手转一下</h3><p id="practice-message" aria-live="polite">用键盘或点击按键，让理解发生在指尖。</p></div><button id="inverse" class="inverse-button" aria-pressed="false">逆时针 <span>′</span></button></div><div class="move-keys" id="move-keys"></div><div class="key-hint"><span><kbd>Shift</kbd> + 字母 = 逆时针</span><span><kbd>Space</kbd> 播放 / 暂停</span><button id="scramble">${icon('shuffle')} 随机打乱</button></div></div><div class="knowledge-card"><div class="knowledge-title">${icon('bookmark')} 新手小贴士 <span>GOOD TO KNOW</span></div><h3>记动作，比记公式更容易。</h3><p id="detail"></p><button id="more-help">认识转动符号 ${icon('arrow-right')}</button></div></section>
    <footer><span>方寸之间，大有可为。</span><span>Made for your first solve <span class="footer-cube">✳</span></span></footer>
  </main>
</div><div id="toast" role="status"></div><dialog id="help-dialog"><button id="close-help" class="icon-button" aria-label="关闭">${icon('x')}</button><div class="eyebrow">A LITTLE HELP</div><h2>你的魔方，听你的。</h2><p>拖动空白区域或魔方可改变视角，滚轮可以缩放。</p><div class="help-grid"><b>R / L</b><span>右面 / 左面</span><b>U / D</b><span>顶层 / 底层</span><b>F / B</b><span>前面 / 后面</span><b>Shift + 字母</b><span>逆时针转动</span><b>Space</b><span>播放 / 暂停动画</span><b>← / →</b><span>后退 / 前进一步</span></div><p>所有顺逆时针都以正对该面的方向为准。跟练模式会按公式检查每个动作；自由练习可以任意转动。</p></dialog>`;
const $ = selector => document.querySelector(selector);
const refreshIcons = () => createIcons({ icons: { Box, Sprout, Check, Cloud, CircleHelp, Blocks, ArrowUpRight, PlayCircle, Hand, Scan, Move, Mouse, RotateCcw, SkipBack, Play, Pause, SkipForward, Focus, Lightbulb, ArrowRight, Keyboard, Shuffle, Bookmark, X, BookOpen }, attrs: { 'stroke-width': 1.7 } });

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(34, 1, .1, 100);
camera.position.set(6.6, 5.1, 7.5);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
$('#viewport').prepend(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.enablePan = false; controls.minDistance = 6; controls.maxDistance = 16;
scene.add(new THREE.AmbientLight(0xffffff, 2.5));
const light = new THREE.DirectionalLight(0xffffff, 3.0); light.position.set(3, 8, 5); scene.add(light);
const cubeRoot = new THREE.Group(); scene.add(cubeRoot);
let cubies = [];
const colors = [0xe95047, 0xff974d, 0xf8d451, 0xf7f6ed, 0x52a686, 0x579bd5];
const stickerGeo = new THREE.PlaneGeometry(.855, .855);
function makeCube() {
  for (const cubie of cubies) { cubeRoot.remove(cubie); cubie.traverse(o => { if (o.material) o.material.dispose(); }); }
  cubies = [];
  for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
    if (x === 0 && y === 0 && z === 0) continue;
    const group = new THREE.Group(); group.position.set(x, y, z); group.userData.pos = [x, y, z]; group.userData.home = [x, y, z];
    const body = new THREE.Mesh(new THREE.BoxGeometry(.975, .975, .975), new THREE.MeshStandardMaterial({ color: 0x27332f, roughness: .55 })); group.add(body);
    const coords = [x, x, y, y, z, z];
    for (let f = 0; f < 6; f++) {
      if (coords[f] !== (f % 2 ? -1 : 1)) continue;
      const mat = new THREE.MeshStandardMaterial({ color: colors[f], roughness: .42, metalness: .01 });
      const mesh = new THREE.Mesh(stickerGeo, mat); mesh.userData.color = colors[f]; mesh.userData.white = y === -1; mesh.userData.sticker = true;
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
const arrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(2, -.7, 1.7), 1.5, 0xe97956, .24, .17); scene.add(arrow);
function focusCube() {
  cubies.forEach(c => {
    const [x, y, z] = c.userData.home;
    const isEdge = [x, y, z].filter(v => v !== 0).length === 2;
    const target = selected === 0 ? Math.abs(x) + Math.abs(y) + Math.abs(z) === 1 : selected === 1 ? y === -1 && isEdge : selected === 2 ? x === 1 && y === -1 && z === 1 : selected === 3 ? y === 0 && isEdge : selected === 4 || selected === 7 ? y === 1 && isEdge : y === 1 && Math.abs(x) + Math.abs(z) === 2;
    c.children.filter(o => o.userData.sticker).forEach(s => s.material.color.setHex(focus && !target ? 0xc8cfca : s.userData.color));
  });
  arrow.visible = arrows && mode !== 'sandbox';
  updateArrow();
}
function updateArrow() {
  const { axis, layer, turns } = parseMove(lesson.formula[Math.min(step, lesson.formula.length - 1)]);
  const radial = axis === 0 ? new THREE.Vector3(0, -.6, 1.45) : axis === 1 ? new THREE.Vector3(.7, 0, 1.45) : new THREE.Vector3(1.2, .7, 0);
  const normal = new THREE.Vector3(...[0, 1, 2].map(i => i === axis ? 1 : 0));
  arrow.position.copy(radial).setComponent(axis, layer * 1.7);
  arrow.setDirection(normal.cross(radial).multiplyScalar(Math.sign(turns)).normalize());
  arrow.setLength(.95, .2, .13);
}
async function turn(move) {
  if (busy) return false;
  busy = true;
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
  cubeRoot.remove(pivot); busy = false; return true;
}
new ResizeObserver(() => { const el = $('#viewport'); camera.aspect = el.clientWidth / el.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(el.clientWidth, el.clientHeight); }).observe($('#viewport'));
renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });

function renderNavigation() {
  $('#lessons').innerHTML = lessons.map((l, i) => `<button class="nav-item ${i === selected ? 'selected' : ''}" data-lesson="${i}"><span class="nav-number ${completed.includes(i) ? 'done' : ''}">${completed.includes(i) ? icon('check') : i === 0 ? icon('box') : `0${i}`}</span><span>${l.title}<small>${i === 0 ? '从这里开始' : l.en}</small></span>${i === selected ? '<span class="nav-current"></span>' : ''}</button>`).join('');
  $('#progress-label').textContent = `${completed.length} / 8`; $('#progress').style.width = `${completed.length / 8 * 100}%`; refreshIcons();
}
const fingerLabels = ['右手抬起', '食指拨顶', '右手拉回', '顶层回拨'];
function renderStep() {
  updateArrow();
  $('#formula').innerHTML = lesson.formula.map((m, i) => `<button class="formula-move ${i === step ? 'current' : ''} ${i < step ? 'finished' : ''}" data-step="${i}" aria-label="跳到第 ${i + 1} 步">${m.replace("'", '′')}<small>${i + 1}</small></button>`).join('');
  $('#step-status').textContent = `动作 ${step} / ${lesson.formula.length}`;
  $('#timeline-fill').style.width = `${step / lesson.formula.length * 100}%`;
  const idx = Math.min(step, lesson.formula.length - 1), move = lesson.formula[idx];
  $('#action-number').textContent = String(idx + 1).padStart(2, '0');
  $('#action-title').textContent = step === lesson.formula.length ? '这组动作，完成了！' : selected === 2 ? fingerLabels[idx] : moveText(move);
  $('#action-subtitle').textContent = step === lesson.formula.length ? '再播放一次，或者动手跟练吧' : moveText(move);
  $('#action-arrow').textContent = move.endsWith("'") ? '↺' : '↻';
  $('#prev').disabled = busy || step === 0 || mode !== 'learn'; $('#next').disabled = busy || step === lesson.formula.length || mode !== 'learn';
  $('#play').innerHTML = icon(playing ? 'pause' : 'play');
  $('#play').disabled = mode !== 'learn';
  if (mode === 'practice') $('#practice-message').textContent = step === lesson.formula.length ? '做到了！整组动作已完成，点击重置再练一次。' : `轮到你了：请转动 ${move.replace("'", '′')} · ${moveText(move)}`;
  refreshIcons();
}
function reset() {
  playing = false; generation++; playRun++; step = 0; history = []; makeCube();
  if (mode !== 'sandbox') lesson.setup.forEach(applyInstant);
  focusCube(); renderStep();
}
function selectLesson(i) {
  if (busy) return;
  selected = i; lesson = lessons[i]; localStorage.setItem('cube-lesson', i); mode = 'learn';
  $('#crumb').textContent = `${lesson.label} · ${lesson.title}`; $('#heading').textContent = lesson.intro;
  $('#lesson-kicker').innerHTML = `${lesson.label} <span>·</span> ${lesson.time}`;
  $('#lesson-title').textContent = lesson.title; $('#lesson-desc').textContent = lesson.desc; $('#goal').textContent = lesson.goal;
  $('#tip').textContent = lesson.tip; $('#detail').textContent = lesson.detail;
  $('#formula-title').textContent = selected === 2 ? '右手四步法' : selected === 0 ? '先试试这四步' : '本节动作公式';
  $('#duration').textContent = selected === 2 ? '右手四步法' : lesson.en;
  $('#complete').innerHTML = `${selected === 7 ? '完成课程，再练一次' : '我学会了，下一节'} ${icon('arrow-right')}`;
  $('#practice-message').textContent = '用键盘或点击按键，让理解发生在指尖。';
  updateMode(); renderNavigation(); reset();
}
function updateMode() {
  document.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  $('#sandbox').classList.toggle('sandbox-active', mode === 'sandbox');
  $('#sandbox').innerHTML = `${icon(mode === 'sandbox' ? 'book-open' : 'blocks')} ${mode === 'sandbox' ? '返回教学' : '自由练习'} ${icon('arrow-up-right')}`;
  $('#view-label').textContent = mode === 'sandbox' ? '自由练习 · 随心转动' : '白色底面 · 黄色朝上'; refreshIcons();
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
let reversed = false;
async function manualMove(face, shift = false) {
  if (busy || playing) return;
  const move = face + (shift || reversed ? "'" : '');
  if (mode === 'practice') {
    const expected = lesson.formula[step];
    if (!expected) return toast('本组动作已完成，点击重置再试一次');
    // A half turn is entered with two matching quarter turns.
    if (expected.endsWith('2') && move === expected[0]) {
      await turn(move);
      if (history.at(-1) === `half:${step}`) { history.pop(); step++; } else history.push(`half:${step}`);
      renderStep();
      if (history.at(-1) === `half:${step}`) $('#practice-message').textContent = `很好，再转一次 ${move}，完成 180° 半转。`;
      return;
    }
    if (move !== expected) {
      $('#move-keys').classList.remove('shake'); void $('#move-keys').offsetWidth; $('#move-keys').classList.add('shake'); navigator.vibrate?.(70); toast(`再观察一下，这一步是 ${expected.replace("'", '′')}`); return;
    }
    await next(); if (step === lesson.formula.length) toast('漂亮！你完成了这组手法。');
  } else {
    if (mode === 'learn') { mode = 'sandbox'; playing = false; updateMode(); focusCube(); renderStep(); $('#practice-message').textContent = '已进入自由练习。随心转动，重置可恢复六面。'; }
    await turn(move); history.push(move);
  }
}
let toastTimer;
function toast(message) { $('#toast').textContent = message; $('#toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3000); }
$('#move-keys').innerHTML = ['U', 'D', 'L', 'R', 'F', 'B'].map((m, i) => `<button data-move="${m}"><b>${m}</b><span>${['顶层', '底层', '左面', '右面', '前面', '后面'][i]}</span><small>↻</small></button>`).join('');
$('#lessons').onclick = e => { const b = e.target.closest('[data-lesson]'); if (b) selectLesson(Number(b.dataset.lesson)); };
$('#play').onclick = playback; $('#next').onclick = next;
$('#prev').onclick = async () => { if (busy || step === 0) return; playing = false; await turn(inverse(lesson.formula[step - 1])); step--; renderStep(); };
$('#reset').onclick = () => { if (!busy) { reset(); toast(mode === 'sandbox' ? '已恢复六面复原态' : '已回到本节起始局面'); } };
$('#speed').onclick = () => { speed = speed === 1 ? 1.5 : speed === 1.5 ? .5 : 1; $('#speed').innerHTML = `${speed}× <span>速度</span>`; };
$('#focus').onchange = e => { focus = e.target.checked; focusCube(); };
$('#arrows').onchange = e => { arrows = e.target.checked; focusCube(); };
$('#view-reset').onclick = () => { camera.position.set(6.6, 5.1, 7.5); controls.target.set(0, 0, 0); controls.update(); };
document.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { if (busy) return; mode = b.dataset.mode; updateMode(); reset(); if (mode === 'learn') $('#practice-message').textContent = '用键盘或点击按键，让理解发生在指尖。'; });
$('#sandbox').onclick = () => { if (busy) return; mode = mode === 'sandbox' ? 'learn' : 'sandbox'; updateMode(); reset(); $('#practice-message').textContent = mode === 'sandbox' ? '随心转动，探索六个面的变化。' : '用键盘或点击按键，让理解发生在指尖。'; };
$('#move-keys').onclick = e => { const b = e.target.closest('[data-move]'); if (b) manualMove(b.dataset.move); };
$('#inverse').onclick = () => { reversed = !reversed; $('#inverse').classList.toggle('on', reversed); $('#inverse').setAttribute('aria-pressed', String(reversed)); document.querySelectorAll('[data-move] small').forEach(el => el.textContent = reversed ? '↺' : '↻'); };
$('#scramble').onclick = async () => {
  if (busy || playing) return;
  mode = 'sandbox'; updateMode(); reset();
  const faces = ['R', 'L', 'U', 'D', 'F', 'B']; let previous = ''; const moves = [];
  for (let i = 0; i < 22; i++) { const options = faces.filter(f => f !== previous); previous = options[Math.floor(Math.random() * options.length)]; moves.push(previous + ['', "'", '2'][Math.floor(Math.random() * 3)]); }
  moves.forEach(applyInstant); history = moves; $('#practice-message').textContent = `已随机打乱 22 步。试着自己还原吧！`; toast('新的挑战准备好了');
};
$('#complete').onclick = () => { if (busy) return; if (!completed.includes(selected)) completed.push(selected); localStorage.setItem('cube-completed', JSON.stringify(completed)); const last = selected === 7; selectLesson(last ? 0 : selected + 1); if (last) toast('恭喜完成课程！每一次练习都会更熟练。'); };
$('#formula').onclick = e => { const b = e.target.closest('[data-step]'); if (!b || busy || mode !== 'learn') return; const target = Number(b.dataset.step); reset(); for (let i = 0; i < target; i++) applyInstant(lesson.formula[i]); step = target; renderStep(); };
$('#help').onclick = $('#more-help').onclick = () => $('#help-dialog').showModal();
$('#close-help').onclick = () => $('#help-dialog').close();
$('#help-dialog').onclick = e => { if (e.target === $('#help-dialog')) $('#help-dialog').close(); };
$('.brand').onclick = e => { e.preventDefault(); selectLesson(0); };
window.addEventListener('keydown', e => {
  if ($('#help-dialog').open || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.ctrlKey || e.metaKey || e.altKey) return;
  const key = e.key.toUpperCase();
  if ('UDLRFB'.includes(key) && key.length === 1) { e.preventDefault(); manualMove(key, e.shiftKey); }
  else if (e.code === 'Space' && e.target.tagName !== 'BUTTON') { e.preventDefault(); playback(); }
  else if (e.key === 'ArrowRight' && mode === 'learn') { e.preventDefault(); next(); }
  else if (e.key === 'ArrowLeft' && mode === 'learn') { e.preventDefault(); $('#prev').click(); }
});
selectLesson(selected);
