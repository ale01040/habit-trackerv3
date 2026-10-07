import { describe, expect, it } from 'vitest';
import { newId } from './ids';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('newId', () => {
  it('usa randomUUID se c’è', () => {
    expect(newId({ randomUUID: () => '11111111-1111-4111-8111-111111111111' })).toBe(
      '11111111-1111-4111-8111-111111111111',
    );
  });
  it('fallback senza contesto sicuro', () => {
    expect(newId({})).toMatch(UUID);
    expect(newId(undefined)).toMatch(UUID);
  });
});
