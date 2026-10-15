import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lessons, resolveLesson } from './lessons.js';
import { createCubeState, applyMove, stateAfter, evaluateGoal, yellowEdgeShape, isRestored } from './cube-state.js';

for (const [index, base] of lessons.entries()) for (const [caseIndex, variant] of base.cases.entries()) {
  test(`${base.title} / ${variant.name}: reaches its actual goal`, () => {
    const lesson = resolveLesson(index, caseIndex), state = stateAfter(lesson.setup);
    assert.equal(evaluateGoal(state, lesson.goalType).achieved, false, 'the starting case must still need solving');
    if (index > 1) assert.equal(evaluateGoal(state, 'white-cross').achieved, true, 'preserve the white cross');
    if (index > 3) assert.equal(evaluateGoal(state, 'middle').achieved, true, 'preserve the first two layers');
    if (index > 4) assert.equal(evaluateGoal(state, 'yellow-cross').achieved, true, 'preserve the yellow cross');
    if (index > 5) assert.equal(evaluateGoal(state, 'yellow-face').achieved, true, 'preserve the yellow face');
    if (lesson.expectedShape) assert.equal(yellowEdgeShape(state), lesson.expectedShape);
    lesson.formula.forEach(move => applyMove(state, move));
    assert.equal(evaluateGoal(state, lesson.goalType, { step: lesson.formula.length, totalSteps: lesson.formula.length }).achieved, true);
  });
}

test('a daisy really starts with four upward white petals', () => {
  const state = stateAfter(lessons[1].cases[0].setup);
  const petals = state.filter(p => p.stickers.length === 2 && p.home[1] === -1);
  assert.equal(petals.length, 4);
  petals.forEach(p => { assert.equal(p.pos[1], 1); assert.deepEqual(p.stickers.find(s => s.face === 3).normal, [0, 1, 0]); });
});
test('yellow dot example passes through elbow and line before cross', () => {
  const lesson = resolveLesson(4, 2), state = stateAfter(lesson.setup);
  const shapes = new Map([[6, 'elbow'], [7, 'elbow'], [13, 'line'], [19, 'cross']]);
  lesson.formula.forEach((move, index) => { applyMove(state, move); if (shapes.has(index + 1)) assert.equal(yellowEdgeShape(state), shapes.get(index + 1)); });
});
test('corner examples match their declared white sticker orientation', () => {
  for (const [i, normal] of [[0, [1, 0, 0]], [1, [0, 1, 0]], [2, [0, 0, 1]]]) {
    const piece = stateAfter(lessons[2].cases[i].setup).find(p => p.home.join() === '1,-1,1');
    assert.deepEqual(piece.pos, [1, 1, 1]); assert.deepEqual(piece.stickers.find(s => s.face === 3).normal, normal);
  }
});
test('a flipped edge at the right position fails the cross goal', () => {
  const state = createCubeState(), edge = state.find(p => p.home.join() === '0,-1,1');
  [edge.stickers[0].normal, edge.stickers[1].normal] = [edge.stickers[1].normal, edge.stickers[0].normal];
  assert.equal(isRestored(edge), false);
  assert.equal(evaluateGoal(state, 'white-cross').achieved, false);
});
test('yellow orientation alone cannot pass corner positioning or broken lower layers', () => {
  const shifted = stateAfter(['U']);
  assert.equal(evaluateGoal(shifted, 'yellow-face').achieved, true);
  assert.equal(evaluateGoal(shifted, 'top-corners').achieved, false);
  const broken = stateAfter(['D']);
  for (const goal of ['yellow-cross', 'yellow-face', 'top-corners', 'solved']) assert.equal(evaluateGoal(broken, goal).achieved, false, goal);
});
test('half turns in either direction produce the same sticker state', () => {
  assert.deepEqual(stateAfter(['F', 'F']), stateAfter(["F'", "F'"]));
  assert.deepEqual(stateAfter(['F', "F'"]), createCubeState());
});
