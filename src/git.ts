import { execFileSync } from 'node:child_process';
import type { RawCommit } from './parse';
import { parseVersion } from './version';

// Commit bodies contain newlines, so records and fields use ASCII separators.
const FIELD = '\x1f';
const RECORD = '\x1e';

function git(args: string[], cwd?: string): string {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (err) {
    const stderr =
      err && typeof err === 'object' && 'stderr' in err ? String(err.stderr).trim() : '';
    throw new Error(stderr || `git ${args.join(' ')} failed`);
  }
}

export function isShallow(cwd?: string): boolean {
  return git(['rev-parse', '--is-shallow-repository'], cwd).trim() === 'true';
}

export function previousTag(to: string, cwd?: string): string | null {
  const tags = git(['tag', '--merged', to, '--sort=-v:refname'], cwd)
    .split('\n')
    .map((tag) => tag.trim())
    .filter((tag) => parseVersion(tag));

  if (tags.length === 0) return null;

  const head = git(['rev-parse', `${to}^{}`], cwd).trim();
  for (const tag of tags) {
    const sha = git(['rev-parse', `${tag}^{}`], cwd).trim();
    if (sha !== head) return tag;
  }
  return null;
}

export function listCommits(from: string | null, to: string, cwd?: string): RawCommit[] {
  const range = from ? `${from}..${to}` : to;
  const pretty = `--pretty=format:%H${FIELD}%an${FIELD}%s${FIELD}%b${RECORD}`;
  const out = git(['log', range, pretty, '--no-color'], cwd);
  if (!out.trim()) return [];

  const commits: RawCommit[] = [];
  for (const part of out.split(RECORD)) {
    const record = part.replace(/^\n/, '');
    if (!record.trim()) continue;

    const pieces = record.split(FIELD);
    const sha = pieces[0];
    const author = pieces[1];
    const subject = pieces[2];
    if (!sha || subject == null) continue;

    commits.push({
      sha,
      author: author ?? '',
      subject,
      body: pieces.slice(3).join(FIELD),
    });
  }
  return commits;
}
