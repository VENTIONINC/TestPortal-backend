import { toClearString } from '../parse-error';

describe('toClearString', () => {
  it('removes ANSI escape codes', () => {
    const colored = '\u001b[31mError message\u001b[0m';
    expect(toClearString(colored)).toBe('Error message');
  });

  it('returns empty string when text is undefined', () => {
    expect(toClearString()).toBe('');
  });
});
