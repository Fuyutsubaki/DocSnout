# Repository Guidelines

## Project Structure & Module Organization
このリポジトリは以下で構成されます。
- `extension/`: Chrome 拡張（MV3）
- `native-host/`: Native Messaging Host（Windows/.NET、A.I.VOICE Editor API 呼び出し）
- `vibes/kanban/`: vibe kanban 用のワークフロー（設計→実装→レビュー→リファクタ）

## Build, Test, and Development Commands
- 拡張のテスト（Node の組み込みテストランナー）
  - `node --test extension/text-utils.test.js`: 文字数ユーティリティのテスト
  - `node --test extension/page-extract.test.js`: 本文抽出のテスト
  - `node --test extension/aivoice-protocol.test.js`: Native Messaging のリクエスト構築テスト
  - `node --test extension/aivoice-state.test.js`: 状態遷移（縮約関数）のテスト
- レビュー補助（Claude CLI が必要）
  - `./vibes/kanban/review-claude.sh`: `vibes/kanban/review.md` のルールでレビューを行う
- Native Messaging Host（Windows）
  - `dotnet publish native-host/DocSnout.AiVoiceHost/DocSnout.AiVoiceHost.csproj ...`: Host のビルド例（詳細は `native-host/README.md`）
  - `.\native-host\install-host.ps1`: Chrome への Host 登録（拡張 ID と exe パスが必要）
    - 環境変数: `DOCSNOUT_AIVOICE_API_DLL`（`AI.Talk.Editor.Api.dll` のパス。自動検出できない場合に指定）

## Coding Style & Naming Conventions
- JavaScript: 既存の書き方（関数分割、例外メッセージは日本語）に合わせる
- Markdown: 見出しと手順を明確にし、短い段落で説明する
- スクリプト:
  - `bash`: POSIX 互換、`set -e` を入れる
  - `PowerShell`: 破壊的操作を避け、必須パラメータは `Mandatory` にする

## Testing Guidelines
- 既存の `node:test`（`node --test`）を利用する
- 新規テストは `extension/*.test.js` で追加する

## Commit & Pull Request Guidelines
This repository has no commit history yet, so no conventions are established. Until a standard emerges:
- Use short, imperative commit messages (for example, "Add review checklist").
- In PRs, describe what changed, why, and link any related task or issue.
- Include before/after examples when editing workflow steps or templates.

## Agent-Specific Notes
The workflow documents reference external paths such as `vibes/tmp/{branch}/design.md`.
When updating instructions, keep those paths consistent and avoid adding steps that assume a specific branch or environment unless explicitly required.

## 言語
- コメントなどは自然な日本語を用いること
- 造語禁止。**必ず一般的な技術用語、広く使われる日本語を使うこと**
- 不自然な翻訳禁止。**必ず一般的な日本語翻訳を行い、不自然な日本語になりそうな場合は元の英単語を使うこと**
- 省略禁止。**必ずこのレポート単体で理解できるようにすること**
