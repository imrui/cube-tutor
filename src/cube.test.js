import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FACES, parseMove, rotatePosition, inverse, toMove, moveFromDrag, practiceStep } from './cube.js';
import { lessons } from './lessons.js';

const positions = () => Array.from({ length: 27 }, (_, i) => [Math.floor(i / 9) - 1, Math.floor(i / 3) % 3 - 1, i % 3 - 1]);
function apply(state, move) { const { axis, layer, turns } = parseMove(move); return state.map(p => p[axis] === layer ? rotatePosition(p, axis, turns) : p); }
test('every face and its inverse restore all cube positions', () => {
  for (const face of Object.keys(FACES)) for (const suffix of ['', "'", '2']) {
    const state = positions(); assert.deepEqual(apply(apply(state, face + suffix), inverse(face + suffix)), state);
  }
});
test('four quarter turns restore all cube positions', () => {
  for (const face of Object.keys(FACES)) { let state = positions(); for (let i = 0; i < 4; i++) state = apply(state, face); assert.deepEqual(state, positions()); }
});
test('lesson formulas are legal and invertible', () => {
  for (const lesson of lessons) { let state = positions(); [...lesson.setup, ...lesson.formula, ...lesson.formula.slice().reverse().map(inverse), ...lesson.setup.slice().reverse().map(inverse)].forEach(m => state = apply(state, m)); assert.deepEqual(state, positions()); }
});
test('right-hand four-step algorithm has order six', () => {
  let state = positions(); for (let i = 0; i < 6; i++) ['R', 'U', "R'", "U'"].forEach(m => state = apply(state, m)); assert.deepEqual(state, positions());
});
test('toMove maps every axis, layer and direction back to the matching face', () => {
  for (const face of Object.keys(FACES)) for (const move of [face, `${face}'`]) {
    const { axis, layer, turns } = parseMove(move); assert.equal(toMove(axis, layer, turns), move);
  }
  assert.equal(toMove(0, 0, 1), null);
});
test('swiping a sticker turns the layer in the direction of the swipe', () => {
  assert.equal(moveFromDrag([0, 0, 1], [0, 1, 0], [1, 0, 1]), 'R');
  assert.equal(moveFromDrag([0, 0, 1], [0, -1, 0], [1, 1, 1]), "R'");
  assert.equal(moveFromDrag([0, 1, 0], [0, 0, 1], [1, 1, 0]), "R'");
  assert.equal(moveFromDrag([0, 0, 1], [-1, 0.2, 0], [0, 1, 1]), 'U');
  assert.equal(moveFromDrag([1, 0, 0], [0, 0, 1], [1, 1, 1]), 'U');
  assert.equal(moveFromDrag([0, 0, 1], [1, 0, 0], [0, -1, 1]), 'D');
  assert.equal(moveFromDrag([0, 1, 0], [1, 0, 0], [0, 1, 1]), 'F');
  assert.equal(moveFromDrag([0, 0, 1], [0, 1, 0], [0, 0, 1]), null, 'middle slices are not part of the notation');
});
test('every swipe agrees with the cube model', () => {
  // The swiped sticker must start moving along the swipe.
  for (const n of [0, 1, 2]) for (const s of [1, -1]) for (const d of [0, 1, 2]) if (d !== n) for (const t of [1, -1]) {
    const normal = [0, 0, 0]; normal[n] = s; const drag = [0, 0, 0]; drag[d] = t;
    const pos = [1, 1, 1]; pos[n] = s; pos[d] = 0; const sticker = pos.map((v, i) => v + normal[i] / 2);
    const move = moveFromDrag(normal, drag, pos); const { axis, turns } = parseMove(move);
    assert.ok((rotatePosition(sticker, axis, turns)[d] - sticker[d]) * t > 0, `${move} follows swipe on face ${s * (n + 1)} along ${t * (d + 1)}`);
  }
});
test('practice accepts the expected move and rejects others', () => {
  assert.equal(practiceStep('R', 'R'), 'advance');
  assert.equal(practiceStep('R', "R'"), 'wrong');
  assert.equal(practiceStep("U'", 'U'), 'wrong');
});
test('practice half turns take two equal quarter turns in either direction', () => {
  assert.equal(practiceStep('R2', 'R'), 'half-start');
  assert.equal(practiceStep('R2', 'R', 'R'), 'half-done');
  assert.equal(practiceStep('R2', "R'"), 'half-start');
  assert.equal(practiceStep('R2', "R'", "R'"), 'half-done');
  assert.equal(practiceStep('R2', "R'", 'R'), 'half-undo');
  assert.equal(practiceStep('R2', 'L', 'R'), 'wrong');
  assert.equal(practiceStep('R2', 'U'), 'wrong');
});
