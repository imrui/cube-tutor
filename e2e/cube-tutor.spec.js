import { test, expect } from '@playwright/test';

const errors = new WeakMap();
test.beforeEach(async ({ page }) => {
  const list = []; errors.set(page, list); page.on('pageerror', error => list.push(error.message));
  await page.goto('/');
  await expect(page.locator('#goal-status')).toBeVisible();
});
test.afterEach(async ({ page }) => { expect(errors.get(page)).toEqual([]); });

async function selectLesson(page, index, variant = 0) {
  // Wide screens list lessons in the sidebar; small screens pick them from the lesson sheet.
  if (await page.locator('#lessons').isVisible()) await page.locator(`#lessons [data-lesson="${index}"]`).click();
  else { await page.locator('#lesson-open').click(); await page.locator(`#sheet-lessons [data-lesson="${index}"]`).click(); }
  await page.locator('#case-select').selectOption(String(variant));
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
  await expect(page.locator('#action-subtitle')).toHaveText('右面逆时针转 90°');
  await expect(page.locator('#viewport')).toHaveAttribute('data-guide-move', "R'");
  await expect(page.locator('#step-status')).toHaveText('动作 0 / 4');
  await page.locator('#speed').click(); await page.locator('#speed').click();
  await page.locator('#play').click();
  await expect(page.locator('#step-status')).toHaveText('动作 4 / 4');
  await expect(page.locator('#goal-status')).toHaveAttribute('data-met', 'true');
  await expect(page.locator('#move-tag')).not.toHaveClass(/visible/);
  await expect(page.locator('#viewport')).toHaveAttribute('data-guide-move', '');
  await page.locator('#theme').click(); // Retheming must not bring the finished arrow back.
  await expect(page.locator('#viewport')).toHaveAttribute('data-guide-move', '');
  await expect(page.locator('#case-count')).toHaveText('0 / 3 已跟练');
});

test('half-turn practice rejects wrong moves, supports undo and validates a real cross', async ({ page }) => {
  await selectLesson(page, 1);
  await page.locator('[data-mode="practice"]').click();
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
  await expect(page.locator('#goal-status')).toContainText('跟练通过');
  await expect(page.locator('#case-count')).toHaveText('1 / 2 已跟练');
  await page.reload();
  await expect(page.locator('#case-count')).toHaveText('1 / 2 已跟练');
  await page.locator('#case-select').selectOption('1');
  await page.locator('[data-mode="practice"]').click();
  await move(page, 'U', '动作 1 / 2');
  await move(page, 'F', '动作 1 / 2');
  await move(page, 'F', '动作 2 / 2');
  await expect(page.locator('#case-count')).toHaveText('2 / 2 已跟练');
  await expect(page.locator('#progress-label')).toHaveText('1 / 8');
});

test('each lesson variant switches its formula and goal, without marking a visit complete', async ({ page }) => {
  await selectLesson(page, 3, 1);
  await expect(page.locator('#formula-title')).toHaveText('左侧插入');
  await expect(page.locator('#goal-status')).toContainText('11 / 12');
  await page.locator('#speed').click(); await page.locator('#play').click();
  await expect(page.locator('#goal-status')).toHaveAttribute('data-met', 'true');
  await expect(page.locator('#case-count')).toHaveText('0 / 2 已跟练');
  await page.locator('#complete').click();
  await expect(page.locator('#lesson-title')).toHaveText('顶层黄色十字');
  await expect(page.locator('#progress-label')).toHaveText('0 / 8');
  await page.locator('#case-select').selectOption('2');
  await expect(page.locator('#goal-status')).toContainText('0 / 4');
  await expect(page.locator('#formula button')).toHaveCount(19);
  await expect(page.locator('#case-note')).toContainText('点态');
});

test('both themes keep the enabled inverse symbol readable and persist the choice', async ({ page }) => {
  await page.locator('#inverse').click();
  for (let i = 0; i < 2; i++) {
    const colors = await page.locator('#inverse span').evaluate(el => ({ color: getComputedStyle(el).color, background: getComputedStyle(el).backgroundColor }));
    expect(colors.color).not.toBe(colors.background);
    await page.locator('#theme').click();
  }
  const label = await page.locator('#theme').getAttribute('aria-label');
  await page.reload();
  await expect(page.locator('#theme')).toHaveAttribute('aria-label', label);
});

test('mobile practice keeps the cube and touch keys visible without horizontal overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile');
  await selectLesson(page, 2);
  await page.locator('[data-mode="practice"]').tap();
  await expect(page.locator('#viewport')).toBeInViewport({ ratio: .9 });
  await expect(page.locator('#move-keys')).toBeInViewport({ ratio: .9 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('[data-move="R"]').tap();
  await expect(page.locator('#step-status')).toHaveText('动作 1 / 4');
  await expect(page.locator('#practice-message')).toContainText('请转动 U');
});

test('mobile lesson bar stays reachable and switches lessons from the sheet', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile');
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
