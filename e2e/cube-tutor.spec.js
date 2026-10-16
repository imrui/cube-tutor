import { test, expect } from '@playwright/test';

const errors = new WeakMap();
test.beforeEach(async ({ page }) => {
  const list = []; errors.set(page, list); page.on('pageerror', error => list.push(error.message));
  await page.goto('/');
  await expect(page.locator('#goal-status')).toBeVisible();
});
test.afterEach(async ({ page }) => { expect(errors.get(page)).toEqual([]); });

// Phone projects (Android Chromium and iPhone WebKit) emulate a mobile touch device.
const isTouchPhone = testInfo => Boolean(testInfo.project.use.isMobile && testInfo.project.use.hasTouch);

async function selectLesson(page, index, variant = 0) {
  // Wide screens list lessons in the sidebar; small screens pick them from the lesson sheet.
  if (await page.locator('#lessons').isVisible()) await page.locator(`#lessons [data-lesson="${index}"]`).click();
  else { await page.locator('#lesson-open').click(); await page.locator(`#sheet-lessons [data-lesson="${index}"]`).click(); }
  if (variant) await page.locator(`[data-case="${variant}"]`).click();
}
// Wide screens toggle the theme from the page header; phones from the lesson sheet.
async function toggleTheme(page) {
  if (await page.locator('#theme').isVisible()) return page.locator('#theme').click();
  await page.locator('#lesson-open').click();
  await page.locator('#lesson-sheet [data-theme-toggle]').click();
  await page.locator('#close-sheet').click();
}
async function move(page, face, expectedStep) {
  await page.locator(`[data-move="${face}"]`).click();
  await expect(page.locator('#reset')).toBeEnabled();
  if (expectedStep !== undefined) await expect(page.locator('#step-status')).toHaveText(expectedStep);
}

test('play, pause, previous and finish keep guidance aligned with the actual turn', async ({ page }) => {
  await selectLesson(page, 2);
  // Slow enough to inspect a turn while it is in flight.
  await page.locator('#speed').click(); await page.locator('#speed').click();
  await page.locator('#play').click();
  await expect(page.locator('#play')).toHaveAttribute('aria-label', '暂停');
  await page.locator('#play').click();
  await expect(page.locator('#step-status')).toHaveText('动作 1 / 4');
  await expect(page.locator('#reset')).toBeEnabled();
  await expect(page.locator('#viewport')).toHaveAttribute('data-guide-move', 'U');
  await page.locator('#prev').click();
  await expect(page.locator('#move-tag-letter')).toHaveText('R′');
  await expect(page.locator('#move-tag-text')).toHaveText('右面逆时针转 90°');
  await expect(page.locator('#viewport')).toHaveAttribute('data-guide-move', "R'");
  await expect(page.locator('#step-status')).toHaveText('动作 0 / 4');
  await page.locator('#speed').click(); await page.locator('#speed').click();
  await page.locator('#play').click();
  await expect(page.locator('#step-status')).toHaveText('动作 4 / 4');
  await expect(page.locator('#goal-status')).toHaveAttribute('data-met', 'true');
  await expect(page.locator('#move-tag')).not.toHaveClass(/visible/);
  await expect(page.locator('#viewport')).toHaveAttribute('data-guide-move', '');
  await toggleTheme(page); // Retheming must not bring the finished arrow back.
  await expect(page.locator('#viewport')).toHaveAttribute('data-guide-move', '');
  await expect(page.locator('.case-chip.passed')).toHaveCount(0);
});

test('half-turn practice rejects wrong moves, supports undo and validates a real cross', async ({ page }) => {
  await selectLesson(page, 1);
  await page.locator('.mode-tabs [data-mode="practice"]').click();
  await page.locator('[data-move="R"]').click();
  await expect(page.locator('#toast')).toContainText('这一步是 F2');
  await expect(page.locator('#step-status')).toHaveText('动作 0 / 4');
  await move(page, 'F', '动作 0 / 4');
  await expect(page.locator('#practice-message')).toContainText('再转一次 F');
  await page.locator('#inverse').click();
  await move(page, 'F', '动作 0 / 4');
  await expect(page.locator('#practice-message')).toContainText('F2');
  for (const [i, face] of ['F', 'R', 'B', 'L'].entries()) {
    await move(page, face, `动作 ${i} / 4`);
    await expect(page.locator('#viewport')).toHaveAttribute('data-guide-move', `${face}'`);
    await move(page, face, `动作 ${i + 1} / 4`);
  }
  await expect(page.locator('#goal-status')).toHaveText('✓ 已达成');
  await expect(page.locator('.case-chip.passed')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('.case-chip.passed')).toHaveCount(1);
  await page.locator('[data-case="1"]').click();
  await page.locator('.mode-tabs [data-mode="practice"]').click();
  await move(page, 'U', '动作 1 / 2');
  await move(page, 'F', '动作 1 / 2');
  await move(page, 'F', '动作 2 / 2');
  await expect(page.locator('.case-chip.passed')).toHaveCount(2);
  await expect(page.locator('#progress-label')).toHaveText('1 / 8');
});

test('each lesson variant switches its formula and goal, without marking a visit complete', async ({ page }) => {
  await selectLesson(page, 3, 1);
  await expect(page.locator('#formula-title')).toHaveText('左侧插入');
  await expect(page.locator('#goal-status')).toContainText('11 / 12');
  await page.locator('#speed').click(); await page.locator('#play').click();
  await expect(page.locator('#goal-status')).toHaveAttribute('data-met', 'true');
  await expect(page.locator('.case-chip.passed')).toHaveCount(0);
  await page.locator('#complete').click();
  await expect(page.locator('#lesson-title')).toHaveText('顶层黄色十字');
  await expect(page.locator('#progress-label')).toHaveText('0 / 8');
  await page.locator('[data-case="2"]').click();
  await expect(page.locator('#goal-status')).toContainText('0 / 4');
  await expect(page.locator('#formula button')).toHaveCount(19);
  await expect(page.locator('#case-note')).toContainText('点态');
});

test('both themes keep the enabled inverse symbol readable and persist the choice', async ({ page }) => {
  await page.locator('#inverse').click();
  for (let i = 0; i < 2; i++) {
    const colors = await page.locator('#inverse span').evaluate(el => ({ color: getComputedStyle(el).color, background: getComputedStyle(el).backgroundColor }));
    expect(colors.color).not.toBe(colors.background);
    await toggleTheme(page);
  }
  const label = await page.locator('#theme').getAttribute('aria-label');
  await page.reload();
  await expect(page.locator('#theme')).toHaveAttribute('aria-label', label);
});

test('mobile practice keeps the cube and touch keys visible without horizontal overflow', async ({ page }, testInfo) => {
  test.skip(!isTouchPhone(testInfo));
  await selectLesson(page, 2);
  await page.locator('.mode-tabs [data-mode="practice"]').tap();
  await expect(page.locator('#viewport')).toBeInViewport({ ratio: .9 });
  await expect(page.locator('#move-keys')).toBeInViewport({ ratio: .9 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('[data-move="R"]').tap();
  await expect(page.locator('#step-status')).toHaveText('动作 1 / 4');
  await expect(page.locator('#practice-message')).toContainText('请转动 U');
});

test('mobile lesson bar stays reachable and switches lessons from the sheet', async ({ page }, testInfo) => {
  test.skip(!isTouchPhone(testInfo));
  await expect(page.locator('#lessons')).toBeHidden();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(page.locator('.lesson-bar')).toBeInViewport();
  await page.locator('#lesson-open').tap();
  await expect(page.locator('#lesson-sheet')).toBeVisible();
  await page.locator('#sheet-lessons [data-lesson="3"]').tap();
  await expect(page.locator('#lesson-sheet')).toBeHidden();
  await expect(page.locator('#lesson-bar-name')).toHaveText('中层棱块');
  await expect(page.locator('#lesson-title')).toHaveText('中层棱块');
  await page.locator('#lesson-next').tap();
  await expect(page.locator('#lesson-bar-name')).toHaveText('顶层黄色十字');
  await page.locator('#lesson-prev').tap();
  await expect(page.locator('#lesson-bar-name')).toHaveText('中层棱块');
});

test('the lesson card keeps one goal line and folds the longer explanations', async ({ page }) => {
  await selectLesson(page, 2, 1);
  await expect(page.locator('#goal')).toHaveText('将白色角块送回右下角');
  await expect(page.locator('[data-case="1"]')).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('#lesson-desc')).toBeHidden();
  await page.locator('#lesson-more summary').click();
  await expect(page.locator('#lesson-desc')).toBeVisible();
  await expect(page.locator('#move-tag-text')).toHaveText('右手抬起 · 右面顺时针转 90°');
  await selectLesson(page, 0);
  await expect(page.locator('#case-chips')).toBeHidden();
});

test('free practice is a mode tab and the phone header is a single lesson bar', async ({ page }, testInfo) => {
  await page.locator('.mode-tabs [data-mode="sandbox"]').click();
  await expect(page.locator('.mode-tabs [data-mode="sandbox"]')).toHaveClass(/active/);
  await expect(page.locator('#goal')).toHaveText('还原六面');
  await page.locator('.mode-tabs [data-mode="learn"]').click();
  await expect(page.locator('.mode-tabs [data-mode="learn"]')).toHaveClass(/active/);
  if (!isTouchPhone(testInfo)) return;
  await expect(page.locator('.sidebar')).toBeHidden();
  await expect(page.locator('.page-heading')).toBeHidden();
  await expect(page.locator('.cube-card')).toBeInViewport({ ratio: .95 });
  await page.locator('.lesson-bar [data-open-help]').click();
  await expect(page.locator('#help-dialog')).toBeVisible();
});

// Regression: iOS Safari applied the stylesheet late, the scene read empty color tokens and drew an all-white cube.
test('the 3D cube is drawn with its sticker colors on first load', async ({ page }) => {
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--cube-body').trim())).not.toBe('');
  const canvas = page.locator('#viewport canvas');
  // Decode a screenshot of the canvas in the page and measure how much of it is strongly saturated (red, orange, yellow, green, blue stickers).
  const coloredShare = async () => {
    const png = (await canvas.screenshot()).toString('base64');
    return page.evaluate(async src => {
      const img = new Image(); img.src = `data:image/png;base64,${src}`; await img.decode();
      const ctx = Object.assign(document.createElement('canvas'), { width: img.width, height: img.height }).getContext('2d');
      ctx.drawImage(img, 0, 0);
      const { data } = ctx.getImageData(0, 0, img.width, img.height);
      let colored = 0;
      for (let i = 0; i < data.length; i += 4) if (Math.max(data[i], data[i + 1], data[i + 2]) - Math.min(data[i], data[i + 1], data[i + 2]) > 90) colored++;
      return colored / (data.length / 4);
    }, png);
  };
  await expect.poll(coloredShare, { timeout: 10_000 }).toBeGreaterThan(0.02);
});
