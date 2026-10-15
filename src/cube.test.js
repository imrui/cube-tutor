import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FACES, parseMove, rotatePosition, inverse } from './cube.js';
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
