import { describe, expect, it } from 'vitest';
import { GameEngine } from '../src/engine';

describe('Codekick match engine', () => {
  it('reaches the final whistle from a fixed-step run', () => {
    const match = new GameEngine('local');
    for (let tick = 0; tick < 60 * 242 && match.phase !== 'ended'; tick += 1) match.advance(1 / 60);
    expect(match.phase).toBe('ended');
    expect(match.timeLeft).toBe(0);
  });

  it('resets score and rotates the symmetric stadium rule for a rematch', () => {
    const match = new GameEngine('local', 'Crosswind');
    match.score.sun = 3;
    match.score.tide = 2;
    match.reset();
    expect(match.score).toEqual({ sun: 0, tide: 0 });
    expect(match.timeLeft).toBe(240);
    expect(match.rule).toBe('Spring turf');
    expect(match.phase).toBe('kickoff');
  });

  it('does not advance a paused match', () => {
    const match = new GameEngine();
    for (let tick = 0; tick < 61; tick += 1) match.advance(1 / 60);
    const before = match.timeLeft;
    match.pause();
    match.advance(4);
    expect(match.timeLeft).toBe(before);
    expect(match.phase).toBe('paused');
  });
});
