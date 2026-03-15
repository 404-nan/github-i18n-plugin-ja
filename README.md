# github-i18n-plugin-ja

GitHub.com を日本語表示にする **Google Chrome 拡張機能（Manifest V3）** です。  
中国語版の github-i18n-plugin をベースに、日本語向けへ再設計しています。

## 機能
- GitHub のメニュー、見出し、ボタンなど主要 UI を日本語化
- 相対時刻（`relative-time`）を日本語表示
- リポジトリ説明文の翻訳ボタン（Google 翻訳 API 利用）

## インストール（開発者モード）
1. このリポジトリをダウンロード
2. Chrome で `chrome://extensions` を開く
3. 右上の「デベロッパーモード」を ON
4. 「パッケージ化されていない拡張機能を読み込む」で本ディレクトリを選択

## 主要ファイル
- `manifest.json`: 拡張機能定義
- `content.js`: GitHub ページ上で動く翻訳処理
- `locales/ja.json`: 日本語辞書

## スクリーンショット

![screenshot1](./images/screenshot1.png)

## TODO
- 未翻訳語彙の継続追加
- 翻訳対象の最適化
