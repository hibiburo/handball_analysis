# シーンの動画リンクの書き出し タスクリスト

- 作業ディレクトリ: `.steering/20261003-scene-link-csv/`
- 作成日: 2026-10-03
- ステータス: 承認済み（2026-10-03、利用者の「PR まで作成して」の指示により、PR のレビューで確認する）
- ブランチ: `feat/scene-link-csv`

## タスク

### 1. 実装

- [x] T1 `domain/youtube.ts`: `buildYouTubeWatchUrl` ＋ テスト
- [x] T2 `domain/transfer/exportCsv.ts`: `toCsv`・`buildSceneCsv`・`buildSceneCsvFileName` ＋ テスト
- [x] T3 `hooks/useDataTransfer.ts`: `downloadSceneCsv`
- [x] T4 `pages/AnalysisPage.tsx`: 「共有用に書き出す（CSV）」ボタン

### 2. テスト・ドキュメント

- [x] T5 E2E: 分析画面から CSV を書き出し、ファイル名・列・動画リンクを確認する
- [x] T6 `docs/functional-design.md`（4.4、5.5）、`docs/product-requirements.md`（8.10）、`README.md`

### 3. 品質チェック・PR

- [x] T7 lint・型チェック・単体テスト・E2E が成功する
- [x] T8 実際の YouTube で、リンクの形式ごとに直接開いて再生できるかを確認する（embed 形式はエラー 153 になることが分かり、視聴リンクに変更した）
- [ ] T9 Pull Request を作成し、CI が成功することを確認する
- [ ] 👤 T10 Pull Request をレビューしてマージする
- [ ] 👤 T11 書き出した CSV を Google Drive に入れ、選手のスマホでリンクが再生できることを確認する（YouTube の動画は「公開」か「限定公開」にする）

## 完了条件

- requirements.md の受け入れ条件 AC1〜AC7 をすべて満たす
