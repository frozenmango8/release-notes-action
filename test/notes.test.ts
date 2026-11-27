import { describe, expect, it } from 'vitest';
import { EMPTY_NOTES, renderNotes } from '../src/notes';
import type { Commit } from '../src/parse';
import { suggestVersion } from '../src/version';

const repo = 'https://github.com/frozenmango8/release-notes-action';
const types = ['feat', 'fix', 'perf'];

function commit(partial: Partial<Commit> & Pick<Commit, 'type' | 'description'>): Commit {
  return {
    sha: 'abcdef1234567890abcdef1234567890abcdef12',
    author: 'Grace Hopper',
    scope: null,
    breaking: false,
    pr: null,
    ...partial,
  };
}

describe('renderNotes', () => {
  it('groups features, fixes, and performance in that order', () => {
    const notes = renderNotes(
      [
        commit({ type: 'feat', scope: 'notes', description: 'link authors', pr: 8 }),
        commit({
          type: 'fix',
          description: 'skip empty footers',
          sha: 'bbbbbbb1234567890abcdef1234567890abcdef12',
        }),
        commit({ type: 'perf', scope: 'log', description: 'read history once' }),
      ],
      { types, repoUrl: repo },
    );

    expect(notes.indexOf('## Features')).toBeLessThan(notes.indexOf('## Fixes'));
    expect(notes.indexOf('## Fixes')).toBeLessThan(notes.indexOf('## Performance'));
    expect(notes).toContain(
      '- **notes:** link authors ([#8](https://github.com/frozenmango8/release-notes-action/pull/8), [abcdef1](https://github.com/frozenmango8/release-notes-action/commit/abcdef1234567890abcdef1234567890abcdef12)) by Grace Hopper',
    );
    expect(notes).toContain('- skip empty footers ([bbbbbbb](');
    expect(notes).toContain('- **log:** read history once (');
    expect(notes.endsWith('\n')).toBe(true);
  });

  it('lists a breaking change once, ahead of its type', () => {
    const notes = renderNotes(
      [
        commit({ type: 'feat', description: 'add flags', breaking: true }),
        commit({ type: 'feat', description: 'add a quiet mode' }),
      ],
      { types, repoUrl: repo },
    );

    expect(notes.indexOf('## Breaking changes')).toBeLessThan(notes.indexOf('## Features'));
    expect(notes).toContain('- **feat:** add flags');
    expect(notes).toContain('- add a quiet mode');
    expect(notes.match(/add flags/g)).toHaveLength(1);
  });

  it('skips chore, ci, and docs unless they are requested', () => {
    const commits = [
      commit({ type: 'chore', description: 'bump deps' }),
      commit({ type: 'ci', description: 'run on tags' }),
      commit({ type: 'docs', description: 'fix a typo' }),
      commit({ type: 'feat', description: 'parse footers' }),
    ];

    const skipped = renderNotes(commits, { types, repoUrl: repo });
    expect(skipped).toContain('parse footers');
    expect(skipped).not.toContain('bump deps');
    expect(skipped).not.toContain('run on tags');
    expect(skipped).not.toContain('fix a typo');

    const included = renderNotes(commits, { types: ['feat', 'docs'], repoUrl: repo });
    expect(included).toContain('## Other changes');
    expect(included).toContain('- **docs:** fix a typo');
    expect(included).not.toContain('bump deps');
  });

  it('keeps a breaking change when its type is skipped', () => {
    const notes = renderNotes(
      [commit({ type: 'chore', scope: 'runtime', description: 'drop node 18', breaking: true })],
      { types, repoUrl: repo },
    );
    expect(notes).toContain('## Breaking changes');
    expect(notes).toContain('- **chore(runtime):** drop node 18');
    expect(notes).not.toContain('## Other changes');
  });

  it('reports an empty range', () => {
    expect(renderNotes([], { types, repoUrl: repo })).toBe(EMPTY_NOTES);
  });
});

describe('suggestVersion', () => {
  const feat = commit({ type: 'feat', description: 'add a flag' });
  const fix = commit({ type: 'fix', description: 'handle empty tags' });
  const perf = commit({ type: 'perf', description: 'skip unchanged trees' });
  const breaking = commit({ type: 'feat', description: 'drop getUser', breaking: true });

  it('bumps patch for fixes and performance', () => {
    expect(suggestVersion('1.2.3', [fix], types)).toBe('1.2.4');
    expect(suggestVersion('v1.2.3', [perf], types)).toBe('v1.2.4');
  });

  it('bumps minor for features', () => {
    expect(suggestVersion('v1.2.3', [feat, fix], types)).toBe('v1.3.0');
  });

  it('bumps major for a breaking change, and minor before 1.0.0', () => {
    expect(suggestVersion('v1.2.3', [breaking], types)).toBe('v2.0.0');
    expect(suggestVersion('v0.3.1', [breaking], types)).toBe('v0.4.0');
    expect(suggestVersion('0.0.1', [breaking], types)).toBe('0.1.0');
  });

  it('bumps for a breaking change of a skipped type', () => {
    const chore = commit({ type: 'chore', description: 'drop node 18', breaking: true });
    expect(suggestVersion('v1.2.3', [chore], types)).toBe('v2.0.0');
  });

  it('starts at 0.1.0 when there is no semver tag', () => {
    expect(suggestVersion(null, [feat], types)).toBe('0.1.0');
    expect(suggestVersion('nightly', [fix], types)).toBe('0.1.0');
  });

  it('does not bump when every commit is skipped', () => {
    const chore = commit({ type: 'chore', description: 'bump deps' });
    expect(suggestVersion('v1.2.3', [chore], types)).toBe('v1.2.3');
    expect(suggestVersion(null, [], types)).toBe('0.1.0');
  });
});
