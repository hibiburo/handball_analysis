# シーンの MP4 書き出し タスクリスト

- 作業ディレクトリ: `.steering/20261003-scene-mp4-export/`
- 作成日: 2026-10-03
- ステータス: 承認済み（2026-10-03、利用者の「PR まで作成して」の指示により、PR のレビューで確認する）
- ブランチ: `feat/scene-mp4-export`

## タスク

### 1. ドメイン・基盤

- [x] T1 依存関係の追加（`@ffmpeg/ffmpeg`、`@ffmpeg/core`、`fflate`）、`vite.config.ts`、ESLint の `media/` の層ルール
- [x] T2 `domain/clips.ts`（`planClips`・`clipFileName`）＋ テスト
- [x] T3 `domain/transfer/exportCsv.ts`（`toCsv`・`buildClipIndexCsv`）＋ テスト
- [x] T4 `lib/zip.ts` ＋ テスト

### 2. 切り抜き・画面

- [x] T5 `media/ffmpegClipper.ts`（読み込み・WORKERFS・切り抜き・HEVC の判定・中止）
- [x] T6 `hooks/useMp4Export.ts`
- [x] T7 `components/analysis/Mp4ExportModal.tsx`、分析画面のボタン

### 3. テスト・ドキュメント・設定

- [x] T8 E2E: テスト用動画（`e2e/fixtures/sample.mp4`）で実際に書き出し、zip の中身を確認する
- [x] T9 `vercel.json` の CSP に `'wasm-unsafe-eval'`、CSP を付けた状態で書き出せることを確認する
- [x] T10 docs（functional-design.md・repository-structure.md・architecture.md・product-requirements.md）、README

### 4. 品質チェック・PR

- [x] T11 lint・型チェック・単体テスト・E2E が成功し、初回表示の JS が大きくなっていない
- [x] T12 大きめの動画ファイルで書き出し、MP4 の長さ・再生とメモリを確認する
- [ ] T13 Pull Request を作成し、CI が成功することを確認する
- [ ] 👤 T14 Pull Request をレビューしてマージする
- [ ] 👤 T15 実際の試合の元ファイル（または YouTube Studio からダウンロードしたファイル）で書き出し、Google Drive に入れて選手のスマホで再生できることを確認する

## 実施メモ

- 単体テスト208件（domain のカバレッジ 命令・関数・行100%、分岐99%）、E2E 10件（Chromium・WebKit）が成功。MP4 書き出しの E2E は、テスト用動画（`e2e/fixtures/sample.mp4`、40秒・468KB）から実際の ffmpeg.wasm で切り抜き、zip の中の MP4 2本（`ftyp`・長さ6.5〜8.5秒）と CSV を確認する（Chromium・WebKit とも約10秒）
- CSP: `vercel.json` の CSP をすべてのレスポンスに付けた状態で書き出しができ、CSP 違反なし
- 大きなファイル: 15分・1280×720・551MB の動画から、5分・10分・14分付近の3シーンを 0.4秒で書き出せた。メインスレッドの JS ヒープは最大 8MB（WORKERFS でファイル全体を読み込まない）。出力は H.264（avc1）＋AAC、長さ 7.2〜7.7秒、ffmpeg で最後までデコードしてエラーなし
- HEVC: `hev1` の HEVC 動画から書き出すと、出力は `hvc1` になる（iPhone で再生できる形）
- 初回表示の JS は gzip 176.35KB（変更前 176.04KB）。ffmpeg.wasm（wasm 32MB、gzip 10.4MB）は書き出すときだけ読み込まれる
- 実際の数GBのファイル・スマホでの再生は、利用者が確認する（T15）

## 完了条件

- requirements.md の受け入れ条件 AC1〜AC9 をすべて満たす
