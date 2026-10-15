# Install

build-story is a standard [Agent Skill](https://agentskills.io): a folder with a `SKILL.md` at its root. This repository is that folder. It is written for Claude Code, and OpenCode and Codex load it too; on those hosts the finished page stays as a file in the work dir instead of going up as an Artifact.

## With the skills CLI

```bash
npx skills add buildinternet/buildnotes -g -a claude-code
```

The [`skills`](https://github.com/vercel-labs/skills) CLI finds the `SKILL.md` at the root of this repository and installs it as `build-story`. `-g` installs it for your user; leave it out to install into the current project, and the CLI asks which agents to set up. `-a` picks the agent:

| Agent | `-g` installs to | Project install goes to | Run it with |
|---|---|---|---|
| Claude Code (`-a claude-code`) | `~/.claude/skills/build-story` | `.claude/skills/build-story` | `/build-story` |
| OpenCode (`-a opencode`) | `~/.config/opencode/skills/build-story` | `.agents/skills/build-story` | `/build-story` |
| Codex (`-a codex`) | `~/.agents/skills/build-story` | `.agents/skills/build-story` | `$build-story` (listed under `/skills`) |

## With git

Clone into the folder from the table above, for example:

```bash
git clone https://github.com/buildinternet/buildnotes.git ~/.claude/skills/build-story
```

Update by running `git pull` in that folder. If you already keep a checkout elsewhere, link it in instead, so the skill stays in step with it:

```bash
ln -s /path/to/buildnotes ~/.claude/skills/build-story
```

Claude Code picks up new skills in a running session. Restart OpenCode or Codex if the skill doesn't show.

## Requirements

| Needs | For |
|---|---|
| Node 22+ | Every script. They use only Node's built-in modules, so there is nothing to `npm install`. |
| `git` | Commits, ranges and file history |
| An authenticated `gh` (recommended) | Issues, PRs and review threads. See [Without the GitHub CLI](#without-the-github-cli). |
| Chrome or Chromium | The render pass, figure export and component screenshots. Set `CHROME_PATH` if it isn't found. |
| `ffmpeg` (optional) | GIF and video export |

## Without the GitHub CLI

[`gather.mjs`](../scripts/gather.mjs) calls `gh` for every issue, PR, review thread and search. It does not talk to an MCP server. Without `gh` on the path:

- `--issue`, `--pr` and `--search` stop with exit code 2 and one line saying `gh` is missing or not logged in.
- Git-only selectors (`--range`, `--since`, `--grep`, `--path`) still work. The repo comes from the `origin` remote (https or ssh), or from `--repo owner/name`. The dossier holds commits only; prior, nearby and later work come back empty.
- The repo's visibility reads as unknown, so the dossier treats it as private. If you confirmed it another way, pass `--visibility public` or `--visibility private` and the dossier records that.

The skill falls back in this order, and says in the hand-off which source it used:

1. **`gh`**, through the gatherer. The full dossier: review threads, linked issues, nearby and prior work, images.
2. **A GitHub MCP server**, when the agent has one connected. The agent confirms the repo's visibility there, runs the gatherer git-only with `--visibility`, then reads the issues, PRs and review comments it needs through the MCP tools. The story works, but you lose what the dossier computes for you: nearby work, prior work, "since then", story candidates and `--download`.
3. **Public GitHub pages**, as a last resort and for public repos only. The agent reads the issue and PR pages on github.com the way it reads any web page. Those pages show less than the API (long threads fold, some review comments hide), so the post leans on what is plainly on the page.

With none of these, the post is built from commit history alone, and is thinner for it.

## Codex: if gathering or the render pass is blocked

Codex runs commands in a sandbox. Two steps can trip it: `gather.mjs` calls `gh` over the network, and the render pass starts headless Chrome, which writes a temporary profile and talks to it over a local port. Work dirs also live outside the repo, in `~/.buildnotes`. In order of preference:

1. When Codex asks to run one of these outside the sandbox, approve it for that command. This needs the default `approval_policy = "on-request"`.
2. Or allow it in `~/.codex/config.toml`:

   ```toml
   approval_policy = "on-request"
   sandbox_mode = "workspace-write"

   [sandbox_workspace_write]
   network_access = true
   writable_roots = ["/Users/you/.buildnotes", "/tmp"]   # absolute paths
   ```

   Newer Codex releases may name these settings differently; check the config reference for your version.
3. Or set `BUILDNOTES_DIR` to a folder Codex can already write to.

## Configuration

- `BUILDNOTES_DIR`: where work dirs go (default `~/.buildnotes/<repo>/`). They live outside any repo, so runs survive worktrees and never land in tracked files.
- `house-style.md`: put one beside a repo's work dirs to record the product's exact name, shorthand, and terms to use or avoid. The skill reads it first and adds to it when you settle a term.
- `CHROME_PATH`: the Chrome or Chromium binary, when it isn't found on its own.
