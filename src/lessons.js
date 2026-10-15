import { inverse } from './cube.js';

export const lessons = [
  { title: '认识你的魔方', en: 'MEET YOUR CUBE', time: '3 分钟', label: '基础认知', formulaTitle: '先试试这四步', focus: 'centers', intro: '先认识它，再转动它。', desc: '中心块决定每个面的颜色，棱块有两种颜色，角块有三种颜色。无论怎么转，中心块的相对位置都不会改变。', formula: ['R', 'U', "R'", "U'"], goal: '看懂字母与转动方向', tip: '顺时针与逆时针，都从正对着要转动的那个面来看。带 ′ 表示逆时针，2 表示转两次。', detail: '标准配色中白色对黄色，红色对橙色，蓝色对绿色。R / L 为右 / 左，U / D 为上 / 下，F / B 为前 / 后。', setup: [] },
  { title: '底层十字', en: 'WHITE CROSS', time: '5 分钟', label: '第一步', focus: 'cross', intro: '给白色拼一个小十字。', desc: '先把四个白色棱块移到黄色中心周围，做成小雏菊。再对齐侧面的中心颜色，转 180°，让花瓣回到白色底面。', formula: ['F2', 'U', 'R2', "U'"], goal: '让白色棱块和侧面中心对齐', tip: '十字不只看底面白色，侧面的颜色也要和中心块相同。每一片花瓣都单独对齐。', detail: '小雏菊不需要固定公式。此动画演示半转与顶层调整；请先观察目标棱块，再逐片放到底面。', setup: ['F2', 'R2', 'U'] },
  { title: '底层角块', en: 'WHITE CORNERS', time: '6 分钟', label: '第二步', algorithm: '右手四步法', stepLabels: ['右手抬起', '食指拨顶', '右手拉回', '顶层回拨'], focus: 'corner', intro: '把第一层，拼完整。', desc: '找到带白色的角块，把它移到目标位置的右上方。跟着「右手四步法」，让它一点点回到自己的家。', formula: ['R', 'U', "R'", "U'"], goal: '将白色角块送回右下角', tip: '让白色底面始终朝下。先找到角块的另外两种颜色，把它放在对应中心块之间的上方。', detail: '四步结束后，观察角块。如果还没归位，就在同一位置重复这组动作，直到白色朝下。移动下一个角块前，先用 U 调整顶层。', setup: ['U', 'R', "U'", "R'"] },
  { title: '中层棱块', en: 'MIDDLE LAYER', time: '8 分钟', label: '第三步', focus: 'middle', intro: '让第二层，也整整齐齐。', desc: '寻找顶层不带黄色的棱块，先与侧面中心对齐，再观察它应该进入左边还是右边。', formula: ['U', 'R', "U'", "R'", "U'", "F'", 'U', 'F'], goal: '将顶层棱块插入右侧中层', tip: '先远离目标方向，再打开门、放进去、关上门。左侧插入可用镜像公式 U′ L′ U L U F U′ F′。', detail: '如果目标棱块已经在中层但方向错误，先用插入公式把它换到顶层，再正确插入。', setup: ["F'", "U'", 'F', 'U', 'R', 'U', "R'", "U'"] },
  { title: '顶层黄色十字', en: 'YELLOW CROSS', time: '5 分钟', label: '第四步', focus: 'top-edges', intro: '在顶面，画一个黄色十字。', desc: '只看顶层的黄色棱块。从点、拐角到一字，再到十字，每次都用同一组手法。', formula: ['F', 'R', 'U', "R'", "U'", "F'"], goal: '让四个黄色棱块朝上', tip: '一字形横着放；拐角形放在左上方。点态先做一次，再重新观察与摆正。', detail: '这个阶段先忽略黄色角块和侧面颜色。每次完成公式后，调整整个观察方向或顶层朝向，再继续。', setup: ['F', 'U', 'R', "U'", "R'", "F'"] },
  { title: '顶面黄色翻正', en: 'YELLOW FACE · OLL', time: '7 分钟', label: '第五步', focus: 'top-corners', intro: '让整个顶面，亮起来。', desc: '用小鱼公式调整黄色角块的朝向。先观察顶面，找到小鱼，再把鱼头放在左前方。', formula: ['R', 'U', "R'", 'U', 'R', 'U2', "R'"], goal: '观察小鱼公式如何翻转角块', tip: '小鱼公式不是任何方向做一次都能完成。每轮后先观察黄色角块朝向，再调整 U 或选用逆小鱼。', detail: '逆小鱼公式：R U2 R′ U′ R U′ R′。无鱼形时先做一次小鱼得到可识别的形状，再按朝向调整。', setup: ['R', 'U2', "R'", "U'", 'R', "U'", "R'"] },
  { title: '顶层角块归位', en: 'POSITION CORNERS', time: '7 分钟', label: '第六步', focus: 'top-corners', intro: '找到车灯，让角块回家。', desc: '寻找同一侧两颗颜色相同的顶层角块，它们就像一对车灯。将车灯放在后面，再开始公式。', formula: ["R'", 'F', "R'", 'B2', 'R', "F'", "R'", 'B2', 'R2'], goal: '交换顶层角块的位置', tip: '没有车灯时先做一次公式，出现车灯后放到后面。公式结束后用 U 对齐侧面中心。', detail: '黄色保持朝上，观察的是角块侧面的颜色。角块归位后，顶层可能还剩棱块需要交换。', setup: ['R2', 'B2', 'R', 'F', "R'", 'B2', 'R', "F'", 'R'] },
  { title: '顶层棱块归位', en: 'THE FINAL LAYER', time: '8 分钟', label: '第七步', focus: 'top-edges', intro: '最后一步，六面归一。', desc: '把已经完成的一面放到后方，用三棱换公式让剩下的三个顶层棱块循环归位。', formula: ['R', "U'", 'R', 'U', 'R', 'U', 'R', "U'", "R'", "U'", 'R2'], goal: '完成最后三个顶层棱块的交换', tip: '没有完整侧面时，先做一次公式再观察。方向相反可用逆公式，或者重复同一公式两次。', detail: '本节演示 Ua 三棱换。最后旋转 U 对齐四个侧面中心，你就完成了第一颗魔方。', setup: ['R2', 'U', 'R', 'U', "R'", "U'", "R'", "U'", "R'", 'U', "R'"] }
];

const rightHand = ['R', 'U', "R'", "U'"];
const yellowCross = ['F', ...rightHand, "F'"];
const sune = ['R', 'U', "R'", 'U', 'R', 'U2', "R'"];
const reverse = formula => formula.slice().reverse().map(inverse);
const repeat = (formula, times) => Array.from({ length: times }, () => formula).flat();
const example = (id, name, formula, note, extra = {}) => ({ id, name, formula, setup: reverse(formula), note, ...extra });
const goalTypes = ['notation', 'white-cross', 'white-layer', 'middle', 'yellow-cross', 'yellow-face', 'top-corners', 'solved'];

lessons.forEach((lesson, index) => {
  lesson.goalType = goalTypes[index];
  lesson.cases = [{ id: 'default', name: '标准局面', formula: lesson.formula, setup: lesson.setup, note: lesson.tip }];
});

lessons[0].cases[0].name = '认识六个面';
lessons[1].desc = '先找到白色棱块，让它在顶层组成小雏菊。把棱块侧面的颜色对准同色中心，再将这一面转 180°，逐片送到底层。';
lessons[1].detail = '小雏菊不需要固定公式。本节准备了“花瓣已对齐”和“先调整顶层”两种局面。观察棱块侧面的颜色，再决定转哪一面。';
lessons[1].cases = [
  example('daisy', '小雏菊 · 四片花瓣', ['F2', 'R2', 'B2', 'L2'], '四片白色花瓣已在黄色中心周围，侧色也已对齐。从前面开始，逐片转 180°。', {
    formulaTitle: '逐片送回底面', stages: [
      { start: 0, text: '前方花瓣：绿色已对齐绿色中心，把前面转 180°。' },
      { start: 1, text: '右方花瓣：红色已对齐红色中心，把右面转 180°。' },
      { start: 2, text: '后方花瓣：蓝色已对齐蓝色中心，把后面转 180°。' },
      { start: 3, text: '左方花瓣：橙色已对齐橙色中心，把左面转 180°。' },
    ],
  }),
  example('align', '直接对齐 · 最后一棱', ['U', 'F2'], '底层已有三条白棱。将右上方的白绿棱拨到前方，对齐绿色中心，再把前面转 180°。', { formulaTitle: '对齐，再送回' }),
];

lessons[2].cases = [
  example('white-right', '白色朝右 · 1 组', rightHand, '白色在右前上角的右侧。做一组右手四步法，观察它回到底层。'),
  example('white-up', '白色朝上 · 3 组', repeat(rightHand, 3), '白色朝上时，需要连续做三组四步法。每组后观察同一角块，保持魔方朝向不变。', { stepLabels: repeat(lessons[2].stepLabels, 3) }),
  example('white-front', '白色朝前 · 5 组', repeat(rightHand, 5), '白色朝前时，需要连续做五组四步法。完整做完四步再判断，不要中途换角块。', { stepLabels: repeat(lessons[2].stepLabels, 5) }),
];

lessons[3].cases = [
  example('right', '插入右侧', lessons[3].formula, '前上方的绿红棱已与绿色中心对齐。它要去右边：先把顶层转离右侧目标。', { goal: '插入右侧棱块，完成前两层', formulaTitle: '右侧插入' }),
  example('left', '插入左侧', ["U'", "L'", 'U', 'L', 'U', 'F', "U'", "F'"], '前上方的绿橙棱已与绿色中心对齐。它要去左边：先把顶层转离左侧目标。', { goal: '插入左侧棱块，完成前两层', formulaTitle: '左侧插入' }),
];

lessons[4].cases = [
  example('line', '一字态 → 十字', yellowCross, '从顶面看，两个黄色棱块位于左、右。把这一字横着放，完成一组公式。', { expectedShape: 'line' }),
  example('elbow', '拐角态 → 一字 → 十字', repeat(yellowCross, 2), '黄色拐角位于左、后两侧。连续做两组公式，每组六步后观察形状变化。', { expectedShape: 'elbow', stages: [
    { start: 0, text: '拐角放在左后方，先做第一组六步公式。' },
    { start: 6, text: '现在出现横向一字。保持朝向，再做一组得到十字。' },
  ] }),
  example('dot', '点态 → 拐角 → 一字 → 十字', [...yellowCross, 'U2', ...yellowCross, ...yellowCross], '只看黄色棱块：现在没有黄色棱朝上。先做一组，出现拐角后调整顶层，再做两组。', { expectedShape: 'dot', stages: [
    { start: 0, text: '点态：先做一次六步公式，让两个黄色棱翻上来。' },
    { start: 6, text: '出现拐角：先做 U2，把拐角摆到左后方。' },
    { start: 7, text: '拐角已摆好。再做一组，得到横向一字。' },
    { start: 13, text: '一字态：保持当前朝向，最后一组得到黄色十字。' },
  ] }),
];

lessons[5].cases = [
  example('sune', '小鱼 · 黄色角在左前', sune, '只有左前方的黄色角朝上。保持黄色顶面和绿色前面，使用小鱼公式。', { formulaTitle: '小鱼公式' }),
  example('sune-turned', '小鱼 · 先调整朝向', ['U', ...sune], '黄色角现在位于右前方。先用 U 把它移到左前方，再做小鱼公式。', { formulaTitle: '调整朝向 + 小鱼', stages: [
    { start: 0, text: '先转顶层 U，让唯一朝上的黄色角移到左前方。' },
    { start: 1, text: '鱼头已到左前方，现在开始小鱼公式。' },
  ] }),
  example('antisune', '逆小鱼 · 黄色角在右后', reverse(sune), '本局面唯一朝上的黄色角在右后方，侧面的黄色方向与小鱼不同，使用逆小鱼公式。', { formulaTitle: '逆小鱼公式' }),
];

lessons[7].cases = [
  example('ua', 'Ua 三棱换', lessons[7].formula, '角块已经归位，剩下三个顶层棱需要循环交换。观察前、左、右三个位置的变化。', { formulaTitle: 'Ua 三棱换' }),
  example('ub', 'Ub 反向三棱换', reverse(lessons[7].formula), '本局面的三个顶层棱需要向相反方向交换。使用逆公式，最后检查六面。', { formulaTitle: 'Ub 三棱换' }),
];

// Keep the default formula/setup aligned with the first selectable example.
lessons.forEach(lesson => Object.assign(lesson, { formula: lesson.cases[0].formula, setup: lesson.cases[0].setup }));

export function resolveLesson(index, caseIndex = 0) {
  const base = lessons[index];
  return { ...base, ...base.cases[caseIndex] };
}
export function moveText(move) {
  const faces = { R: '右面', L: '左面', U: '顶层', D: '底层', F: '前面', B: '后面' };
  return `${faces[move[0]]}${move.endsWith('2') ? '转动 180°' : move.endsWith("'") ? '逆时针转 90°' : '顺时针转 90°'}`;
}
