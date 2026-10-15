export const FACES = { R: [0, 1, -1], L: [0, -1, 1], U: [1, 1, -1], D: [1, -1, 1], F: [2, 1, -1], B: [2, -1, 1] };
export function parseMove(move) {
  const face = FACES[move[0]];
  if (!face || !/^[RLUDFB](2|')?$/.test(move)) throw new Error(`Invalid move: ${move}`);
  return { axis: face[0], layer: face[1], turns: face[2] * (move.endsWith("'") ? -1 : move.endsWith('2') ? 2 : 1) };
}
export function rotatePosition(position, axis, turns) {
  let p = [...position];
  for (let i = 0; i < ((turns % 4) + 4) % 4; i++) {
    if (axis === 0) p = [p[0], -p[2], p[1]];
    if (axis === 1) p = [p[2], p[1], -p[0]];
    if (axis === 2) p = [-p[1], p[0], p[2]];
  }
  return p.map(v => v === 0 ? 0 : v);
}
export const inverse = move => move.endsWith('2') ? move : move.endsWith("'") ? move[0] : `${move}'`;
export function toMove(axis, layer, turns) {
  const face = Object.keys(FACES).find(f => FACES[f][0] === axis && FACES[f][1] === layer);
  if (!face) return null;
  return FACES[face][2] === Math.sign(turns) ? face : `${face}'`;
}
// Swiping across a sticker turns the layer that carries the swipe; normal and drag are world vectors.
export function moveFromDrag(normal, drag, position) {
  const n = normal.findIndex(v => v !== 0);
  const d = [0, 1, 2].filter(i => i !== n).reduce((a, b) => Math.abs(drag[a]) >= Math.abs(drag[b]) ? a : b);
  const axis = 3 - n - d;
  // The rotation follows normal × swipe direction, which lies along the remaining axis.
  const cross = [(n + 1) % 3, (n + 2) % 3][0] === d ? 1 : -1;
  const sign = Math.sign(normal[n]) * Math.sign(drag[d]) * cross;
  return sign && position[axis] !== 0 ? toMove(axis, position[axis], sign) : null;
}
// Practice input check. A half turn X2 is entered as two equal quarter turns in either direction.
export function practiceStep(expected, move, pending = null) {
  if (expected.endsWith('2') && move[0] === expected[0]) {
    if (!pending) return 'half-start';
    if (pending === move) return 'half-done';
    if (pending === inverse(move)) return 'half-undo';
  }
  if (pending && move === inverse(pending)) return 'half-undo';
  return !pending && move === expected ? 'advance' : 'wrong';
}
