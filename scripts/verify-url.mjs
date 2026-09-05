import { chromium } from '@playwright/test';

const url = process.argv[2];
if (!url) throw new Error('Pass a URL to verify.');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const consoleErrors = [];
page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
const response = await page.goto(url, { waitUntil: 'networkidle' });
if (!response?.ok()) throw new Error(`Expected a successful response from ${url}, got ${response?.status()}.`);
if (!(await page.title()).trim()) throw new Error('Missing document title.');
if (await page.locator('html[lang]').count() !== 1) throw new Error('Missing html language.');
if (await page.locator('main').count() !== 1) throw new Error('Expected one main landmark.');
if (await page.locator('h1').count() !== 1) throw new Error('Expected one h1.');
const missingAlt = await page.locator('img:not([alt])').count();
if (missingAlt) throw new Error(`${missingAlt} image(s) are missing alt text.`);
if (consoleErrors.length) throw new Error(`Console errors: ${consoleErrors.join(' | ')}`);
console.log(`Verified title, lang, main, alt text, and console for ${url}`);
await browser.close();
