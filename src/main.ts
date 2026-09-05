import './styles.css';
import { FIELD, GameEngine, formatClock, type InputFrame, type MatchMode, type Phase, type Rule, type SerializedMatch } from './engine';

type Settings = {
  reducedMotion: boolean;
  assistMode: boolean;
  passKey: string;
  shotKey: string;
};

const DEFAULT_SETTINGS: Settings = {
  reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  assistMode: false,
  passKey: 'f',
  shotKey: 'g'
};

const appElement = document.querySelector<HTMLElement>('#app');
if (!appElement) throw new Error('Codekick could not start because the app root is missing.');
const app: HTMLElement = appElement;

let activeGame: GameView | undefined;
let routeAnnouncement: HTMLElement | undefined;

const routeInfo: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'Codekick — Play a private 2v2 football match',
    description: 'Play a short 2v2 football match with friends on keyboard or touch.'
  },
  '/demo': {
    title: 'Demo — Codekick',
    description: 'Try a short Codekick sample match without saving game data.'
  },
  '/how-to-play': {
    title: 'How to play — Codekick',
    description: 'Learn the Codekick controls and match rules.'
  },
  '/privacy': {
    title: 'Privacy — Codekick',
    description: 'Read how Codekick stores game settings and match state.'
  },
  '/terms': {
    title: 'Terms — Codekick',
    description: 'Read the Codekick terms of use.'
  },
  '/404': {
    title: 'Page not found — Codekick',
    description: 'The requested Codekick page does not exist.'
  }
};

const getRoute = () => {
  const pathname = window.location.pathname.replace(/\/$/, '') || '/';
  return pathname in routeInfo ? pathname : '/404';
};

const writeMeta = (route: string) => {
  const info = routeInfo[route];
  document.title = info.title;
  const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (description) description.content = info.description;
  const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (canonical) canonical.href = `https://codekick.sociobot.in${route === '/404' ? '/' : route}`;
};

const navigate = (route: string, focus = true) => {
  window.history.pushState({}, '', route);
  renderRoute(focus);
};

function pageShell(route: string, content: string): string {
  const demoActive = route === '/demo';
  return `
    <header class="site-header">
      <a class="wordmark" href="/" data-route>Codekick <span aria-hidden="true">●</span></a>
      <nav aria-label="Primary navigation">
        <a href="/demo" data-route${demoActive ? ' aria-current="page"' : ''}>Demo</a>
        <a href="/how-to-play" data-route${route === '/how-to-play' ? ' aria-current="page"' : ''}>How to play</a>
        <a href="/privacy" data-route${route === '/privacy' ? ' aria-current="page"' : ''}>Privacy</a>
      </nav>
    </header>
    <div class="route-announcement" aria-live="polite" aria-atomic="true"></div>
    <main id="main" tabindex="-1">${content}</main>
    <footer class="site-footer">
      <p>Short 2v2 football matches for friends on one screen.</p>
      <nav aria-label="Footer navigation"><a href="/privacy" data-route>Privacy</a><a href="/terms" data-route>Terms</a></nav>
      <p>Built by Param Factory · build 0.1.0</p>
      <p class="generated-note">Field artwork is drawn in the game. No tracking or third-party game assets are loaded.</p>
    </footer>
  `;
}

function homePage(demo: boolean): string {
  const title = demo ? 'Try a 2v2 football match with sample players' : 'Play a private 2v2 football match';
  const summary = demo
    ? 'For friends who want to check the controls before starting a real local match.'
    : 'For friends who want a quick match without accounts or downloads.';
  return pageShell(demo ? '/demo' : '/', `
    <div class="launch-grid">
    <section class="game-intro" aria-labelledby="page-title">
      <div class="intro-copy">
        <p class="eyebrow">Four-minute arcade football</p>
        <h1 id="page-title">${title}</h1>
        <p class="lede">${summary}</p>
        <div class="intro-actions">
          ${demo ? '<a class="button primary" href="/" data-route>Start a real local match</a>' : '<a class="button primary" href="/demo" data-route>Try it with sample data</a>'}
          <span class="action-note">${demo ? 'Leaves this sample when you start for real.' : 'Starts a 28-second sample match.'}</span>
        </div>
        <ul class="plain-facts" aria-label="Game facts">
          <li>Free first release</li>
          <li>Four-minute local matches</li>
          <li>Keyboard and touch controls</li>
        </ul>
      </div>
    </section>
    <section class="game-stage" aria-labelledby="game-title" data-game-host>
      <h2 id="game-title">${demo ? 'Sample match' : 'Play now'}</h2>
      <p class="section-note">${demo ? 'The sample starts with a short clock and stores only demo state.' : 'Practice against the Tide bots or add a second local player.'}</p>
    </section>
    </div>
    <section class="how-it-works" aria-labelledby="how-title">
      <h2 id="how-title">How to play a local match</h2>
      <ol>
        <li><strong>Move.</strong> Take the Sun captain to the ball.</li>
        <li><strong>Pass or shoot.</strong> Keep the ball for a two-second combo.</li>
        <li><strong>Restart.</strong> Start another four-minute match with a new stadium rule.</li>
      </ol>
    </section>
    <section class="limits" aria-labelledby="limits-title">
      <h2 id="limits-title">What this release does not do</h2>
      <p>It has no public queue, teams, player packs, account, or payment. Remote room-code hosting needs the product-owned realtime service before it can be offered honestly.</p>
      <p>Game settings and an unfinished local match stay in this browser. Demo state uses a separate browser key and is discarded when you leave the demo.</p>
    </section>
  `);
}

function howPage(): string {
  return pageShell('/how-to-play', `
    <article class="text-page">
      <p class="eyebrow">Controls and match rules</p>
      <h1 id="page-title">Start, pass, shoot, and score</h1>
      <p class="lede">Codekick is a four-minute, local 2v2 football game for a shared keyboard or touch screen.</p>
      <section><h2>Practice controls</h2><ul><li>Move the Sun captain with W, A, S, and D.</li><li>Pass with F. Shoot with G.</li><li>On touch, hold the direction buttons, then tap Pass or Shoot.</li></ul></section>
      <section><h2>Two-player controls</h2><ul><li>Player one uses W, A, S, D, F, and G.</li><li>Player two uses the arrow keys, period, and slash.</li><li>Choose Local two players inside the match.</li></ul></section>
      <section><h2>Match rules</h2><p>Possession starts a visible two-second combo. Each restart rotates one symmetric stadium rule: crosswind, spring turf, or pinched goals.</p><p>Codekick targets 60 frames per second on a mid-range phone.</p></section>
    </article>
  `);
}

function privacyPage(): string {
  return pageShell('/privacy', `
    <article class="text-page">
      <p class="eyebrow">Privacy</p>
      <h1 id="page-title">Keep local match data in this browser</h1>
      <p class="lede">Codekick does not require an account and does not send match data to a game server in this release.</p>
      <section><h2>What is stored</h2><p>The game stores an unfinished local match and the settings you choose in this browser. The demo uses separate keys beginning with <code>demo:codekick:</code>.</p></section>
      <section><h2>What is sent</h2><p>The game has no analytics, ads, third-party fonts, or remote game assets. Loading this page requests only Codekick files from its own origin.</p></section>
      <section><h2>Delete local data</h2><p>Use Reset demo while in the sample. To remove local match and settings data, clear this site’s browser storage.</p></section>
      <section><h2>Contact</h2><p>For privacy questions, contact the Param Factory operator through the product listing.</p></section>
    </article>
  `);
}

function termsPage(): string {
  return pageShell('/terms', `
    <article class="text-page">
      <p class="eyebrow">Terms</p>
      <h1 id="page-title">Use Codekick for casual local matches</h1>
      <p class="lede">Codekick is a free browser game for personal, casual play.</p>
      <section><h2>Use of the game</h2><p>You may play and share the public game link. Do not attempt to disrupt the site or use it to harm others.</p></section>
      <section><h2>Availability</h2><p>The game is provided as available. A match may be lost if browser storage is cleared.</p></section>
      <section><h2>Changes</h2><p>The game may change as the first release is tested. There are no paid features in this release.</p></section>
    </article>
  `);
}

function notFoundPage(): string {
  return pageShell('/404', `
    <article class="text-page not-found">
      <p class="eyebrow">404</p>
      <h1 id="page-title">This Codekick page does not exist</h1>
      <p class="lede">Return to the game to start a local 2v2 match.</p>
      <a class="button primary" href="/" data-route>Return to the game</a>
    </article>
  `);
}

function renderRoute(moveFocus = false) {
  activeGame?.destroy();
  activeGame = undefined;
  const route = getRoute();
  writeMeta(route);
  const page = route === '/' ? homePage(false)
    : route === '/demo' ? homePage(true)
      : route === '/how-to-play' ? howPage()
        : route === '/privacy' ? privacyPage()
          : route === '/terms' ? termsPage()
            : notFoundPage();
  app.innerHTML = page;
  const pageTitle = app.querySelector<HTMLElement>('#page-title');
  pageTitle?.setAttribute('tabindex', '-1');
  routeAnnouncement = app.querySelector<HTMLElement>('.route-announcement') ?? undefined;
  if (routeAnnouncement) routeAnnouncement.textContent = document.title;
  app.querySelectorAll<HTMLAnchorElement>('a[data-route]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const destination = link.getAttribute('href');
      if (!destination || !destination.startsWith('/')) return;
      event.preventDefault();
      navigate(destination);
    });
  });
  const host = app.querySelector<HTMLElement>('[data-game-host]');
  if (host) activeGame = new GameView(host, route === '/demo');
  if (moveFocus) window.setTimeout(() => pageTitle?.focus(), 0);
}

class GameView {
  private host: HTMLElement;
  private readonly demo: boolean;
  private engine: GameEngine;
  private settings: Settings;
  private canvas!: HTMLCanvasElement;
  private context!: CanvasRenderingContext2D;
  private input: InputFrame = {};
  private animation = 0;
  private lastFrame = 0;
  private accumulator = 0;
  private saveElapsed = 0;
  private heldTouch = new Set<keyof InputFrame>();
  private phaseLast: Phase = 'kickoff';
  private waitingFor: 'passKey' | 'shotKey' | undefined;
  private readonly storeKey: string;
  private readonly settingsKey: string;
  private resizeObserver?: ResizeObserver;
  private visible = true;

  constructor(host: HTMLElement, demo: boolean) {
    this.host = host;
    this.demo = demo;
    this.storeKey = demo ? 'demo:codekick:match' : 'codekick:match';
    this.settingsKey = demo ? 'demo:codekick:settings' : 'codekick:settings';
    this.settings = this.loadSettings();
    this.engine = this.loadEngine();
    this.engine.assistMode = this.settings.assistMode;
    this.render();
    this.attachEvents();
    this.loop(performance.now());
  }

  private loadSettings(): Settings {
    try {
      const raw = window.localStorage.getItem(this.settingsKey);
      return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
    } catch { return { ...DEFAULT_SETTINGS }; }
  }

  private saveSettings() {
    try { window.localStorage.setItem(this.settingsKey, JSON.stringify(this.settings)); } catch { /* Storage can be disabled. */ }
  }

  private loadEngine(): GameEngine {
    let engine = new GameEngine('practice', 'Crosswind');
    try {
      const raw = window.localStorage.getItem(this.storeKey);
      if (raw) {
        const saved = JSON.parse(raw) as SerializedMatch;
        engine = new GameEngine(saved.mode, saved.rule);
        engine.restore(saved);
      }
      else if (this.demo) {
        engine.timeLeft = 28;
        engine.score = { sun: 2, tide: 1 };
      }
    } catch { /* A new match is safe if an old save is invalid. */ }
    return engine;
  }

  private saveEngine() {
    try { window.localStorage.setItem(this.storeKey, JSON.stringify(this.engine.serialize())); } catch { /* Storage is optional. */ }
  }

  private render() {
    this.host.insertAdjacentHTML('beforeend', `
      ${this.demo ? `<aside class="demo-banner" aria-label="Demo mode"><strong>Demo — sample data, nothing is saved</strong><span>Sample state stays separate from your local match.</span><button class="text-button" type="button" data-reset-demo>Reset demo</button><button class="text-button" type="button" data-start-real>Start for real</button></aside>` : ''}
      <div class="match-shell" data-match-shell>
        <div class="score-strip" aria-label="Match score and time">
          <span class="team sun-team">SUN <strong data-sun-score>0</strong></span>
          <span class="clock" data-clock>4:00</span>
          <span class="team tide-team"><strong data-tide-score>0</strong> TIDE</span>
        </div>
        <div class="canvas-wrap">
          <canvas class="pitch" width="960" height="540" tabindex="0" role="img" aria-label="Live Codekick football match. Use the keyboard controls shown below." aria-describedby="match-description"></canvas>
          <div class="field-callout" data-callout aria-live="polite">Kickoff</div>
        </div>
        <div class="match-toolbar">
          <label>Match mode <select data-mode aria-label="Match mode"><option value="practice">Practice against bots</option><option value="local">Local two players</option></select></label>
          <output class="rule-label" data-rule aria-live="polite">Rule: Crosswind</output>
          <button type="button" class="quiet-button" data-pause>Pause</button>
          <button type="button" class="quiet-button" data-settings>Settings</button>
        </div>
        <p id="match-description" class="sr-only" data-match-description>Sun captain position 330 by 210. The match is starting.</p>
        <div class="controls-panel">
          <p><strong>Sun captain:</strong> W A S D move · <kbd data-pass-key>F</kbd> pass · <kbd data-shot-key>G</kbd> shoot</p>
          <p><strong>Local player two:</strong> arrows move · <kbd>.</kbd> pass · <kbd>/</kbd> shoot</p>
          <div class="touch-controls" aria-label="Touch controls">
            <div class="d-pad">
              <button type="button" data-hold="up" aria-label="Move up">▲</button>
              <button type="button" data-hold="left" aria-label="Move left">◀</button>
              <button type="button" data-hold="down" aria-label="Move down">▼</button>
              <button type="button" data-hold="right" aria-label="Move right">▶</button>
            </div>
            <div class="touch-actions"><button type="button" data-tap="pass">Pass</button><button type="button" data-tap="shot">Shoot</button></div>
          </div>
        </div>
        <section class="end-panel" hidden data-end-panel aria-labelledby="end-title">
          <h3 id="end-title" data-end-title>Match finished</h3>
          <p data-end-summary></p>
          <button type="button" class="button primary" data-restart>Play another match</button>
          ${this.demo ? '<button type="button" class="button secondary" data-reset-demo>Reset demo</button>' : ''}
        </section>
        ${this.demo ? '<button type="button" class="demo-finish" data-finish-demo>Finish the sample match</button>' : ''}
      </div>
      <dialog class="settings-dialog" aria-labelledby="settings-title" data-settings-dialog>
        <form method="dialog">
          <div class="dialog-head"><h3 id="settings-title">Game settings</h3><button type="submit" class="quiet-button">Close</button></div>
          <p>Settings are saved only in this browser${this.demo ? ' using the demo storage key' : ''}.</p>
          <label class="check-row"><input type="checkbox" data-assist> Assist mode slows movement and shots</label>
          <label class="check-row"><input type="checkbox" data-reduced> Reduce field motion</label>
          <div class="rebind"><span>Pass key: <kbd data-dialog-pass>F</kbd></span><button type="button" class="quiet-button" data-rebind="passKey">Change pass key</button></div>
          <div class="rebind"><span>Shoot key: <kbd data-dialog-shot>G</kbd></span><button type="button" class="quiet-button" data-rebind="shotKey">Change shoot key</button></div>
          <p class="rebind-status" data-rebind-status aria-live="polite"></p>
        </form>
      </dialog>
    `);
    this.canvas = this.host.querySelector<HTMLCanvasElement>('canvas.pitch')!;
    const context = this.canvas.getContext('2d');
    if (!context) throw new Error('Codekick needs a browser with Canvas 2D support.');
    this.context = context;
    this.host.querySelector<HTMLSelectElement>('[data-mode]')!.value = this.engine.mode;
    this.host.querySelector<HTMLInputElement>('[data-assist]')!.checked = this.settings.assistMode;
    this.host.querySelector<HTMLInputElement>('[data-reduced]')!.checked = this.settings.reducedMotion;
    this.updateUi();
  }

  private attachEvents() {
    const onKeyDown = (event: KeyboardEvent) => {
      if (this.waitingFor) {
        if (event.key === 'Escape') {
          this.waitingFor = undefined;
          this.rebindStatus('Key change cancelled.');
          return;
        }
        if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
          this.settings[this.waitingFor] = event.key.toLowerCase();
          this.waitingFor = undefined;
          this.saveSettings();
          this.updateUi();
          this.rebindStatus('Key updated.');
        }
        event.preventDefault();
        return;
      }
      if ((event.target as HTMLElement)?.closest('dialog, select, button, input')) return;
      const key = event.key.toLowerCase();
      const mapped: Record<string, keyof InputFrame> = {
        w: 'up', a: 'left', s: 'down', d: 'right',
        [this.settings.passKey]: 'pass', [this.settings.shotKey]: 'shot',
        arrowup: 'p2up', arrowdown: 'p2down', arrowleft: 'p2left', arrowright: 'p2right',
        '.': 'p2pass', '/': 'p2shot'
      };
      const action = mapped[key];
      if (action) {
        this.input[action] = true;
        event.preventDefault();
      }
      if (key === 'escape') this.togglePause();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const mapped: Record<string, keyof InputFrame> = {
        w: 'up', a: 'left', s: 'down', d: 'right',
        [this.settings.passKey]: 'pass', [this.settings.shotKey]: 'shot',
        arrowup: 'p2up', arrowdown: 'p2down', arrowleft: 'p2left', arrowright: 'p2right',
        '.': 'p2pass', '/': 'p2shot'
      };
      const action = mapped[key];
      if (action) this.input[action] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    const onVisibility = () => {
      this.visible = !document.hidden;
      if (!this.visible) this.engine.pause();
    };
    document.addEventListener('visibilitychange', onVisibility);
    this.host.querySelector<HTMLButtonElement>('[data-pause]')!.addEventListener('click', () => this.togglePause());
    this.host.querySelector<HTMLButtonElement>('[data-settings]')!.addEventListener('click', () => {
      const dialog = this.host.querySelector<HTMLDialogElement>('[data-settings-dialog]')!;
      dialog.showModal();
    });
    this.host.querySelector<HTMLSelectElement>('[data-mode]')!.addEventListener('change', (event) => {
      const mode = (event.target as HTMLSelectElement).value as MatchMode;
      const rule = this.engine.rule;
      this.engine = new GameEngine(mode, rule);
      if (this.demo) { this.engine.timeLeft = 28; this.engine.score = { sun: 2, tide: 1 }; }
      this.engine.assistMode = this.settings.assistMode;
      this.saveEngine();
      this.updateUi();
    });
    this.host.querySelector<HTMLInputElement>('[data-assist]')!.addEventListener('change', (event) => {
      this.settings.assistMode = (event.target as HTMLInputElement).checked;
      this.engine.assistMode = this.settings.assistMode;
      this.saveSettings();
    });
    this.host.querySelector<HTMLInputElement>('[data-reduced]')!.addEventListener('change', (event) => {
      this.settings.reducedMotion = (event.target as HTMLInputElement).checked;
      this.saveSettings();
    });
    this.host.querySelectorAll<HTMLButtonElement>('[data-rebind]').forEach((button) => {
      button.addEventListener('click', () => {
        this.waitingFor = button.dataset.rebind as 'passKey' | 'shotKey';
        this.rebindStatus('Press one letter or number. Press Escape to cancel.');
      });
    });
    this.host.querySelector<HTMLButtonElement>('[data-restart]')!.addEventListener('click', () => {
      this.engine.reset();
      if (this.demo) this.engine.timeLeft = 28;
      this.saveEngine();
      this.updateUi();
      this.canvas.focus();
    });
    this.host.querySelectorAll<HTMLButtonElement>('[data-reset-demo]').forEach((button) => {
      button.addEventListener('click', () => this.resetDemo());
    });
    this.host.querySelector<HTMLButtonElement>('[data-start-real]')?.addEventListener('click', () => {
      try {
        window.localStorage.removeItem('demo:codekick:match');
        window.localStorage.removeItem('demo:codekick:settings');
      } catch { /* A navigation still leaves the demo screen. */ }
      navigate('/');
    });
    this.host.querySelector<HTMLButtonElement>('[data-finish-demo]')?.addEventListener('click', () => {
      this.engine.finish();
      this.saveEngine();
      this.updateUi();
    });
    this.host.querySelectorAll<HTMLButtonElement>('[data-hold]').forEach((button) => {
      const action = button.dataset.hold as keyof InputFrame;
      const down = (event: Event) => { event.preventDefault(); this.heldTouch.add(action); this.input[action] = true; };
      const up = (event: Event) => { event.preventDefault(); this.heldTouch.delete(action); this.input[action] = false; };
      button.addEventListener('pointerdown', down);
      button.addEventListener('pointerup', up);
      button.addEventListener('pointercancel', up);
      button.addEventListener('pointerleave', up);
    });
    this.host.querySelectorAll<HTMLButtonElement>('[data-tap]').forEach((button) => {
      button.addEventListener('click', () => {
        const action = button.dataset.tap as keyof InputFrame;
        this.input[action] = true;
        window.setTimeout(() => { this.input[action] = false; }, 90);
      });
    });
    this.resizeObserver = new ResizeObserver(() => this.draw());
    this.resizeObserver.observe(this.canvas.parentElement!);
    this.cleanupListeners = () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }

  private cleanupListeners: () => void = () => undefined;

  private resetDemo() {
    if (!this.demo) return;
    try {
      window.localStorage.removeItem('demo:codekick:match');
      window.localStorage.removeItem('demo:codekick:settings');
    } catch { /* The new in-memory state is still clean. */ }
    this.settings = { ...DEFAULT_SETTINGS };
    this.engine = new GameEngine('practice', 'Crosswind');
    this.engine.timeLeft = 28;
    this.engine.score = { sun: 2, tide: 1 };
    this.engine.assistMode = this.settings.assistMode;
    this.updateUi();
  }

  private rebindStatus(message: string) {
    const target = this.host.querySelector<HTMLElement>('[data-rebind-status]');
    if (target) target.textContent = message;
  }

  private togglePause() {
    if (this.engine.phase === 'paused') this.engine.resume();
    else this.engine.pause();
    this.updateUi();
  }

  private loop = (now: number) => {
    const elapsed = Math.min((now - this.lastFrame) / 1000, 0.1);
    this.lastFrame = now;
    if (this.visible) {
      this.accumulator += elapsed;
      while (this.accumulator >= 1 / 60) {
        this.engine.advance(1 / 60, this.input);
        this.accumulator -= 1 / 60;
        this.saveElapsed += 1 / 60;
      }
      if (this.saveElapsed >= 2) { this.saveEngine(); this.saveElapsed = 0; }
    }
    this.updateUi();
    this.draw();
    this.animation = window.requestAnimationFrame(this.loop);
  };

  private updateUi() {
    const query = <T extends Element>(selector: string) => this.host.querySelector<T>(selector);
    query<HTMLElement>('[data-sun-score]')!.textContent = String(this.engine.score.sun);
    query<HTMLElement>('[data-tide-score]')!.textContent = String(this.engine.score.tide);
    query<HTMLElement>('[data-clock]')!.textContent = formatClock(this.engine.timeLeft);
    query<HTMLOutputElement>('[data-rule]')!.textContent = `Rule: ${this.engine.rule}`;
    query<HTMLElement>('[data-pass-key]')!.textContent = this.settings.passKey.toUpperCase();
    query<HTMLElement>('[data-shot-key]')!.textContent = this.settings.shotKey.toUpperCase();
    query<HTMLElement>('[data-dialog-pass]')!.textContent = this.settings.passKey.toUpperCase();
    query<HTMLElement>('[data-dialog-shot]')!.textContent = this.settings.shotKey.toUpperCase();
    const callout = query<HTMLElement>('[data-callout]')!;
    const phaseText: Record<Phase, string> = {
      kickoff: 'Kickoff', playing: this.engine.ball.owner ? `Combo ${this.engine.comboRemaining.toFixed(1)}s` : 'Chase the ball',
      goal: 'Goal — reset', paused: 'Paused', ended: 'Final whistle'
    };
    callout.textContent = phaseText[this.engine.phase];
    const pause = query<HTMLButtonElement>('[data-pause]')!;
    pause.textContent = this.engine.phase === 'paused' ? 'Resume' : 'Pause';
    const description = query<HTMLElement>('[data-match-description]')!;
    const captain = this.engine.players.find((player) => player.id === this.engine.selectedA)!;
    description.textContent = `Sun captain position ${Math.round(captain.x)} by ${Math.round(captain.y)}. ${phaseText[this.engine.phase]}.`;
    const endPanel = query<HTMLElement>('[data-end-panel]')!;
    const endTitle = query<HTMLElement>('[data-end-title]')!;
    const endSummary = query<HTMLElement>('[data-end-summary]')!;
    endPanel.hidden = this.engine.phase !== 'ended';
    if (this.engine.phase === 'ended') {
      const winner = this.engine.score.sun === this.engine.score.tide ? 'Draw match' : this.engine.score.sun > this.engine.score.tide ? 'Sun wins' : 'Tide wins';
      endTitle.textContent = winner;
      endSummary.textContent = `Final score: Sun ${this.engine.score.sun}, Tide ${this.engine.score.tide}. The next match uses ${this.nextRule()}.`;
      if (this.phaseLast !== 'ended') endPanel.querySelector<HTMLButtonElement>('button')?.focus();
    }
    this.phaseLast = this.engine.phase;
  }

  private nextRule(): Rule {
    return this.engine.rule === 'Crosswind' ? 'Spring turf' : this.engine.rule === 'Spring turf' ? 'Pinched goals' : 'Crosswind';
  }

  private draw() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    const ctx = this.context;
    ctx.setTransform(width / FIELD.width, 0, 0, height / FIELD.height, 0, 0);
    ctx.clearRect(0, 0, FIELD.width, FIELD.height);
    this.drawPitch(ctx);
    for (const player of this.engine.players) this.drawPlayer(ctx, player);
    this.drawBall(ctx);
  }

  private drawPitch(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#14765e';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    for (let x = 0; x < FIELD.width; x += 96) {
      ctx.fillStyle = (x / 96) % 2 === 0 ? '#1b8b6d' : '#157d63';
      ctx.fillRect(x, 0, 96, FIELD.height);
    }
    ctx.fillStyle = '#f4e9c3';
    ctx.fillRect(0, 0, FIELD.width, 9);
    ctx.fillRect(0, FIELD.height - 9, FIELD.width, 9);
    ctx.strokeStyle = '#e8f2d7';
    ctx.lineWidth = 5;
    ctx.strokeRect(30, 30, FIELD.width - 60, FIELD.height - 60);
    ctx.beginPath(); ctx.moveTo(FIELD.width / 2, 30); ctx.lineTo(FIELD.width / 2, FIELD.height - 30); ctx.stroke();
    ctx.beginPath(); ctx.arc(FIELD.width / 2, FIELD.height / 2, 72, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(FIELD.width / 2, FIELD.height / 2, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeRect(30, 145, 125, 250);
    ctx.strokeRect(FIELD.width - 155, 145, 125, 250);
    this.drawGoal(ctx, 5, FIELD.height / 2 - this.engine.goalHalfHeight, -1);
    this.drawGoal(ctx, FIELD.width - 5, FIELD.height / 2 - this.engine.goalHalfHeight, 1);
    if (this.engine.rule === 'Crosswind' && !this.settings.reducedMotion) {
      ctx.strokeStyle = 'rgba(244, 233, 195, .52)'; ctx.lineWidth = 3;
      for (let y = 110; y < 480; y += 105) {
        const curve = Math.sin((performance.now() / 1000 + y) * .8) * 22;
        ctx.beginPath(); ctx.moveTo(260, y); ctx.quadraticCurveTo(480, y + curve, 700, y); ctx.stroke();
      }
    }
    if (this.engine.rule === 'Spring turf') {
      ctx.fillStyle = 'rgba(244, 233, 195, .68)';
      for (let x = 180; x < 800; x += 140) for (let y = 110; y < 450; y += 120) {
        ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  private drawGoal(ctx: CanvasRenderingContext2D, x: number, y: number, direction: number) {
    ctx.strokeStyle = '#f4e9c3';
    ctx.lineWidth = 6;
    ctx.strokeRect(x - (direction === -1 ? 28 : 0), y, 28, this.engine.goalHalfHeight * 2);
    ctx.strokeStyle = 'rgba(244, 233, 195, .28)';
    ctx.lineWidth = 2;
    for (let row = 1; row < 5; row += 1) {
      ctx.beginPath(); ctx.moveTo(x - (direction === -1 ? 28 : 0), y + row * this.engine.goalHalfHeight * .4); ctx.lineTo(x + (direction === -1 ? 0 : 28), y + row * this.engine.goalHalfHeight * .4); ctx.stroke();
    }
  }

  private drawPlayer(ctx: CanvasRenderingContext2D, player: { id: string; team: 'sun' | 'tide'; x: number; y: number; selected: boolean }) {
    const fill = player.team === 'sun' ? '#f05a37' : '#24395b';
    const trim = player.team === 'sun' ? '#f7c95e' : '#79d4df';
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.fillStyle = '#0d2a28';
    ctx.beginPath(); ctx.ellipse(3, 27, 24, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = fill;
    ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = trim;
    ctx.fillRect(-19, -4, 38, 8);
    ctx.fillStyle = '#f4e9c3';
    ctx.beginPath(); ctx.arc(-7, -5, 3, 0, Math.PI * 2); ctx.arc(7, -5, 3, 0, Math.PI * 2); ctx.fill();
    if (player.id === this.engine.selectedA || (this.engine.mode === 'local' && player.id === this.engine.selectedB)) {
      ctx.strokeStyle = '#f7c95e'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }

  private drawBall(ctx: CanvasRenderingContext2D) {
    const ball = this.engine.ball;
    ctx.fillStyle = '#f4e9c3';
    ctx.beginPath(); ctx.arc(ball.x, ball.y, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#102421';
    ctx.beginPath(); ctx.arc(ball.x, ball.y, 3.5, 0, Math.PI * 2); ctx.fill();
  }

  destroy() {
    window.cancelAnimationFrame(this.animation);
    this.saveEngine();
    this.resizeObserver?.disconnect();
    this.cleanupListeners();
  }
}

window.addEventListener('popstate', () => renderRoute(true));
renderRoute(false);
