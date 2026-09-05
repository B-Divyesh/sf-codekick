export const FIELD = { width: 960, height: 540, goalDepth: 35, goalHeight: 180 } as const;

export type Team = 'sun' | 'tide';
export type Rule = 'Crosswind' | 'Spring turf' | 'Pinched goals';
export type Phase = 'kickoff' | 'playing' | 'goal' | 'ended' | 'paused';
export type MatchMode = 'practice' | 'local';

export interface Player {
  id: string;
  team: Team;
  x: number;
  y: number;
  vx: number;
  vy: number;
  selected: boolean;
}

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  owner: string | null;
}

export interface InputFrame {
  up?: boolean;
  down?: boolean;
  left?: boolean;
  right?: boolean;
  pass?: boolean;
  shot?: boolean;
  p2up?: boolean;
  p2down?: boolean;
  p2left?: boolean;
  p2right?: boolean;
  p2pass?: boolean;
  p2shot?: boolean;
}

export interface SerializedMatch {
  players: Player[];
  ball: Ball;
  score: Record<Team, number>;
  timeLeft: number;
  phase: Phase;
  phaseTimer: number;
  rule: Rule;
  mode: MatchMode;
  comboUntil: number;
  selectedA: string;
  selectedB: string;
}

const PLAYER_RADIUS = 22;
const BALL_RADIUS = 10;
const MOVE_SPEED = 235;
const MATCH_SECONDS = 4 * 60;
const RULES: Rule[] = ['Crosswind', 'Spring turf', 'Pinched goals'];

const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
const length = (x: number, y: number) => Math.hypot(x, y);

export class GameEngine {
  players: Player[];
  ball: Ball;
  score: Record<Team, number> = { sun: 0, tide: 0 };
  timeLeft = MATCH_SECONDS;
  phase: Phase = 'kickoff';
  phaseTimer = 1;
  rule: Rule;
  readonly mode: MatchMode;
  comboUntil = 0;
  selectedA = 'sun-1';
  selectedB = 'tide-1';
  assistMode = false;

  constructor(mode: MatchMode = 'practice', rule: Rule = 'Crosswind') {
    this.mode = mode;
    this.rule = rule;
    this.players = this.makePlayers();
    this.ball = { x: FIELD.width / 2, y: FIELD.height / 2, vx: 0, vy: 0, owner: null };
  }

  private makePlayers(): Player[] {
    return [
      { id: 'sun-1', team: 'sun', x: 330, y: 210, vx: 0, vy: 0, selected: true },
      { id: 'sun-2', team: 'sun', x: 330, y: 330, vx: 0, vy: 0, selected: false },
      { id: 'tide-1', team: 'tide', x: 630, y: 210, vx: 0, vy: 0, selected: true },
      { id: 'tide-2', team: 'tide', x: 630, y: 330, vx: 0, vy: 0, selected: false }
    ];
  }

  get isActive() {
    return this.phase === 'playing';
  }

  get comboRemaining() {
    return this.ball.owner && this.comboUntil > 0 ? Math.max(0, this.comboUntil) : 0;
  }

  get goalHalfHeight() {
    return this.rule === 'Pinched goals' ? 70 : FIELD.goalHeight / 2;
  }

  advance(dt: number, input: InputFrame = {}): void {
    const safeDt = clamp(dt, 0, 1 / 12);
    if (this.phase === 'paused' || this.phase === 'ended') return;

    if (this.phase === 'kickoff' || this.phase === 'goal') {
      this.phaseTimer -= safeDt;
      if (this.phaseTimer <= 0) this.phase = 'playing';
      return;
    }

    this.timeLeft = Math.max(0, this.timeLeft - safeDt);
    this.comboUntil = Math.max(0, this.comboUntil - safeDt);
    this.moveHuman(this.selectedA, input.up, input.down, input.left, input.right, safeDt);
    if (this.mode === 'local') {
      this.moveHuman(this.selectedB, input.p2up, input.p2down, input.p2left, input.p2right, safeDt);
    } else {
      this.moveAi(this.selectedB, safeDt);
    }
    this.moveSupporters(safeDt);

    if (input.pass) this.kick(this.selectedA, false);
    if (input.shot) this.kick(this.selectedA, true);
    if (this.mode === 'local') {
      if (input.p2pass) this.kick(this.selectedB, false);
      if (input.p2shot) this.kick(this.selectedB, true);
    }

    this.moveBall(safeDt);
    this.tryPickup();
    this.checkGoal();
    if (this.timeLeft === 0 && this.phase === 'playing') this.phase = 'ended';
  }

  private find(id: string) {
    const player = this.players.find((candidate) => candidate.id === id);
    if (!player) throw new Error(`Unknown player ${id}`);
    return player;
  }

  private moveHuman(id: string, up = false, down = false, left = false, right = false, dt = 0): void {
    const player = this.find(id);
    const dx = Number(right) - Number(left);
    const dy = Number(down) - Number(up);
    const magnitude = length(dx, dy) || 1;
    const speed = this.assistMode ? MOVE_SPEED * 0.84 : MOVE_SPEED;
    player.vx = (dx / magnitude) * speed;
    player.vy = (dy / magnitude) * speed;
    player.x = clamp(player.x + player.vx * dt, PLAYER_RADIUS + 5, FIELD.width - PLAYER_RADIUS - 5);
    player.y = clamp(player.y + player.vy * dt, PLAYER_RADIUS + 5, FIELD.height - PLAYER_RADIUS - 5);
  }

  private moveAi(id: string, dt: number): void {
    const player = this.find(id);
    const dx = this.ball.x - player.x;
    const dy = this.ball.y - player.y;
    const distance = length(dx, dy) || 1;
    const speed = 176;
    player.vx = (dx / distance) * speed;
    player.vy = (dy / distance) * speed;
    player.x = clamp(player.x + player.vx * dt, PLAYER_RADIUS + 5, FIELD.width - PLAYER_RADIUS - 5);
    player.y = clamp(player.y + player.vy * dt, PLAYER_RADIUS + 5, FIELD.height - PLAYER_RADIUS - 5);
    if (this.ball.owner === id && player.x < FIELD.width * 0.55) this.kick(id, true);
  }

  private moveSupporters(dt: number): void {
    for (const player of this.players) {
      if (player.id === this.selectedA || (this.mode === 'local' && player.id === this.selectedB)) continue;
      if (this.mode === 'practice' && player.id === this.selectedB) continue;
      const targetX = player.team === 'sun' ? 390 : 570;
      const targetY = player.id.endsWith('1') ? 190 : 350;
      player.vx = (targetX - player.x) * 1.6;
      player.vy = (targetY - player.y) * 1.6;
      player.x = clamp(player.x + player.vx * dt, PLAYER_RADIUS + 5, FIELD.width - PLAYER_RADIUS - 5);
      player.y = clamp(player.y + player.vy * dt, PLAYER_RADIUS + 5, FIELD.height - PLAYER_RADIUS - 5);
    }
  }

  private kick(id: string, shot: boolean): void {
    if (this.phase !== 'playing' || this.ball.owner !== id) return;
    const player = this.find(id);
    const direction = player.team === 'sun' ? 1 : -1;
    const teammate = this.players.find((candidate) => candidate.team === player.team && candidate.id !== id);
    const targetY = shot ? FIELD.height / 2 : (teammate?.y ?? FIELD.height / 2);
    const targetX = shot ? (direction === 1 ? FIELD.width + 30 : -30) : (teammate?.x ?? player.x + direction * 110);
    const dx = targetX - player.x;
    const dy = targetY - player.y;
    const distance = length(dx, dy) || 1;
    const pace = (shot ? 590 : 420) * (this.assistMode ? 0.78 : 1);
    this.ball.owner = null;
    this.ball.x = player.x + direction * (PLAYER_RADIUS + BALL_RADIUS + 2);
    this.ball.y = player.y;
    this.ball.vx = (dx / distance) * pace;
    this.ball.vy = (dy / distance) * pace;
  }

  private moveBall(dt: number): void {
    if (this.ball.owner) {
      const owner = this.find(this.ball.owner);
      const direction = owner.team === 'sun' ? 1 : -1;
      this.ball.x = owner.x + direction * (PLAYER_RADIUS + BALL_RADIUS + 2);
      this.ball.y = owner.y;
      this.ball.vx = owner.vx;
      this.ball.vy = owner.vy;
      return;
    }
    if (this.rule === 'Crosswind') this.ball.vy += Math.sin((this.timeLeft + 3) * 0.7) * 28 * dt;
    this.ball.x += this.ball.vx * dt;
    this.ball.y += this.ball.vy * dt;
    const drag = this.rule === 'Spring turf' ? 0.985 : 0.973;
    this.ball.vx *= drag;
    this.ball.vy *= drag;
    if (this.ball.y < BALL_RADIUS || this.ball.y > FIELD.height - BALL_RADIUS) {
      this.ball.y = clamp(this.ball.y, BALL_RADIUS, FIELD.height - BALL_RADIUS);
      this.ball.vy *= this.rule === 'Spring turf' ? -0.92 : -0.72;
    }
  }

  private tryPickup(): void {
    if (this.ball.owner) return;
    for (const player of this.players) {
      const distance = length(player.x - this.ball.x, player.y - this.ball.y);
      if (distance < PLAYER_RADIUS + BALL_RADIUS + 5 && length(this.ball.vx, this.ball.vy) < 330) {
        this.ball.owner = player.id;
        this.comboUntil = 2;
        if (player.team === 'sun') this.selectedA = player.id;
        if (player.team === 'tide') this.selectedB = player.id;
        return;
      }
    }
  }

  private checkGoal(): void {
    const insideGoal = Math.abs(this.ball.y - FIELD.height / 2) <= this.goalHalfHeight;
    if (!insideGoal) return;
    if (this.ball.x < -FIELD.goalDepth) this.score.tide += 1;
    else if (this.ball.x > FIELD.width + FIELD.goalDepth) this.score.sun += 1;
    else return;
    this.resetAfterGoal();
  }

  private resetAfterGoal(): void {
    this.ball = { x: FIELD.width / 2, y: FIELD.height / 2, vx: 0, vy: 0, owner: null };
    this.players = this.makePlayers();
    this.selectedA = 'sun-1';
    this.selectedB = 'tide-1';
    this.comboUntil = 0;
    this.phase = this.timeLeft === 0 ? 'ended' : 'goal';
    this.phaseTimer = 1.2;
  }

  pause(): void { if (this.phase === 'playing') this.phase = 'paused'; }
  resume(): void { if (this.phase === 'paused') this.phase = 'playing'; }
  finish(): void { this.timeLeft = 0; this.phase = 'ended'; }

  reset(nextRule?: Rule): void {
    const index = RULES.indexOf(this.rule);
    this.rule = nextRule ?? RULES[(index + 1) % RULES.length];
    this.players = this.makePlayers();
    this.ball = { x: FIELD.width / 2, y: FIELD.height / 2, vx: 0, vy: 0, owner: null };
    this.score = { sun: 0, tide: 0 };
    this.timeLeft = MATCH_SECONDS;
    this.phase = 'kickoff';
    this.phaseTimer = 1;
    this.comboUntil = 0;
    this.selectedA = 'sun-1';
    this.selectedB = 'tide-1';
  }

  serialize(): SerializedMatch {
    return JSON.parse(JSON.stringify({
      players: this.players, ball: this.ball, score: this.score, timeLeft: this.timeLeft,
      phase: this.phase, phaseTimer: this.phaseTimer, rule: this.rule, mode: this.mode,
      comboUntil: this.comboUntil, selectedA: this.selectedA, selectedB: this.selectedB
    })) as SerializedMatch;
  }

  restore(state: SerializedMatch): void {
    this.players = state.players;
    this.ball = state.ball;
    this.score = state.score;
    this.timeLeft = state.timeLeft;
    this.phase = state.phase === 'paused' ? 'playing' : state.phase;
    this.phaseTimer = state.phaseTimer;
    this.rule = state.rule;
    this.comboUntil = state.comboUntil;
    this.selectedA = state.selectedA;
    this.selectedB = state.selectedB;
  }
}

export const formatClock = (seconds: number) => {
  const whole = Math.ceil(Math.max(0, seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
};
