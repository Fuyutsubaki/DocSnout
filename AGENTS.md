# Repository Guidelines

## Project Structure & Module Organization
This repository is a documentation-only workflow kit. The main content lives in `kanban/`:
- `kanban/workflow.md`: end-to-end workflow for design, implementation, review, and refactor loops.
- `kanban/design.md`, `kanban/simple-impl.md`, `kanban/review.md`, `kanban/refactor.md`: phase-specific instructions.
- `kanban/review-claude.sh`: helper script to run automated reviews.

There is no application source tree or test directory at the moment.

## Build, Test, and Development Commands
There is no build system. The only runnable command in this repo is the review helper:
- `./kanban/review-claude.sh`: runs Claude-based PR review using the rules in `kanban/review.md`.

If you add scripts or tooling, document them here with a one-line purpose and any required environment variables.

## Coding Style & Naming Conventions
All files are Markdown or shell scripts. Keep Markdown concise and instructional:
- Use clear headings, short paragraphs, and numbered steps for procedures.
- Favor ASCII file names with hyphen separation (for example, `new-workflow-step.md`).
- Shell scripts should be POSIX-friendly, include `set -e`, and explain non-obvious flags.

## Testing Guidelines
No automated tests are defined. If you introduce code in the future, add a test directory and document:
- the framework (for example, `pytest` or `go test`)
- how to run tests locally (command and expected scope)
- naming conventions (for example, `*_test` files)

## Commit & Pull Request Guidelines
This repository has no commit history yet, so no conventions are established. Until a standard emerges:
- Use short, imperative commit messages (for example, "Add review checklist").
- In PRs, describe what changed, why, and link any related task or issue.
- Include before/after examples when editing workflow steps or templates.

## Agent-Specific Notes
The workflow documents reference external paths such as `vibes/tmp/{branch}/design.md`.
When updating instructions, keep those paths consistent and avoid adding steps that assume a specific branch or environment unless explicitly required.
