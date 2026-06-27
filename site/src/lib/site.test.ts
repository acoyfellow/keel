import { describe, expect, test } from 'bun:test';
import { boundaries, examples, quickStart, site } from './site';

const bannedFragments = [
  "In today's rapidly evolving landscape",
  'game-changer',
  'paradigm shift',
  'seamless',
  'robust',
  'revolutionary',
] as const;

describe('site content', () => {
  test('Given the examples When rendered Then every receipt stays runnable and inspectable', () => {
    expect(examples).toHaveLength(5);
    for (const example of examples) {
      expect(example.command.startsWith('bun run examples/')).toBe(true);
      expect(example.command.endsWith('/run.ts')).toBe(true);
      expect(example.receipt.startsWith('receipts/example-')).toBe(true);
      expect(example.receipt.endsWith('.md')).toBe(true);
      expect(example.claim.length).toBeGreaterThan(20);
      expect(example.result.length).toBeGreaterThan(20);
    }
  });

  test('Given the public copy When checked Then unsupported launch claims are absent', () => {
    const copy = [
      site.title,
      site.description,
      ...examples.flatMap((example) => [example.title, example.claim, example.result]),
      ...quickStart.flatMap((item) => [item.command, item.note]),
      ...boundaries,
    ].join('\n');

    for (const fragment of bannedFragments) {
      expect(copy).not.toContain(fragment);
    }
    expect(copy).not.toContain('bunx keel');
    expect(copy).not.toContain('Codex');
  });
});
