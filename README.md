# release-notes-action

Drafts release notes from [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) between the previous tag and the current ref.

[![CI](https://github.com/frozenmango8/release-notes-action/actions/workflows/ci.yml/badge.svg)](https://github.com/frozenmango8/release-notes-action/actions/workflows/ci.yml)

`feat`, `fix`, and `perf` are grouped under Features, Fixes, and Performance. A `!` on the type, or a `BREAKING CHANGE` / `BREAKING-CHANGE` footer, is listed under Breaking changes and is not repeated under its type. Each entry links the commit, links a trailing `(#123)` pull request, and credits the git author. Other types, including `chore`, `ci`, and `docs`, are dropped unless named in `include-types`.

## Usage

```yaml
name: Release notes
on: workflow_dispatch
permissions:
  contents: read
jobs:
  notes:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0
      - uses: frozenmango8/release-notes-action@v1
        id: notes
```

`fetch-depth: 0` is required. A shallow checkout has no tags and drops older commits.

Set `create-release: true` to open a draft release for the suggested version. That needs `contents: write`. The release stays a draft. `.github/workflows/example.yml` does this on `v*.*.*` tags.

## Inputs

| Name | Description | Default |
| --- | --- | --- |
| `from` | Base ref, exclusive. | previous semver tag |
| `to` | Head ref, inclusive. | current commit |
| `include-types` | Comma-separated types to include. Breaking changes are always included. | `feat,fix,perf` |
| `create-release` | Open a draft release for the suggested version. | `false` |
| `token` | Token used when `create-release` is true. | `github.token` |

## Outputs

| Name | Description |
| --- | --- |
| `notes` | Release notes as Markdown. |
| `version` | Suggested next version. A leading `v` is kept when the previous tag had one. |

`feat` bumps minor. Any other included type bumps patch. A breaking change bumps major, or minor while the version is `0.x`. Tags that are not `x.y.z` or `vx.y.z` are ignored. With no previous semver tag the suggestion is `0.1.0`. If nothing included changed, the previous version is left as-is. `from` only selects commits; the bump is based on the latest semver tag reachable from `to`.

## Sample

```markdown
## Breaking changes

- **feat(api):** remove `getUser` ([#12](https://github.com/frozenmango8/release-notes-action/pull/12), [a1b2c3d](https://github.com/frozenmango8/release-notes-action/commit/a1b2c3d4e5f6789012345678901234567890abcd)) by Ada Lovelace

## Features

- **notes:** link pull requests ([#8](https://github.com/frozenmango8/release-notes-action/pull/8), [e4f5a6b](https://github.com/frozenmango8/release-notes-action/commit/e4f5a6b7c8d9012345678901234567890abcdef1)) by Grace Hopper

## Fixes

- ignore empty footers ([#9](https://github.com/frozenmango8/release-notes-action/pull/9), [c0ffee1](https://github.com/frozenmango8/release-notes-action/commit/c0ffee12d3e456789012345678901234567890ab)) by Grace Hopper

## Performance

- **log:** walk each commit once ([d00df00](https://github.com/frozenmango8/release-notes-action/commit/d00df00d1e2f3456789012345678901234567890)) by Margaret Hamilton
```
