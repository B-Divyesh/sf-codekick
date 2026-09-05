import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('the first screen names the job, audience, action, and playable field', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/');
  await expect(page).toHaveTitle('Codekick — Play a private 2v2 football match');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('main')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Play a private 2v2 football match' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Try it with sample data' })).toBeVisible();
  await expect(page.getByRole('img', { name: /Live Codekick football match/i })).toBeVisible();
  expect(errors).toEqual([]);
});

test('@claim:demo-end-screen A demo match reaches its end screen', async ({ page }) => {
  await page.goto('/demo');
  await expect(page.getByLabel('Demo mode')).toContainText('Demo — sample data, nothing is saved');
  await expect(page.getByRole('img', { name: /Live Codekick football match/i })).toBeVisible();
  await page.getByRole('button', { name: 'Finish the sample match' }).click();
  await expect(page.getByRole('heading', { name: /Sun wins|Tide wins|Draw match/ })).toBeVisible();
  await expect(page.getByText(/Final score:/)).toBeVisible();
});

test('@claim:restart-reset A rematch resets score and starts the next stadium rule', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Finish the sample match' }).click();
  await page.getByRole('button', { name: 'Play another match' }).click();
  await expect(page.locator('.score-strip')).toContainText('SUN 0');
  await expect(page.locator('.score-strip')).toContainText('0 TIDE');
  await expect(page.locator('[data-rule]')).toHaveText('Rule: Spring turf');
  await expect(page.getByRole('heading', { name: /Sun wins|Tide wins|Draw match/ })).toBeHidden();
});

test('@claim:settings-persist Settings persist in their browser namespace', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings' }).click();
  const assist = page.getByRole('checkbox', { name: /Assist mode/ });
  await assist.check();
  await page.getByRole('button', { name: 'Close' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('checkbox', { name: /Assist mode/ })).toBeChecked();
});

test('@claim:demo-isolation Reset and leaving the demo do not carry sample match state into a local match', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Finish the sample match' }).click();
  await page.getByRole('button', { name: 'Reset demo' }).first().click();
  await expect(page.locator('.score-strip')).toContainText('SUN 2');
  await page.getByRole('button', { name: 'Start for real' }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByLabel('Demo mode')).toHaveCount(0);
  await expect(page.locator('.score-strip')).toContainText('SUN 0');
  await expect(page.locator('.score-strip')).toContainText('0 TIDE');
});

test('@claim:local-demo-data Demo play sends no match data away from this origin', async ({ page, baseURL }) => {
  const requested: string[] = [];
  page.on('request', (request) => requested.push(request.url()));
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Finish the sample match' }).click();
  expect(requested).not.toEqual([]);
  expect(requested.every((url) => url.startsWith(baseURL!))).toBe(true);
});

test('@claim:free-local-match A local two-player match starts without sign-in or payment', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Match mode').selectOption('local');
  await expect(page.getByLabel('Match mode')).toHaveValue('local');
  await expect(page.locator('.score-strip')).toContainText('4:00');
  await expect(page.getByText('Local player two:', { exact: false })).toBeVisible();
});

test('@claim:four-minute-round A fresh local match begins with a four-minute clock', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.score-strip')).toContainText('4:00');
  await page.waitForTimeout(1400);
  await expect(page.locator('.score-strip')).toContainText(/3:5[0-9]/);
});

test('@claim:match-recovery An unfinished local match returns after a reload', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Match mode').selectOption('local');
  await page.waitForTimeout(2500);
  const savedClock = await page.locator('[data-clock]').textContent();
  await page.reload();
  await expect(page.getByLabel('Match mode')).toHaveValue('local');
  await expect(page.locator('[data-clock]')).toHaveText(savedClock!);
});

test('@claim:keyboard-controls Keyboard movement changes the active captain position', async ({ page }) => {
  await page.goto('/');
  const description = page.locator('[data-match-description]');
  await page.waitForTimeout(1200);
  const before = await description.textContent();
  await page.getByRole('img', { name: /Live Codekick football match/i }).focus();
  await page.keyboard.down('d');
  await page.waitForTimeout(350);
  await page.keyboard.up('d');
  const after = await description.textContent();
  expect(after).not.toBe(before);
});

test('@claim:touch-controls Touch movement changes the active captain position', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'Touch controls are checked in the phone project.');
  await page.goto('/');
  const description = page.locator('[data-match-description]');
  await page.waitForTimeout(1200);
  const before = await description.textContent();
  const right = page.getByRole('button', { name: 'Move right' });
  await right.dispatchEvent('pointerdown');
  await page.waitForTimeout(350);
  await right.dispatchEvent('pointerup');
  expect(await description.textContent()).not.toBe(before);
});

test('@claim:phone-frame-rate The phone profile sustains the 60 fps rendering target', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'Frame rate is measured in the phone project.');
  await page.goto('/');
  const measurement = await page.evaluate(async () => {
    const stamps: number[] = [];
    await new Promise<void>((resolve) => {
      const sample = (time: number) => {
        stamps.push(time);
        if (stamps.length === 121) resolve();
        else requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    const intervals = stamps.slice(1).map((stamp, index) => stamp - stamps[index]);
    const meanInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    return { frames: intervals.length, meanInterval, fps: 1000 / meanInterval };
  });
  await testInfo.attach('phone-frame-rate.json', { body: JSON.stringify(measurement), contentType: 'application/json' });
  expect(measurement.frames).toBe(120);
  expect(measurement.fps).toBeGreaterThanOrEqual(55);
});

test('both advertised match modes and all stadium rules can be selected in play', async ({ page }) => {
  await page.goto('/demo');
  await expect(page.getByLabel('Match mode')).toHaveValue('practice');
  await page.getByLabel('Match mode').selectOption('local');
  await expect(page.getByLabel('Match mode')).toHaveValue('local');
  await page.getByRole('button', { name: 'Finish the sample match' }).click();
  await page.getByRole('button', { name: 'Play another match' }).click();
  await expect(page.locator('[data-rule]')).toHaveText('Rule: Spring turf');
  await page.getByRole('button', { name: 'Finish the sample match' }).click();
  await page.getByRole('button', { name: 'Play another match' }).click();
  await expect(page.locator('[data-rule]')).toHaveText('Rule: Pinched goals');
  await page.getByRole('button', { name: 'Finish the sample match' }).click();
  await page.getByRole('button', { name: 'Play another match' }).click();
  await expect(page.locator('[data-rule]')).toHaveText('Rule: Crosswind');
});

test('routes set a route title, return control to the page heading, and include a styled 404', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Privacy' }).first().click();
  await expect(page).toHaveURL('/privacy');
  await expect(page).toHaveTitle('Privacy — Codekick');
  await expect(page.getByRole('heading', { name: 'Keep local match data in this browser' })).toBeFocused();
  await page.goto('/this-is-not-a-route');
  await expect(page).toHaveTitle('Page not found — Codekick');
  await expect(page.getByRole('heading', { name: 'This Codekick page does not exist' })).toBeVisible();
});

test('has no serious or critical accessibility violations on the game and privacy pages', async ({ page }) => {
  for (const path of ['/', '/demo', '/privacy']) {
    await page.goto(path);
    const results = await new AxeBuilder({ page: page as never }).analyze();
    expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? '')).map((violation) => violation.id)).toEqual([]);
  }
});
