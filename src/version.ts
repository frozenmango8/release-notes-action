import type { Commit } from './parse';

interface SemVer {
  major: number;
  minor: number;
  patch: number;
  prefix: string;
}

const SEMVER = /^(v)?(\d+)\.(\d+)\.(\d+)$/;

export function parseVersion(tag: string): SemVer | null {
  const match = SEMVER.exec(tag.trim());
  if (!match) return null;
  return {
    prefix: match[1] ?? '',
    major: Number(match[2]),
    minor: Number(match[3]),
    patch: Number(match[4]),
  };
}

function format(version: SemVer): string {
  return `${version.prefix}${version.major}.${version.minor}.${version.patch}`;
}

function included(commit: Commit, types: string[]): boolean {
  return commit.breaking || types.includes(commit.type);
}

export function suggestVersion(
  previousTag: string | null,
  commits: Commit[],
  types: string[],
): string {
  const relevant = commits.filter((commit) => included(commit, types));
  const previous = previousTag ? parseVersion(previousTag) : null;

  if (!previous) return '0.1.0';
  if (relevant.length === 0) return format(previous);

  const breaking = relevant.some((commit) => commit.breaking);
  const feature = relevant.some((commit) => commit.type === 'feat');

  if (breaking) {
    // Pre-1.0 versions have no stable API, so a break bumps minor.
    if (previous.major === 0) {
      return format({ ...previous, minor: previous.minor + 1, patch: 0 });
    }
    return format({ ...previous, major: previous.major + 1, minor: 0, patch: 0 });
  }

  if (feature) return format({ ...previous, minor: previous.minor + 1, patch: 0 });
  return format({ ...previous, patch: previous.patch + 1 });
}
