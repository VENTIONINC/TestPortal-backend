import { parseStackTrace } from '@/lib/parse-error';

const sampleError = {
  message: 'TypeError: Something failed\nstep1\nstep2',
  stack: `TypeError: Something failed
    at step1 (/app/step1.ts:10:5)
    at step2 (/app/step2.ts:20:8)
expect(foo).toEqual(bar)
Expected pattern: foo
Received string: bar`,
  location: { file: 'test.ts', line: 5 },
};

const parsed = parseStackTrace(sampleError);

describe('parseStackTrace', () => {
  it('extracts type and message', () => {
    expect(parsed.type).toBe('TypeError');
    expect(parsed.message).toBe('Something failed');
  });

  it('extracts call log', () => {
    expect(parsed.callLog).toEqual(['step1', 'step2']);
  });

  it('extracts call stack frames', () => {
    expect(parsed.callStack).toEqual([
      'at step1 (/app/step1.ts:10:5)',
      'at step2 (/app/step2.ts:20:8)',
    ]);
  });

  it('extracts assertion info', () => {
    expect(parsed.testAssertion).toBe('expect(foo).toEqual(bar)');
    expect(parsed.expectedPattern).toBe('foo');
    expect(parsed.receivedString).toBe('bar');
  });
});

