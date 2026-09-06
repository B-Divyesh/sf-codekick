import { expect, test, type BrowserContext } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('the first screen names the job, audience, action, and playable field', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/');
  await expect(page).toHaveTitle('Codekick — Play private 2v2 football');
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
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('codekick:verification-sentinel', 'real-data'));
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Finish the sample match' }).click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('demo:codekick:match'))).not.toBeNull();
  await page.getByRole('button', { name: 'Reset demo' }).first().click();
  await expect(page.locator('.score-strip')).toContainText('SUN 2');
  await page.getByRole('button', { name: 'Start for real' }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByLabel('Demo mode')).toHaveCount(0);
  await expect(page.locator('.score-strip')).toContainText('SUN 0');
  await expect(page.locator('.score-strip')).toContainText('0 TIDE');
  expect(await page.evaluate(() => ({
    demoMatch: localStorage.getItem('demo:codekick:match'),
    demoSettings: localStorage.getItem('demo:codekick:settings'),
    realSentinel: localStorage.getItem('codekick:verification-sentinel')
  }))).toEqual({ demoMatch: null, demoSettings: null, realSentinel: 'real-data' });
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
  const right = page.getByRole('button', { name: 'Player one move right' });
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

test('@claim:sample-duration The supplied demo begins with a 28-second clock', async ({ page }) => {
  await page.goto('/demo');
  await expect(page.locator('[data-clock]')).toHaveText('0:28');
  await page.waitForTimeout(1100);
  await expect(page.locator('[data-clock]')).toHaveText(/0:2[67]/);
});

test('@claim:practice-2v2 Practice runs a populated 2v2 match against moving bots', async ({ page }) => {
  await page.goto('/demo');
  const description = page.locator('[data-match-description]');
  const before = await description.textContent();
  expect(before).toContain('sun-1 position');
  expect(before).toContain('sun-2 position');
  expect(before).toContain('tide-1 position');
  expect(before).toContain('tide-2 position');
  const tideBefore = before?.match(/tide-1 position (\d+) by (\d+)/)?.[0];
  await page.waitForTimeout(500);
  const tideAfter = (await description.textContent())?.match(/tide-1 position (\d+) by (\d+)/)?.[0];
  expect(tideAfter).not.toBe(tideBefore);
});

test('@claim:ball-actions-combo The demo gives visible possession, pass, shot, and goal outcomes', async ({ page }) => {
  await page.goto('/demo');
  const pitch = page.getByRole('img', { name: /Live Codekick football match/i });
  const comboText = await page.locator('[data-callout]').textContent();
  const comboSeconds = Number(comboText?.match(/Combo ([\d.]+)s/)?.[1]);
  expect(comboSeconds).toBeGreaterThanOrEqual(1.6);
  expect(comboSeconds).toBeLessThanOrEqual(2);
  await page.waitForTimeout(2100);
  await expect(page.locator('[data-callout]')).toHaveText('Possession');
  await page.getByRole('button', { name: 'Reset demo' }).first().click();
  await pitch.focus();
  await page.keyboard.press('f');
  await expect(page.locator('[data-match-description]')).toContainText('Ball is free');
  await page.getByRole('button', { name: 'Reset demo' }).first().click();
  await pitch.focus();
  await page.keyboard.press('g');
  await expect(page.locator('[data-sun-score]')).toHaveText('3');
});

test('@claim:second-player-controls Player two can move, pass, and shoot with keyboard or touch', async ({ page }, testInfo) => {
  await page.goto('/demo');
  await page.getByLabel('Match mode').selectOption('local');
  const description = page.locator('[data-match-description]');
  const before = (await description.textContent())?.match(/tide-1 position (\d+) by (\d+)/)?.[0];
  if (testInfo.project.name === 'phone') {
    const move = page.getByRole('button', { name: 'Player two move right' });
    await move.dispatchEvent('pointerdown');
    await page.waitForTimeout(300);
    await move.dispatchEvent('pointerup');
    await page.getByLabel('Player two touch controls').getByRole('button', { name: 'Pass' }).click();
  } else {
    await page.getByRole('img', { name: /Live Codekick football match/i }).focus();
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(300);
    await page.keyboard.up('ArrowRight');
    await page.keyboard.press('.');
  }
  const after = (await description.textContent())?.match(/tide-1 position (\d+) by (\d+)/)?.[0];
  expect(after).not.toBe(before);
  await expect(description).toContainText('Ball is free');
  await page.getByLabel('Match mode').selectOption('practice');
  await page.getByLabel('Match mode').selectOption('local');
  if (testInfo.project.name === 'phone') {
    await page.getByLabel('Player two touch controls').getByRole('button', { name: 'Shoot' }).click();
  } else {
    await page.getByRole('img', { name: /Live Codekick football match/i }).focus();
    await page.keyboard.press('/');
  }
  await expect(page.locator('[data-tide-score]')).toHaveText('2');
});

test('@claim:pause-recovery Pause works at kickoff and during active play', async ({ page }) => {
  await page.goto('/');
  const pause = page.getByRole('button', { name: 'Pause' });
  await pause.click();
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
  await expect(page.locator('[data-callout]')).toHaveText('Paused');
  const clock = await page.locator('[data-clock]').textContent();
  await page.waitForTimeout(500);
  await expect(page.locator('[data-clock]')).toHaveText(clock!);
  await page.getByRole('button', { name: 'Resume' }).click();
  await page.waitForTimeout(1300);
  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.locator('[data-callout]')).toHaveText('Paused');
});

test('@claim:input-settings Reduced motion and remapped keys persist and control play', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('checkbox', { name: /Reduce field motion/ }).check();
  await page.getByRole('button', { name: 'Change pass key' }).click();
  await page.keyboard.press('h');
  await expect(page.getByText('Key updated.')).toBeVisible();
  await page.getByRole('button', { name: 'Change shoot key' }).click();
  await page.keyboard.press('j');
  await expect(page.getByText('Key updated.')).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('checkbox', { name: /Reduce field motion/ })).toBeChecked();
  await expect(page.locator('[data-dialog-pass]')).toHaveText('H');
  await expect(page.locator('[data-dialog-shot]')).toHaveText('J');
  await page.getByRole('button', { name: 'Close' }).click();
  await page.getByRole('img', { name: /Live Codekick football match/i }).focus();
  await page.keyboard.press('h');
  await expect(page.locator('[data-match-description]')).toContainText('Ball is free');
  await page.evaluate(() => localStorage.removeItem('demo:codekick:match'));
  await page.reload();
  await page.getByRole('img', { name: /Live Codekick football match/i }).focus();
  await page.keyboard.press('j');
  await expect(page.locator('[data-sun-score]')).toHaveText('3');
});

test('@claim:assist-mode Assist mode measurably slows player movement', async ({ page }) => {
  const moveDistance = async () => {
    await page.waitForTimeout(1100);
    const description = page.locator('[data-match-description]');
    const before = Number((await description.textContent())?.match(/sun-1 position (\d+)/)?.[1]);
    await page.getByRole('img', { name: /Live Codekick football match/i }).focus();
    await page.keyboard.down('d');
    await page.waitForTimeout(450);
    await page.keyboard.up('d');
    const after = Number((await description.textContent())?.match(/sun-1 position (\d+)/)?.[1]);
    return after - before;
  };
  await page.goto('/');
  const normal = await moveDistance();
  await page.evaluate(() => localStorage.removeItem('codekick:match'));
  await page.reload();
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('checkbox', { name: /Assist mode/ }).check();
  await page.getByRole('button', { name: 'Close' }).click();
  const assisted = await moveDistance();
  expect(normal).toBeGreaterThan(80);
  expect(assisted).toBeLessThan(normal * 0.92);
});

test('@claim:privacy-all-routes Normal play and public routes load no third-party assets or tracking', async ({ page, baseURL }) => {
  const requested: string[] = [];
  page.on('request', (request) => requested.push(request.url()));
  for (const route of ['/', '/how-to-play', '/privacy', '/terms']) await page.goto(route);
  expect(requested.length).toBeGreaterThan(4);
  expect(requested.every((url) => url.startsWith(baseURL!))).toBe(true);
});

test('@claim:private-room @claim:online-end-screen Four independent clients join one room, share authoritative play, and reach a rematch', async ({ page, browser }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'The independent-client run uses the desktop project once.');
  const contexts: BrowserContext[] = [];
  try {
    await page.goto('/');
    await page.getByRole('button', { name: 'Create a room' }).click();
    await expect(page.locator('[data-room-code]')).toHaveText(/^[A-Z0-9]{6}$/);
    const code = (await page.locator('[data-room-code]').textContent())?.trim() ?? '';
    expect(code).toMatch(/^[A-Z0-9]{6}$/);
    await expect(page.locator('[data-room-status]')).toContainText('Sun captain');

    const guests = [];
    for (const role of ['Tide captain', 'Sun teammate', 'Tide teammate']) {
      const context = await browser.newContext();
      contexts.push(context);
      const guest = await context.newPage();
      guests.push(guest);
      await guest.goto(`/?room=${code}`);
      await guest.getByRole('button', { name: 'Join room' }).click();
      await expect(guest.locator('[data-room-status]')).toContainText(role);
      if (guests.length === 1) {
        await expect(page.locator('[data-callout]')).not.toHaveText(/Waiting|Kickoff/, { timeout: 4000 });
        const beforeText = await guest.locator('[data-match-description]').textContent();
        const beforeX = Number(beforeText?.match(/sun-1 position (\d+)/)?.[1]);
        await page.getByRole('img', { name: /Live Codekick football match/i }).focus();
        await page.keyboard.down('d');
        await page.waitForTimeout(450);
        await page.keyboard.up('d');
        await expect.poll(async () => Number((await guest.locator('[data-match-description]').textContent())?.match(/sun-1 position (\d+)/)?.[1])).toBeGreaterThan(beforeX + 20);
        const beforeBots = await guest.locator('[data-match-description]').textContent();
        const beforeBotX = Number(beforeBots?.match(/sun-2 position (\d+)/)?.[1]);
        await page.waitForTimeout(350);
        await expect.poll(async () => Number((await guest.locator('[data-match-description]').textContent())?.match(/sun-2 position (\d+)/)?.[1])).not.toBe(beforeBotX);
        await page.reload();
        await expect(page.locator('[data-room-status]')).toContainText('Sun captain');
      }
    }
    await expect(page.locator('[data-room-status]')).toContainText('4 of 4 players connected');
    await expect(page.locator('[data-callout]')).not.toHaveText('Waiting for a friend', { timeout: 4000 });
    const observer = guests[0];
    await expect(page.getByRole('heading', { name: /Sun wins|Tide wins|Draw match/ })).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: 'Play another match' }).click();
    await expect(observer.locator('.score-strip')).toContainText('SUN 0');
    await expect(observer.locator('[data-rule]')).toHaveText('Rule: Spring turf');

    const fifthContext = await browser.newContext();
    contexts.push(fifthContext);
    const fifth = await fifthContext.newPage();
    await fifth.goto(`/?room=${code}`);
    await fifth.getByRole('button', { name: 'Join room' }).click();
    await expect(fifth.locator('[data-room-status]')).toContainText('already has four players');
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});

test('@claim:stadium-rules All three stadium rules rotate across rematches', async ({ page }) => {
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
  await expect(page.getByRole('heading', { name: 'Control your Codekick match data' })).toBeFocused();
  await page.goto('/this-is-not-a-route');
  await expect(page).toHaveTitle('Page not found — Codekick');
  await expect(page.getByRole('heading', { name: 'This Codekick page does not exist' })).toBeVisible();
});

test('reported accessibility regressions stay fixed at narrow widths and 200% text', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/demo');
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client);
  for (const name of ['Reset demo', 'Start for real']) {
    const box = await page.getByRole('button', { name }).first().boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
    expect(box?.width).toBeGreaterThanOrEqual(44);
  }
});

test('phone links meet the 44 pixel touch target across public and 404 pages', async ({ page }) => {
  const expectTouchTarget = async (locator: ReturnType<typeof page.locator>) => {
    const box = await locator.boundingBox();
    expect(box).not.toBeNull();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
  };

  await page.setViewportSize({ width: 393, height: 727 });
  await page.goto('/');
  await expectTouchTarget(page.locator('.site-header .wordmark'));
  for (const link of await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link').all()) {
    await expectTouchTarget(link);
  }
  for (const link of await page.getByRole('navigation', { name: 'Footer navigation' }).getByRole('link').all()) {
    await expectTouchTarget(link);
  }

  await page.goto('/privacy');
  await expectTouchTarget(page.getByRole('link', { name: 'privacy@sociobot.in' }));

  await page.goto('/404.html');
  await expectTouchTarget(page.locator('header .wordmark'));
  for (const link of await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link').all()) {
    await expectTouchTarget(link);
  }
  for (const link of await page.getByRole('navigation', { name: 'Footer navigation' }).getByRole('link').all()) {
    await expectTouchTarget(link);
  }
});

test('the privacy page provides an actionable request address', async ({ page }) => {
  await page.goto('/privacy');
  await expect(page.getByRole('link', { name: 'privacy@sociobot.in' })).toHaveAttribute('href', /^mailto:privacy@sociobot\.in/);
});

test('invalid room codes and damaged browser state recover with a clear next action', async ({ page }) => {
  await page.goto('/');
  const roomCode = page.getByRole('textbox', { name: 'Room code' });
  await roomCode.fill('BAD');
  await page.getByRole('button', { name: 'Join room' }).click();
  await expect(page.locator('[data-room-status]')).toHaveText('Enter the six-character room code.');
  await expect(roomCode).toHaveAttribute('aria-invalid', 'true');
  await roomCode.fill('AAAAAA');
  await page.getByRole('button', { name: 'Join room' }).click();
  await expect(page.locator('[data-room-status]')).toContainText('not found');
  await page.evaluate(() => {
    localStorage.setItem('codekick:match', '{}');
    localStorage.setItem('codekick:settings', '{"passKey":[],"reducedMotion":"yes"}');
  });
  await page.reload();
  await expect(page.locator('[data-clock]')).toHaveText('4:00');
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.locator('[data-dialog-pass]')).toHaveText('F');
});

test('has no axe accessibility violations on every public page', async ({ page }) => {
  for (const path of ['/', '/demo', '/how-to-play', '/privacy', '/terms']) {
    await page.goto(path);
    const results = await new AxeBuilder({ page: page as never }).analyze();
    expect(results.violations.map((violation) => ({ id: violation.id, impact: violation.impact }))).toEqual([]);
  }
});
