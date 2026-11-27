export interface RawCommit {
  sha: string;
  author: string;
  subject: string;
  body: string;
}

export interface Commit {
  sha: string;
  author: string;
  type: string;
  scope: string | null;
  description: string;
  breaking: boolean;
  pr: number | null;
}

const HEADER = /^([a-z]+)(?:\(([^)]+)\))?(!)?: (.+)$/;
const TRAILING_PR = /\(#(\d+)\)\s*$/;
const BREAKING_FOOTER = /^BREAKING[ -]CHANGE:/m;

export function parseCommit(raw: RawCommit): Commit | null {
  const match = HEADER.exec(raw.subject.trim());
  if (!match) return null;

  const pr = TRAILING_PR.exec(match[4]);
  const description = match[4].replace(TRAILING_PR, '').trim();
  if (!description) return null;

  return {
    sha: raw.sha,
    author: raw.author.trim(),
    type: match[1],
    scope: match[2] ?? null,
    description,
    breaking: match[3] === '!' || BREAKING_FOOTER.test(raw.body),
    pr: pr ? Number(pr[1]) : null,
  };
}
