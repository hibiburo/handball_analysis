# シーン一覧の Excel 書き出し タスクリスト

- 作業ディレクトリ: `.steering/20261003-scene-excel-export/`
- 作成日: 2026-10-03
- ステータス: 承認済み（2026-10-03、利用者の「PR まで作成して」の指示により、PR のレビューで確認する）
- ブランチ: `feat/scene-excel`

## タスク

- [x] T1 依存関係の追加（`write-excel-file`、開発用 `fflate`）
- [x] T2 `domain/sceneSheet.ts`（`buildSceneSheetRows`・`buildSceneSheetFileName`）＋ テスト
- [x] T3 `lib/download.ts` に `downloadBlob` ＋ テスト
- [x] T4 `hooks/useDataTransfer.ts` に `downloadSceneExcel`、分析画面に「Excel で書き出す」ボタン
- [x] T5 E2E: 分析画面から .xlsx を書き出し、展開して見出し・行・時間を確認する
- [x] T6 docs（functional-design.md・architecture.md・repository-structure.md・product-requirements.md）、README
- [x] T7 lint・型チェック・単体テスト・E2E が成功し、初回表示の JS が大きくなっていない
- [x] T8 Pull Request を作成し、CI が成功することを確認する
- [x] 👤 T9 Pull Request をレビューしてマージする
- [ ] 👤 T10 書き出したファイルを Excel で開き、見出しの固定・時間の表示を確認する

## 実施メモ

- 単体テスト192件（domain のカバレッジ 命令・関数・行100%、分岐99%）、E2E 8件（Chromium・WebKit）が成功。E2E では書き出した .xlsx を展開し、見出しの3列と、動画開始時間〜終了時間が7秒（既定の前余白4秒・後余白3秒）であることを確認する
- 同じ設定で作った .xlsx の中身を確認: 見出しの行の固定（`<pane ySplit="1" … state="frozen"/>`）、列の幅（16・14・14）、シート名「シーン」、時間は文字列のセル（`t="s"`）
- 初回表示の JS は gzip 176.64KB（変更前 176.04KB）。`write-excel-file`（gzip 19.7KB）は書き出すときだけ読み込まれる
- Excel で実際に開いての確認は利用者が行う（T10）

## 完了条件

- requirements.md の受け入れ条件 AC1〜AC8 をすべて満たす
