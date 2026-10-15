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
