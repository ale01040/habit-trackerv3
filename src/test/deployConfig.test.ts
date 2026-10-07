import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('vercel.json', () => {
  it('è JSON valido e riscrive le rotte SPA ma non i file statici', () => {
    const config = JSON.parse(readFileSync('vercel.json', 'utf8'));
    const source: string = config.rewrites[0].source;
    const pattern = new RegExp(`^${source}$`);
    expect(pattern.test('/stats')).toBe(true);
    expect(pattern.test('/reset-password')).toBe(true);
    expect(pattern.test('/assets/index-abc.js')).toBe(false);
    expect(pattern.test('/manifest.webmanifest')).toBe(false);
    expect(config.rewrites[0].destination).toBe('/index.html');
  });
});
