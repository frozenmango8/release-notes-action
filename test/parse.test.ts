import { describe, expect, it } from 'vitest';
import { parseCommit, type RawCommit } from '../src/parse';

function raw(subject: string, body = '', extra: Partial<RawCommit> = {}): RawCommit {
  return {
    sha: '0123456789abcdef0123456789abcdef01234567',
    author: 'Ada Lovelace',
    subject,
    body,
    ...extra,
  };
}

describe('parseCommit', () => {
  it('parses a scoped commit', () => {
    expect(parseCommit(raw('feat(parser): read scopes'))).toMatchObject({
      type: 'feat',
      scope: 'parser',
      description: 'read scopes',
      breaking: false,
      pr: null,
      author: 'Ada Lovelace',
    });
  });

  it('parses an unscoped commit and a trailing pull request', () => {
    expect(parseCommit(raw('fix: handle empty tags (#42)'))).toMatchObject({
      type: 'fix',
      scope: null,
      description: 'handle empty tags',
      pr: 42,
    });
  });

  it('keeps a hash that is not the trailing pull request', () => {
    const commit = parseCommit(raw('fix: accept #12 in the subject (#9)'));
    expect(commit?.description).toBe('accept #12 in the subject');
    expect(commit?.pr).toBe(9);
  });

  it('flags a bang as breaking', () => {
    const commit = parseCommit(raw('feat(api)!: drop getUser'));
    expect(commit?.breaking).toBe(true);
    expect(commit?.scope).toBe('api');
    expect(commit?.description).toBe('drop getUser');
  });

  it('flags a breaking footer after a body', () => {
    const commit = parseCommit(
      raw('refactor(api): rename ids', 'Callers should switch.\n\nBREAKING CHANGE: ids are strings\n'),
    );
    expect(commit?.breaking).toBe(true);
    expect(commit?.type).toBe('refactor');
  });

  it('accepts a hyphenated breaking footer', () => {
    const commit = parseCommit(raw('fix: tighten parsing', 'BREAKING-CHANGE: callers must pass a ref'));
    expect(commit?.breaking).toBe(true);
  });

  it('rejects subjects that are not conventional commits', () => {
    expect(parseCommit(raw('Merge pull request #12 from someone'))).toBeNull();
    expect(parseCommit(raw('no type here'))).toBeNull();
    expect(parseCommit(raw('Feat: capitalized type'))).toBeNull();
    expect(parseCommit(raw('feat:'))).toBeNull();
    expect(parseCommit(raw('feat: (#4)'))).toBeNull();
  });
});
