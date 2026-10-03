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

## シーンを MP4 で書き出す（選手への共有）

分析画面で絞り込んだシーンを、元の動画ファイルから切り抜いた MP4 にして、zip でまとめてダウンロードできます。Google Drive に入れて選手に共有してください。

1. 分析画面で、共有したいシーンに絞り込む（例: 結果「失点」、コース1）
2. 「シーン」の見出しの横の **「MP4 で書き出す」** を押す
3. 試合ごとに「動画ファイルを選ぶ」で、その試合の **元の動画ファイル** を選ぶ
4. 「n件を書き出す」を押すと、各シーン（記録時刻の前余白〜後余白。既定は4秒前〜3秒後）の MP4 と、どのファイルがどのシーンかの一覧（`シーン一覧.csv`）が入った zip がダウンロードされる

- 選ぶファイルは、YouTube に上げた動画の **元のファイル**（撮影したもの）か、動画をアップロードしたアカウントの **YouTube Studio からダウンロードしたファイル**（「コンテンツ」→ 動画の「︙」→「ダウンロード」）にしてください。YouTube の動画を外部のツールやサイトでダウンロードすることは、YouTube の利用規約で禁止されています
- YouTube に上げる前に動画を編集（前後のカットなど）していると、時刻がずれて正しく切り抜けません
- 変換はこの端末のブラウザの中だけで行い、動画は外部に送信しません。初回のみ、変換用の部品（約10MB）を読み込みます
- 速く作るため再エンコードしないので、開始位置がキーフレームの分だけ（最大で数秒）早まることがあります
- PC（Mac の Chrome など）での利用を想定しています

## データについて

- 記録したデータは、利用している端末のブラウザにだけ保存され、外部には送信されません
- ブラウザのデータを消去すると復元できません。「データ管理・設定」から定期的に全データを書き出してください（最終バックアップから7日以上たつと GK一覧に警告が出ます）
- Safari は、7日間開かないサイトのデータを削除することがあります。iPad ではこまめに書き出してください

## CI

GitHub Actions（[.github/workflows/ci.yml](./.github/workflows/ci.yml)）で、push と Pull Request ごとに lint・型チェック・単体テスト・ビルド・E2E を実行します。
