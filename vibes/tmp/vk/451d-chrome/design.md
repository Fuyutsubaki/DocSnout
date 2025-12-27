# Chrome拡張の最小土台

## 目的

「ほぼ何もしない」Chrome拡張を作り、以降の機能追加の土台を用意する。

## スコープ

- 追加する
  - `manifest.json` (Manifest V3)
  - 拡張アイコンの表示
  - ポップアップに固定文言「拡張が有効です」を表示
- 追加しない（今回）
  - ページ解析
  - 何らかの保存処理（storage / ファイル / 外部送信など）
  - content script / background service worker

## 構成

- `manifest.json`
- `popup.html`, `popup.css`
- `icons/icon{16,32,48,128}.png`

## 動作確認

1. Chromeで `chrome://extensions` を開く
2. デベロッパーモードをON
3. 「パッケージ化されていない拡張機能を読み込む」でリポジトリ直下を選択
4. ツールバーの拡張アイコンをクリックし、ポップアップに「拡張が有効です」が表示されること

