import './styles.css';
import { FIELD, GameEngine, formatClock, type InputFrame, type MatchMode, type Phase, type Rule, type SerializedMatch } from './engine';

type RoomAccess = { code: string; playerToken: string; slot: string; expiresAt: number };
type RoomSnapshot = {
  type: 'state';
  roomCode: string;
  state: SerializedMatch;
  connectedPlayers: number;
  claimedPlayers: number;
  tick: number;
};

const REALTIME_ORIGIN = import.meta.env.VITE_REALTIME_ORIGIN
  || (import.meta.env.DEV ? 'http://127.0.0.1:8787' : 'https://codekick-realtime.sociobot.in');

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

const readSettings = (raw: string | null): Settings => {
  if (!raw) return { ...DEFAULT_SETTINGS };
  const value = JSON.parse(raw) as Partial<Settings>;
  return {
    reducedMotion: typeof value.reducedMotion === 'boolean' ? value.reducedMotion : DEFAULT_SETTINGS.reducedMotion,
    assistMode: typeof value.assistMode === 'boolean' ? value.assistMode : DEFAULT_SETTINGS.assistMode,
    passKey: typeof value.passKey === 'string' && /^[a-z0-9]$/i.test(value.passKey) ? value.passKey.toLowerCase() : DEFAULT_SETTINGS.passKey,
    shotKey: typeof value.shotKey === 'string' && /^[a-z0-9]$/i.test(value.shotKey) ? value.shotKey.toLowerCase() : DEFAULT_SETTINGS.shotKey
  };
};

const isSavedMatch = (value: unknown): value is SerializedMatch => {
  if (!value || typeof value !== 'object') return false;
  const match = value as Partial<SerializedMatch>;
  const number = (candidate: unknown) => typeof candidate === 'number' && Number.isFinite(candidate);
  const validPhase = ['waiting', 'kickoff', 'playing', 'goal', 'ended', 'paused'].includes(String(match.phase));
  const validRule = ['Crosswind', 'Spring turf', 'Pinched goals'].includes(String(match.rule));
  const validMode = match.mode === 'practice' || match.mode === 'local';
  return Array.isArray(match.players) && match.players.length === 4
    && match.players.every((player) => player && typeof player.id === 'string' && number(player.x) && number(player.y))
    && Boolean(match.ball) && number(match.ball?.x) && number(match.ball?.y)
    && Boolean(match.score) && number(match.score?.sun) && number(match.score?.tide)
    && number(match.timeLeft) && number(match.phaseTimer) && number(match.comboUntil)
    && validPhase && validRule && validMode
    && typeof match.selectedA === 'string' && typeof match.selectedB === 'string';
};

const appElement = document.querySelector<HTMLElement>('#app');
if (!appElement) throw new Error('Codekick could not start because the app root is missing.');
const app: HTMLElement = appElement;

let activeGame: GameView | undefined;
let routeAnnouncement: HTMLElement | undefined;

const routeInfo: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'Codekick — Play private 2v2 football',
    description: 'Create a private football room for two to four friends. Play a four-minute match on keyboard or touch.'
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
      <p>Private 2v2 football matches for two to four friends.</p>
      <nav aria-label="Footer navigation"><a href="/privacy" data-route>Privacy</a><a href="/terms" data-route>Terms</a></nav>
      <p>Built by Param Factory · build 0.2.0</p>
      <p class="generated-note">Field artwork is drawn in the game. No tracking or third-party game assets are loaded.</p>
    </footer>
  `;
}

function homePage(demo: boolean): string {
  const title = demo ? 'Try a 2v2 football match with sample players' : 'Play a private 2v2 football match';
  const summary = demo
    ? 'For friends who want to check the controls before creating or joining a room.'
    : 'For two to four friends who want a quick match without accounts or downloads.';
  return pageShell(demo ? '/demo' : '/', `
    <div class="launch-grid">
    <section class="game-intro" aria-labelledby="page-title">
      <div class="intro-copy">
        <p class="eyebrow">Four-minute arcade football</p>
        <h1 id="page-title">${title}</h1>
        <p class="lede">${summary}</p>
        <div class="intro-actions">
          ${demo ? '<a class="button primary" href="/" data-route>Start for real</a>' : '<a class="button primary" href="/demo" data-route>Try it with sample data</a>'}
          <span class="action-note">${demo ? 'Leaves this sample and opens the room controls.' : 'Starts a 28-second sample match.'}</span>
        </div>
        <ul class="plain-facts" aria-label="Game facts">
          <li>Free to play</li>
          <li>Private room codes</li>
          <li>Keyboard and touch controls</li>
        </ul>
      </div>
    </section>
    <section class="game-stage" aria-labelledby="game-title" data-game-host>
      <h2 id="game-title">${demo ? 'Sample match' : 'Play now'}</h2>
      <p class="section-note">${demo ? 'The sample starts with a short clock and stores only demo state.' : 'Create a room, share its code, then play when a friend joins.'}</p>
    </section>
    </div>
    <section class="how-it-works" aria-labelledby="how-title">
      <h2 id="how-title">How to play a private match</h2>
      <ol>
        <li><strong>Create.</strong> Make a room and send the six-character code.</li>
        <li><strong>Play.</strong> Move, pass, and shoot for four minutes.</li>
        <li><strong>Rematch.</strong> Reset the score and use the next stadium rule.</li>
      </ol>
    </section>
    <section class="limits" aria-labelledby="limits-title">
      <h2 id="limits-title">Privacy and limits</h2>
      <p>Codekick has no public queue, account, payment, league, or licensed team.</p>
      <p>Room play sends controls to the Codekick room service. Demo play stays separate and sends no match data.</p>
    </section>
  `);
}

function howPage(): string {
  return pageShell('/how-to-play', `
    <article class="text-page">
      <p class="eyebrow">Controls and match rules</p>
      <h1 id="page-title">Start, pass, shoot, and score</h1>
      <p class="lede">Codekick is a four-minute 2v2 football game for two to four browsers or one shared screen.</p>
      <section><h2>Practice controls</h2><ul><li>Move the Sun captain with W, A, S, and D.</li><li>Pass with F. Shoot with G.</li><li>On touch, hold the direction buttons, then tap Pass or Shoot.</li></ul></section>
      <section><h2>Room controls</h2><ul><li>Create a room and share its six-character code.</li><li>Each friend uses W, A, S, D, F, and G on a keyboard.</li><li>Each phone shows move, pass, and shoot buttons for its player.</li></ul></section>
      <section><h2>Shared-screen controls</h2><ul><li>Player one uses W, A, S, D, F, and G.</li><li>Player two uses the arrow keys, period, and slash.</li><li>Both players get separate touch controls on a phone.</li></ul></section>
      <section><h2>Match rules</h2><p>Possession starts a visible two-second combo. Each restart rotates one symmetric stadium rule: crosswind, spring turf, or pinched goals.</p><p>Codekick targets 60 frames per second on a mid-range phone.</p></section>
    </article>
  `);
}

function privacyPage(): string {
  return pageShell('/privacy', `
    <article class="text-page">
      <p class="eyebrow">Privacy</p>
      <h1 id="page-title">Control your Codekick match data</h1>
      <p class="lede">Codekick needs no account and does not use analytics or advertising.</p>
      <section><h2>What is stored</h2><p>The browser stores settings, an unfinished local match, and active room access. Demo keys begin with <code>demo:codekick:</code>.</p><p>The Codekick room service stores room state in SQLite for six hours so players can reconnect.</p></section>
      <section><h2>What is sent</h2><p>Creating or joining a room sends its code, player controls, and match state to the Codekick room service.</p><p>The game loads no remote fonts, third-party game assets, analytics, or ads.</p></section>
      <section><h2>Delete local data</h2><p>Use Reset demo while in the sample. Clear this site’s browser storage to remove settings, matches, and room access.</p></section>
      <section><h2>Contact</h2><p>Email <a class="touch-link" href="mailto:privacy@sociobot.in?subject=Codekick%20privacy%20request">privacy@sociobot.in</a> to ask about Codekick data.</p></section>
    </article>
  `);
}

function termsPage(): string {
  return pageShell('/terms', `
    <article class="text-page">
      <p class="eyebrow">Terms</p>
      <h1 id="page-title">Use Codekick for casual private matches</h1>
      <p class="lede">Codekick is a free browser game for personal, casual play.</p>
      <section><h2>Use of the game</h2><p>You may play and share the public game link. Do not attempt to disrupt the site or use it to harm others.</p></section>
      <section><h2>Availability</h2><p>The game is provided as available. Rooms expire six hours after their last player action.</p></section>
      <section><h2>Changes</h2><p>The game may change as the first release is tested. There are no paid features in this release.</p></section>
    </article>
  `);
}

function notFoundPage(): string {
  return pageShell('/404', `
    <article class="text-page not-found">
      <p class="eyebrow">404</p>
      <h1 id="page-title">This Codekick page does not exist</h1>
      <p class="lede">Return to the game to create or join a private match.</p>
      <a class="button primary" href="/" data-route>Return to the game</a>
    </article>
  `);
}

function renderRoute(moveFocus = false) {
  const route = getRoute();
  activeGame?.destroy(route !== '/demo');
  activeGame = undefined;
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
  private online?: {
    access: RoomAccess;
    socket?: WebSocket;
    retry?: number;
    previousPlayers?: SerializedMatch['players'];
    previousBall?: SerializedMatch['ball'];
    snapshotAt: number;
    lastInputAt: number;
  };
  private destroyed = false;

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
      return readSettings(window.localStorage.getItem(this.settingsKey));
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
        const saved = JSON.parse(raw) as unknown;
        if (!isSavedMatch(saved)) throw new Error('Invalid saved match');
        engine = new GameEngine(saved.mode, saved.rule);
        engine.restore(saved);
        if (engine.phase === 'paused') engine.resume();
      }
      else if (this.demo) {
        this.seedDemo(engine);
      }
    } catch { /* A new match is safe if an old save is invalid. */ }
    return engine;
  }

  private saveEngine() {
    if (this.online) return;
    try { window.localStorage.setItem(this.storeKey, JSON.stringify(this.engine.serialize())); } catch { /* Storage is optional. */ }
  }

  private seedDemo(engine: GameEngine) {
    engine.timeLeft = 28;
    engine.score = { sun: 2, tide: 1 };
    engine.phase = 'playing';
    engine.phaseTimer = 0;
    const owner = engine.mode === 'local' ? engine.players.find((player) => player.id === 'tide-1') : engine.players.find((player) => player.id === 'sun-1');
    if (!owner) return;
    owner.x = owner.team === 'sun' ? 830 : 130;
    owner.y = FIELD.height / 2;
    engine.ball.owner = owner.id;
    engine.ball.x = owner.x + (owner.team === 'sun' ? 34 : -34);
    engine.ball.y = owner.y;
    engine.comboUntil = 2;
  }

  private render() {
    this.host.insertAdjacentHTML('beforeend', `
      ${this.demo ? `<section class="demo-banner" aria-label="Demo mode"><strong>Demo — sample data, nothing is saved</strong><span>Sample state stays separate from your local match.</span><button class="text-button" type="button" data-reset-demo>Reset demo</button><button class="text-button" type="button" data-start-real>Start for real</button></section>` : ''}
      ${this.demo ? '' : `<section class="room-panel" aria-labelledby="room-title">
        <div><h3 id="room-title">Play with friends by room code</h3><p>Create a room or enter the code a friend sent.</p></div>
        <div class="room-actions">
          <button class="button primary" type="button" data-create-room>Create a room</button>
          <span class="room-or" aria-hidden="true">or</span>
          <label for="room-code">Room code</label>
          <input id="room-code" data-room-input inputmode="text" autocomplete="off" maxlength="6" pattern="[A-Za-z0-9]{6}">
          <button class="button secondary" type="button" data-join-room>Join room</button>
        </div>
        <div class="room-details" data-room-details hidden>
          <span>Room <output data-room-code></output></span>
          <button class="quiet-button" type="button" data-copy-room>Copy invite link</button>
        </div>
        <p class="room-status" data-room-status aria-live="polite">No room is connected.</p>
      </section>`}
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
          <label>Match mode <select data-mode aria-label="Match mode"><option value="practice">Practice against bots</option><option value="local">Local two players</option><option value="online">Online room</option></select></label>
          <output class="rule-label" data-rule aria-live="polite">Rule: Crosswind</output>
          <button type="button" class="quiet-button" data-pause>Pause</button>
          <button type="button" class="quiet-button" data-settings>Settings</button>
        </div>
        <p id="match-description" class="sr-only" data-match-description>Sun captain position 330 by 210. The match is starting.</p>
        <div class="controls-panel">
          <p data-player-one-help><strong>Sun captain:</strong> W A S D move · <kbd data-pass-key>F</kbd> pass · <kbd data-shot-key>G</kbd> shoot</p>
          <p data-player-two-help><strong>Local player two:</strong> arrows move · <kbd>.</kbd> pass · <kbd>/</kbd> shoot</p>
          <div class="touch-controls" aria-label="Touch controls">
            <div class="touch-player" data-touch-player="one" aria-label="Player one touch controls">
              <span>Player one</span>
              <div class="touch-row"><div class="d-pad">
                <button type="button" data-hold="up" aria-label="Player one move up">▲</button>
                <button type="button" data-hold="left" aria-label="Player one move left">◀</button>
                <button type="button" data-hold="down" aria-label="Player one move down">▼</button>
                <button type="button" data-hold="right" aria-label="Player one move right">▶</button>
              </div>
              <div class="touch-actions"><button type="button" data-tap="pass">Pass</button><button type="button" data-tap="shot">Shoot</button></div></div>
            </div>
            <div class="touch-player" data-touch-player="two" aria-label="Player two touch controls">
              <span>Player two</span>
              <div class="touch-row"><div class="d-pad">
                <button type="button" data-hold="p2up" aria-label="Player two move up">▲</button>
                <button type="button" data-hold="p2left" aria-label="Player two move left">◀</button>
                <button type="button" data-hold="p2down" aria-label="Player two move down">▼</button>
                <button type="button" data-hold="p2right" aria-label="Player two move right">▶</button>
              </div>
              <div class="touch-actions"><button type="button" data-tap="p2pass">Pass</button><button type="button" data-tap="p2shot">Shoot</button></div></div>
            </div>
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
    if (!this.demo) this.prepareRoomEntry();
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
      if (action && !['pass', 'shot', 'p2pass', 'p2shot'].includes(action)) this.input[action] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    const onVisibility = () => {
      this.visible = !document.hidden;
      if (!this.visible) this.engine.pause();
    };
    document.addEventListener('visibilitychange', onVisibility);
    this.host.querySelector<HTMLButtonElement>('[data-pause]')!.addEventListener('click', () => this.togglePause());
    this.host.querySelector<HTMLButtonElement>('[data-create-room]')?.addEventListener('click', () => this.createRoom());
    this.host.querySelector<HTMLButtonElement>('[data-join-room]')?.addEventListener('click', () => this.joinRoom());
    this.host.querySelector<HTMLInputElement>('[data-room-input]')?.addEventListener('input', (event) => {
      const input = event.currentTarget as HTMLInputElement;
      input.value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    });
    this.host.querySelector<HTMLInputElement>('[data-room-input]')?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') { event.preventDefault(); this.joinRoom(); }
    });
    this.host.querySelector<HTMLButtonElement>('[data-copy-room]')?.addEventListener('click', () => this.copyRoomLink());
    this.host.querySelector<HTMLButtonElement>('[data-settings]')!.addEventListener('click', () => {
      const dialog = this.host.querySelector<HTMLDialogElement>('[data-settings-dialog]')!;
      dialog.showModal();
    });
    this.host.querySelector<HTMLSelectElement>('[data-mode]')!.addEventListener('change', (event) => {
      if (this.online) return;
      const mode = (event.target as HTMLSelectElement).value as MatchMode;
      const rule = this.engine.rule;
      this.engine = new GameEngine(mode, rule);
      if (this.demo) this.seedDemo(this.engine);
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
      if (this.online) {
        this.sendRoomMessage({ type: 'rematch' });
        this.canvas.focus();
        return;
      }
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

  private prepareRoomEntry() {
    const code = new URLSearchParams(window.location.search).get('room')?.toUpperCase() ?? '';
    const input = this.host.querySelector<HTMLInputElement>('[data-room-input]');
    if (/^[A-Z0-9]{6}$/.test(code) && input) input.value = code;
    if (!code) return;
    try {
      const saved = window.localStorage.getItem(`codekick:room:${code}`);
      if (!saved) {
        this.setRoomStatus(`Room ${code} is ready to join. Select Join room.`);
        input?.focus();
        return;
      }
      const access = JSON.parse(saved) as RoomAccess;
      if (access.code === code && access.playerToken && access.slot) this.connectRoom(access);
    } catch {
      this.setRoomStatus('The saved room access could not be read. Enter the code again.');
    }
  }

  private setRoomBusy(busy: boolean) {
    this.host.querySelectorAll<HTMLButtonElement>('[data-create-room], [data-join-room]').forEach((button) => { button.disabled = busy; });
  }

  private setRoomStatus(message: string) {
    const status = this.host.querySelector<HTMLElement>('[data-room-status]');
    if (status) status.textContent = message;
  }

  private async requestRoom(path: string): Promise<RoomAccess | undefined> {
    this.setRoomBusy(true);
    this.setRoomStatus('Connecting to the Codekick room service…');
    try {
      const response = await fetch(`${REALTIME_ORIGIN}${path}`, { method: 'POST' });
      const body = await response.json() as RoomAccess & { error?: string };
      if (!response.ok) {
        this.setRoomStatus(body.error ?? 'The room service could not complete that request. Try again.');
        return;
      }
      return body;
    } catch {
      this.setRoomStatus('The room service could not be reached. Check your connection and try again.');
      return;
    } finally {
      this.setRoomBusy(false);
    }
  }

  private async createRoom() {
    const access = await this.requestRoom('/rooms');
    if (access) this.connectRoom(access);
  }

  private async joinRoom() {
    const input = this.host.querySelector<HTMLInputElement>('[data-room-input]');
    const code = input?.value.trim().toUpperCase() ?? '';
    if (!/^[A-Z0-9]{6}$/.test(code)) {
      input?.setAttribute('aria-invalid', 'true');
      this.setRoomStatus('Enter the six-character room code.');
      input?.focus();
      return;
    }
    input?.removeAttribute('aria-invalid');
    const access = await this.requestRoom(`/rooms/${encodeURIComponent(code)}/join`);
    if (access) this.connectRoom(access);
  }

  private connectRoom(access: RoomAccess) {
    if (this.destroyed) return;
    if (this.online?.retry) window.clearTimeout(this.online.retry);
    this.online?.socket?.close();
    const previous = this.online?.previousPlayers;
    this.online = { access, snapshotAt: performance.now(), lastInputAt: 0, previousPlayers: previous };
    try { window.localStorage.setItem(`codekick:room:${access.code}`, JSON.stringify(access)); } catch { /* Reconnection still works during this page visit. */ }
    const url = new URL(window.location.href);
    url.pathname = '/';
    url.search = `?room=${encodeURIComponent(access.code)}`;
    window.history.replaceState({}, '', `${url.pathname}${url.search}`);
    const roomCode = this.host.querySelector<HTMLOutputElement>('[data-room-code]');
    const details = this.host.querySelector<HTMLElement>('[data-room-details]');
    const input = this.host.querySelector<HTMLInputElement>('[data-room-input]');
    if (roomCode) roomCode.textContent = access.code;
    if (details) details.hidden = false;
    if (input) input.value = access.code;
    const mode = this.host.querySelector<HTMLSelectElement>('[data-mode]');
    if (mode) { mode.value = 'online'; mode.disabled = true; }
    this.host.querySelector<HTMLElement>('[data-match-shell]')?.setAttribute('data-online', 'true');
    const help = this.host.querySelector<HTMLElement>('[data-player-one-help]');
    if (help) help.innerHTML = `<strong>Your player:</strong> W A S D move · <kbd data-pass-key>${this.settings.passKey.toUpperCase()}</kbd> pass · <kbd data-shot-key>${this.settings.shotKey.toUpperCase()}</kbd> shoot`;
    this.setRoomStatus(`Room ${access.code} connected. Waiting for another player.`);
    this.openRoomSocket();
  }

  private openRoomSocket() {
    if (!this.online || this.destroyed) return;
    const { access } = this.online;
    const socketOrigin = REALTIME_ORIGIN.replace(/^http/, 'ws');
    const socket = new WebSocket(`${socketOrigin}/rooms/${encodeURIComponent(access.code)}/connect?token=${encodeURIComponent(access.playerToken)}`);
    this.online.socket = socket;
    socket.addEventListener('message', (event) => {
      let snapshot: RoomSnapshot;
      try { snapshot = JSON.parse(String(event.data)) as RoomSnapshot; } catch { return; }
      if (snapshot.type !== 'state' || snapshot.roomCode !== access.code || !snapshot.state?.players) return;
      const previousPlayers = this.engine.players.map((player) => ({ ...player }));
      const previousBall = { ...this.engine.ball };
      const nextEngine = new GameEngine('local', snapshot.state.rule);
      nextEngine.restore(snapshot.state);
      this.engine = nextEngine;
      if (this.online) {
        this.online.previousPlayers = previousPlayers;
        this.online.previousBall = previousBall;
        this.online.snapshotAt = performance.now();
      }
      const role = this.roomRole(access.slot);
      const waiting = snapshot.state.phase === 'waiting' ? ' Waiting for another player.' : '';
      this.setRoomStatus(`Room ${access.code}. You control ${role}. ${snapshot.connectedPlayers} of ${snapshot.claimedPlayers} players connected.${waiting}`);
      this.updateUi();
    });
    socket.addEventListener('close', () => {
      if (!this.online || this.destroyed || this.online.socket !== socket) return;
      this.setRoomStatus(`Room ${access.code} lost its connection. Reconnecting…`);
      this.online.retry = window.setTimeout(() => this.openRoomSocket(), 1200);
    });
  }

  private roomRole(slot: string) {
    const roles: Record<string, string> = {
      'sun-1': 'the Sun captain', 'tide-1': 'the Tide captain',
      'sun-2': 'the Sun teammate', 'tide-2': 'the Tide teammate'
    };
    return roles[slot] ?? 'a player';
  }

  private sendRoomMessage(message: Record<string, boolean | string>) {
    const socket = this.online?.socket;
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
  }

  private async copyRoomLink() {
    if (!this.online) return;
    const link = `${window.location.origin}/?room=${encodeURIComponent(this.online.access.code)}`;
    try {
      await navigator.clipboard.writeText(link);
      this.setRoomStatus(`Invite link copied for room ${this.online.access.code}.`);
    } catch {
      this.setRoomStatus(`Share this link: ${link}`);
    }
  }

  private resetDemo() {
    if (!this.demo) return;
    try {
      window.localStorage.removeItem('demo:codekick:match');
      window.localStorage.removeItem('demo:codekick:settings');
    } catch { /* The new in-memory state is still clean. */ }
    this.settings = { ...DEFAULT_SETTINGS };
    this.engine = new GameEngine('practice', 'Crosswind');
    this.seedDemo(this.engine);
    this.engine.assistMode = this.settings.assistMode;
    const mode = this.host.querySelector<HTMLSelectElement>('[data-mode]');
    if (mode) mode.value = 'practice';
    this.updateUi();
  }

  private rebindStatus(message: string) {
    const target = this.host.querySelector<HTMLElement>('[data-rebind-status]');
    if (target) target.textContent = message;
  }

  private togglePause() {
    if (this.online) {
      this.sendRoomMessage({ type: 'pause' });
      return;
    }
    if (this.engine.phase === 'paused') this.engine.resume();
    else this.engine.pause();
    this.updateUi();
  }

  private loop = (now: number) => {
    const elapsed = Math.min((now - this.lastFrame) / 1000, 0.1);
    this.lastFrame = now;
    if (this.visible) {
      if (this.online) {
        if (now - this.online.lastInputAt >= 50) {
          this.sendRoomMessage({
            type: 'input', up: Boolean(this.input.up), down: Boolean(this.input.down),
            left: Boolean(this.input.left), right: Boolean(this.input.right),
            pass: Boolean(this.input.pass), shot: Boolean(this.input.shot)
          });
          this.online.lastInputAt = now;
          this.input.pass = false;
          this.input.shot = false;
        }
      } else {
        this.accumulator += elapsed;
        while (this.accumulator >= 1 / 60) {
          this.engine.advance(1 / 60, this.input);
          this.input.pass = false;
          this.input.shot = false;
          this.input.p2pass = false;
          this.input.p2shot = false;
          this.accumulator -= 1 / 60;
          this.saveElapsed += 1 / 60;
        }
        if (this.saveElapsed >= 2) { this.saveEngine(); this.saveElapsed = 0; }
      }
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
      waiting: 'Waiting for a friend',
      kickoff: 'Kickoff', playing: this.engine.ball.owner && this.engine.comboRemaining > 0
        ? `Combo ${this.engine.comboRemaining.toFixed(1)}s`
        : this.engine.ball.owner ? 'Possession' : 'Chase the ball',
      goal: 'Goal — reset', paused: 'Paused', ended: 'Final whistle'
    };
    callout.textContent = phaseText[this.engine.phase];
    const pause = query<HTMLButtonElement>('[data-pause]')!;
    pause.textContent = this.engine.phase === 'paused' ? 'Resume' : 'Pause';
    pause.disabled = this.engine.phase === 'waiting' || this.engine.phase === 'ended';
    const playMode = this.online ? 'online' : this.engine.mode;
    query<HTMLElement>('[data-match-shell]')!.dataset.playMode = playMode;
    const playerTwoHelp = query<HTMLElement>('[data-player-two-help]');
    if (playerTwoHelp) playerTwoHelp.hidden = playMode !== 'local';
    const description = query<HTMLElement>('[data-match-description]')!;
    const positions = this.engine.players.map((player) => `${player.id} position ${Math.round(player.x)} by ${Math.round(player.y)}`).join('. ');
    const owner = this.engine.ball.owner ? `Ball held by ${this.engine.ball.owner}` : 'Ball is free';
    description.textContent = `${positions}. ${owner}. ${phaseText[this.engine.phase]}.`;
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
    const interpolation = this.online ? Math.min(1, (performance.now() - this.online.snapshotAt) / 50) : 1;
    const players = this.engine.players.map((player) => {
      const previous = this.online?.previousPlayers?.find((candidate) => candidate.id === player.id);
      return previous ? { ...player, x: previous.x + (player.x - previous.x) * interpolation, y: previous.y + (player.y - previous.y) * interpolation } : player;
    });
    for (const player of players) this.drawPlayer(ctx, player);
    const previousBall = this.online?.previousBall;
    this.drawBall(ctx, previousBall ? {
      ...this.engine.ball,
      x: previousBall.x + (this.engine.ball.x - previousBall.x) * interpolation,
      y: previousBall.y + (this.engine.ball.y - previousBall.y) * interpolation
    } : this.engine.ball);
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
    const selected = this.online
      ? player.id === this.online.access.slot
      : player.id === this.engine.selectedA || (this.engine.mode === 'local' && player.id === this.engine.selectedB);
    if (selected) {
      ctx.strokeStyle = '#f7c95e'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }

  private drawBall(ctx: CanvasRenderingContext2D, ball = this.engine.ball) {
    ctx.fillStyle = '#f4e9c3';
    ctx.beginPath(); ctx.arc(ball.x, ball.y, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#102421';
    ctx.beginPath(); ctx.arc(ball.x, ball.y, 3.5, 0, Math.PI * 2); ctx.fill();
  }

  destroy(discardDemo = false) {
    this.destroyed = true;
    window.cancelAnimationFrame(this.animation);
    if (this.demo && discardDemo) {
      try {
        window.localStorage.removeItem(this.storeKey);
        window.localStorage.removeItem(this.settingsKey);
      } catch { /* The demo is still abandoned when storage is disabled. */ }
    } else {
      this.saveEngine();
    }
    if (this.online?.retry) window.clearTimeout(this.online.retry);
    this.online?.socket?.close();
    this.resizeObserver?.disconnect();
    this.cleanupListeners();
  }
}

window.addEventListener('popstate', () => renderRoute(true));
renderRoute(false);
