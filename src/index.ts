import * as core from '@actions/core';
import * as github from '@actions/github';
import { isShallow, listCommits, previousTag } from './git';
import { EMPTY_NOTES, renderNotes } from './notes';
import { parseCommit, type Commit } from './parse';
import { suggestVersion } from './version';

const DEFAULT_TYPES = ['feat', 'fix', 'perf'];

function selectedTypes(): string[] {
  const input = core.getInput('include-types').trim();
  if (!input) return DEFAULT_TYPES;
  return input
    .split(',')
    .map((type) => type.trim().toLowerCase())
    .filter(Boolean);
}

async function run(): Promise<void> {
  if (isShallow()) {
    core.warning('Checkout is shallow, so tags and older commits are missing. Use fetch-depth: 0.');
  }

  const fromInput = core.getInput('from').trim();
  const to = core.getInput('to').trim() || github.context.sha || 'HEAD';
  const types = selectedTypes();
  const createRelease = core.getBooleanInput('create-release');

  const base = previousTag(to);
  const from = fromInput || base;
  core.debug(`Reading ${from ?? 'root'}..${to}`);

  const commits: Commit[] = [];
  for (const raw of listCommits(from, to)) {
    const commit = parseCommit(raw);
    if (commit) commits.push(commit);
  }

  const { owner, repo } = github.context.repo;
  const repoUrl = `${github.context.serverUrl}/${owner}/${repo}`;
  const notes = renderNotes(commits, { types, repoUrl });
  const version = suggestVersion(base, commits, types);

  core.setOutput('notes', notes);
  core.setOutput('version', version);
  core.info(`Suggested version: ${version}`);
  core.info(notes);

  if (!createRelease) return;

  if (notes === EMPTY_NOTES) {
    core.info('No notable changes; skipping draft release.');
    return;
  }

  const token = core.getInput('token');
  if (!token) throw new Error('create-release requires the token input');

  const octokit = github.getOctokit(token);
  const release = await octokit.rest.repos.createRelease({
    owner,
    repo,
    tag_name: version,
    target_commitish: to,
    name: version,
    body: notes,
    draft: true,
  });
  core.info(`Opened draft release ${release.data.html_url}`);
}

run().catch((err: unknown) => {
  core.setFailed(err instanceof Error ? err.message : String(err));
});
