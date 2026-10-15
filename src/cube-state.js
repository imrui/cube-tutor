import { parseMove, rotatePosition } from './cube.js';

export const NORMALS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const equal = (a, b) => a.every((value, i) => value === b[i]);
const edge = piece => piece.stickers.length === 2;
const corner = piece => piece.stickers.length === 3;
export const isRestored = piece => equal(piece.pos, piece.home) && piece.stickers.every(s => equal(s.normal, NORMALS[s.face]));
const yellowUp = piece => piece.stickers.some(s => s.face === 2 && equal(s.normal, [0, 1, 0]));

// The test model and scene snapshots share this representation. Sticker normals are
// checked as well as positions: an in-place but flipped piece is never solved.
export function createCubeState() {
  const pieces = [];
  for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
    if (!x && !y && !z) continue;
    const pos = [x, y, z];
    pieces.push({ home: [...pos], pos, stickers: NORMALS.flatMap((normal, face) => {
      const axis = normal.findIndex(v => v !== 0);
      return pos[axis] === normal[axis] ? [{ face, normal: [...normal] }] : [];
    }) });
  }
  return pieces;
}

export function applyMove(state, move) {
  const { axis, layer, turns } = parseMove(move);
  for (const piece of state) if (piece.pos[axis] === layer) {
    piece.pos = rotatePosition(piece.pos, axis, turns);
    piece.stickers.forEach(s => { s.normal = rotatePosition(s.normal, axis, turns); });
  }
  return state;
}

export function stateAfter(moves) {
  return moves.reduce(applyMove, createCubeState());
}

export function yellowEdgeShape(state) {
  const up = state.filter(p => edge(p) && p.home[1] === 1 && yellowUp(p));
  if (!up.length) return 'dot';
  if (up.length === 4) return 'cross';
  if (up.length === 2) return up[0].pos[0] === -up[1].pos[0] && up[0].pos[2] === -up[1].pos[2] ? 'line' : 'elbow';
  return 'other';
}

export function evaluateGoal(state, type, { step = 0, totalSteps = 0 } = {}) {
  const lower = state.filter(p => p.home[1] <= 0 && p.stickers.length > 1);
  const lowerSolved = lower.every(isRestored);
  const allYellowUp = state.filter(p => p.home[1] === 1).every(yellowUp);
  let pieces, check = isRestored, prerequisite = true, label;
  switch (type) {
    case 'notation': return { achieved: totalSteps > 0 && step === totalSteps, correct: step, total: totalSteps, label: '动作练习', prerequisite: true };
    case 'white-cross': pieces = state.filter(p => p.home[1] === -1 && edge(p)); label = '白色棱归位'; break;
    case 'white-layer': pieces = state.filter(p => p.home[1] === -1 && p.stickers.length > 1); label = '底层块归位'; break;
    case 'middle': pieces = lower; label = '前两层块归位'; break;
    case 'yellow-cross': pieces = state.filter(p => p.home[1] === 1 && edge(p)); check = yellowUp; prerequisite = lowerSolved; label = '黄色棱朝上'; break;
    case 'yellow-face': pieces = state.filter(p => p.home[1] === 1 && p.stickers.length > 1); check = yellowUp; prerequisite = lowerSolved; label = '黄色块朝上'; break;
    case 'top-corners': pieces = state.filter(p => p.home[1] === 1 && corner(p)); prerequisite = lowerSolved && allYellowUp; label = '顶层角归位'; break;
    case 'solved': pieces = state.filter(p => p.stickers.length > 1); label = '全部块归位'; break;
    default: throw new Error(`Unknown lesson goal: ${type}`);
  }
  const correct = pieces.filter(check).length;
  return { achieved: prerequisite && correct === pieces.length, correct, total: pieces.length, label, prerequisite };
}
