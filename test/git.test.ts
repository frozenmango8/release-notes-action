import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { isShallow, listCommits, previousTag } from '../src/git';
import { parseCommit } from '../src/parse';

function git(cwd: string, args: string[]): void {
  execFileSync('git', args, { cwd, stdio: 'ignore' });
}

function commit(cwd: string, file: string, subject: string, body?: string): void {
  writeFileSync(join(cwd, file), subject);
  git(cwd, ['add', file]);
  const args = ['commit', '-m', subject];
  if (body) args.push('-m', body);
  git(cwd, args);
}

describe('git history', () => {
  let dir: string | undefined;

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
    dir = undefined;
  });

  function init(): string {
    dir = mkdtempSync(join(tmpdir(), 'release-notes-'));
    git(dir, ['init', '-b', 'main']);
    git(dir, ['config', 'user.email', 'dev@example.com']);
    git(dir, ['config', 'user.name', 'Dev']);
    git(dir, ['config', 'commit.gpgsign', 'false']);
    return dir;
  }

  it('reads commits after the previous semver tag', () => {
    const cwd = init();
    commit(cwd, 'a.txt', 'feat: first');
    git(cwd, ['tag', 'v0.1.0']);
    commit(cwd, 'b.txt', 'fix: second (#7)');
    commit(cwd, 'c.txt', 'not conventional');

    expect(isShallow(cwd)).toBe(false);
    expect(previousTag('HEAD', cwd)).toBe('v0.1.0');

    const commits = listCommits('v0.1.0', 'HEAD', cwd);
    expect(commits.map((item) => item.subject)).toEqual(['not conventional', 'fix: second (#7)']);
    expect(commits[1]).toMatchObject({ author: 'Dev', body: '' });

    const parsed = commits.flatMap((item) => {
      const result = parseCommit(item);
      return result ? [result] : [];
    });
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({ type: 'fix', description: 'second', pr: 7 });
  });

  it('keeps a multiline breaking footer intact', () => {
    const cwd = init();
    commit(cwd, 'a.txt', 'feat: first', 'Explains the change.\n\nBREAKING CHANGE: ids are strings');
    const [raw] = listCommits(null, 'HEAD', cwd);
    expect(raw.body).toContain('BREAKING CHANGE: ids are strings');
    expect(parseCommit(raw)?.breaking).toBe(true);
  });

  it('uses version sort and skips a tag that points at the head', () => {
    const cwd = init();
    commit(cwd, 'a.txt', 'feat: first');
    git(cwd, ['tag', 'v1.9.0']);
    commit(cwd, 'b.txt', 'feat: second');
    git(cwd, ['tag', '-a', 'v1.10.0', '-m', 'v1.10.0']);
    commit(cwd, 'c.txt', 'fix: third');
    git(cwd, ['tag', 'nightly']);

    expect(previousTag('HEAD', cwd)).toBe('v1.10.0');
  });

  it('skips a tag that points at the head and ignores non-semver tags', () => {
    const cwd = init();
    commit(cwd, 'a.txt', 'feat: first');
    git(cwd, ['tag', 'v0.1.0']);
    commit(cwd, 'b.txt', 'fix: second');
    git(cwd, ['tag', 'v0.2.0']);
    git(cwd, ['tag', 'nightly']);

    expect(previousTag('HEAD', cwd)).toBe('v0.1.0');
    expect(listCommits(null, 'HEAD', cwd)).toHaveLength(2);
  });
});
