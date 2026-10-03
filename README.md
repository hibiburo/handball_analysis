# handball_analysis

ハンドボールの相手ゴールキーパー（GK）のキーピング傾向を、YouTube の試合動画を見ながら記録・分析するスカウティング用 Web アプリです。
大学・高校の分析担当者が、相手GKの弱いコースを見つけ、根拠となるシーンをすぐに見せられることを目指しています。

- 動画を再生しながら、シュートの位置・コース・種別・結果を数タップで記録
- ゴール9分割のヒートマップで、コースごとの失点率・セーブ率を表示
- 条件（シュート位置・種別・利き手・数的状況など）で絞り込み、該当シーンを再生
- 同じGKの複数試合を合算して分析
- データはブラウザ内（IndexedDB）にだけ保存。JSON で書き出し・取り込み

設計・仕様は [docs/](./docs/) を参照してください（[プロダクト要求定義書](./docs/product-requirements.md)、[機能設計書](./docs/functional-design.md)、[技術仕様書](./docs/architecture.md) など）。

## 開発の始め方

必要なもの: Node.js 24 以上

```bash
npm install
npm run dev          # http://localhost:5173 で開発サーバーを起動
```

iPad など同じネットワークの別の端末から確認する場合は `npm run dev -- --host` で起動し、表示された Network の URL を開きます。

## npm スクリプト

| コマンド            | 内容                                                                                                 |
| ------------------- | ---------------------------------------------------------------------------------------------------- |
| `npm run dev`       | 開発サーバー                                                                                         |
| `npm run build`     | 型チェック＋本番ビルド（`dist/`）                                                                    |
| `npm run preview`   | ビルド結果をローカルで確認                                                                           |
| `npm run lint`      | ESLint（層の依存ルールの検査を含む）                                                                 |
| `npm run typecheck` | TypeScript の型チェック                                                                              |
| `npm run format`    | Prettier で整形                                                                                      |
| `npm run test`      | 単体・コンポーネントテスト（Vitest）                                                                 |
| `npm run test:e2e`  | E2E テスト（Playwright、Chromium と WebKit）。初回は `npx playwright install chromium webkit` が必要 |

コードを変更したら、コミット前に `npm run lint`・`npm run typecheck`・`npm run test` を実行してください（[開発ガイドライン](./docs/development-guidelines.md)）。

## 公開（Vercel）

静的サイトとして Vercel で公開します。設定（SPA のパスの書き換え、セキュリティヘッダー）は [vercel.json](./vercel.json) にあります。

1. [Vercel](https://vercel.com/) に GitHub アカウントでログインする
2. 「Add New… → Project」から `hibiburo/handball_analysis` を Import する
3. Framework Preset が「Vite」になっていることを確認し、そのまま Deploy する（Build Command: `npm run build`、Output Directory: `dist`）
4. 以後、ブランチへの push でプレビュー環境、`main` へのマージで本番環境が自動で公開される

公開後は、本番 URL で YouTube の動画が再生できること（CSP に妨げられていないこと）を確認してください。

## シーンを選手に共有する

分析画面で絞り込んだシーンは、「シーン」の見出しの横の **「共有用に書き出す（CSV）」** で、動画リンク付きの一覧として書き出せます。

1. 分析画面で、共有したいシーンに絞り込む（例: 結果「失点」、コース1）
2. 「共有用に書き出す（CSV）」を押して CSV をダウンロードする
3. CSV を Google Drive にアップロードし、Google スプレッドシートで開いて選手に共有する
4. 選手は「動画リンク」の列のリンクを押すと、そのシーンの少し前（前余白。既定は4秒前）から再生できる（スマホでは YouTube アプリで開く。終了位置では止まらない）

- 動画ファイルは作りません（YouTube の利用規約で、動画のダウンロード・切り出し保存が禁止されているため）。リンクは YouTube の再生位置を指定したものです
- 選手がリンクで見るには、YouTube の動画を **「公開」または「限定公開」** にしてください。「非公開」の動画は再生できません

## データについて

- 記録したデータは、利用している端末のブラウザにだけ保存され、外部には送信されません
- ブラウザのデータを消去すると復元できません。「データ管理・設定」から定期的に全データを書き出してください（最終バックアップから7日以上たつと GK一覧に警告が出ます）
- Safari は、7日間開かないサイトのデータを削除することがあります。iPad ではこまめに書き出してください

## CI

GitHub Actions（[.github/workflows/ci.yml](./.github/workflows/ci.yml)）で、push と Pull Request ごとに lint・型チェック・単体テスト・ビルド・E2E を実行します。
