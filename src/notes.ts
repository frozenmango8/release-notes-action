import type { Commit } from './parse';

const ORDER = ['feat', 'fix', 'perf'];

const TITLES: Record<string, string> = {
  feat: 'Features',
  fix: 'Fixes',
  perf: 'Performance',
};

export interface RenderOptions {
  types: string[];
  repoUrl: string;
}

export function renderNotes(commits: Commit[], options: RenderOptions): string {
  const visible = commits.filter((commit) => commit.breaking || options.types.includes(commit.type));
  if (visible.length === 0) return 'No notable changes.\n';

  const breaking = visible.filter((commit) => commit.breaking);
  const rest = visible.filter((commit) => !commit.breaking);
  const sections: string[] = [];

  if (breaking.length > 0) {
    sections.push(section('Breaking changes', breaking, options.repoUrl, true));
  }

  for (const type of ORDER) {
    if (!options.types.includes(type)) continue;
    const items = rest.filter((commit) => commit.type === type);
    if (items.length > 0) sections.push(section(TITLES[type], items, options.repoUrl, false));
  }

  const other = rest.filter((commit) => !ORDER.includes(commit.type));
  if (other.length > 0) sections.push(section('Other changes', other, options.repoUrl, true));

  return `${sections.join('\n\n')}\n`;
}

function section(title: string, commits: Commit[], repoUrl: string, showType: boolean): string {
  const lines = commits.map((commit) => bullet(commit, repoUrl, showType));
  return `## ${title}\n\n${lines.join('\n')}`;
}

function bullet(commit: Commit, repoUrl: string, showType: boolean): string {
  const label = labelFor(commit, showType);
  const text = label ? `${label} ${commit.description}` : commit.description;
  const short = commit.sha.slice(0, 7);
  const links = [];
  if (commit.pr != null) links.push(`[#${commit.pr}](${repoUrl}/pull/${commit.pr})`);
  links.push(`[${short}](${repoUrl}/commit/${commit.sha})`);
  const by = commit.author ? ` by ${commit.author}` : '';
  return `- ${text} (${links.join(', ')})${by}`;
}

function labelFor(commit: Commit, showType: boolean): string {
  if (showType) {
    return commit.scope ? `**${commit.type}(${commit.scope}):**` : `**${commit.type}:**`;
  }
  return commit.scope ? `**${commit.scope}:**` : '';
}
