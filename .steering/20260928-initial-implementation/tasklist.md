# 初回実装 タスクリスト

- 作業ディレクトリ: `.steering/20260928-initial-implementation/`
- 作成日: 2026-09-28
- ステータス: 承認済み（2026-09-28）
- 前提: [requirements.md](./requirements.md)、[design.md](./design.md)（いずれも承認済み）

## 進め方

- タスクは上から順に進める。完了したら `[ ]` を `[x]` にする
- 各フェーズの最後に **フェーズの完了条件** を確認してから次へ進む
- コードを変更したら `npm run lint` と `npm run typecheck` を実行する（development-guidelines.md 7章）
- フェーズごとにコミットを分け、Conventional Commits の形式で書く
- 👤 が付いたタスクは利用者の操作・確認が必要なもの

## 進捗

| フェーズ | 状態 |
|---|---|
| 1 開発基盤 | 完了（TypeScript は 6.0 を採用。T1.1.4 参照） |
| 2 ドメイン・保存層 | 完了（テスト143件、domain カバレッジ 行100%・分岐99%） |
| 3 GK・試合・記録 | 未着手 |
| 4 分析 | 未着手 |
| 5 書き出し・取り込み、データ保護 | 未着手 |
| 6 E2E・CI・仕上げ | 未着手 |

---

## フェーズ1: 開発基盤

### 1.1 プロジェクト作成

- [x] T1.1.1 Vite の React + TypeScript テンプレートでプロジェクトを作成し、既存の docs/・.steering/・CLAUDE.md と共存させる
- [x] T1.1.2 依存関係を追加する（react-router、dexie、dexie-react-hooks、zustand、zod、clsx、@types/youtube）
- [x] T1.1.3 `tsconfig.json` に `strict`、`noUncheckedIndexedAccess`、`exactOptionalPropertyTypes`、パスエイリアス `@/` を設定する（vite.config.ts にも反映）
- [x] T1.1.4 TypeScript 7・Vite 8 と各プラグインの相性を確認する。問題があれば1つ前のメジャーバージョンに下げ、architecture.md の更新を提案する → typescript-eslint が TS 7 未対応のため TS 6.0 を採用し、architecture.md を更新
- [x] T1.1.5 `.gitignore` に `dist/`、`coverage/`、`playwright-report/`、`test-results/` を追加する

### 1.2 ツール設定

- [x] T1.2.1 Tailwind CSS 4 を導入し、`src/index.css` にデザイントークン（development-guidelines.md 4.2）を明暗それぞれ定義する
- [x] T1.2.2 ESLint を設定する（typescript-eslint、react-hooks、`dangerouslySetInnerHTML` の禁止、層の依存ルール repository-structure.md 3章）
- [x] T1.2.3 Prettier と prettier-plugin-tailwindcss を設定する
- [x] T1.2.4 Vitest を設定する（jsdom、Testing Library、fake-indexeddb、`src/test/setup.ts`、カバレッジ）
- [x] T1.2.5 Playwright を設定する（chromium・webkit、1024×768、`npm run preview` を起動して実行）
- [x] T1.2.6 npm スクリプトを architecture.md 6.1 のとおりに定義する

### 1.3 骨組み

- [x] T1.3.1 `components/ui/`（Button、Modal、Toast、ConfirmDialog、OptionButtonGroup）を作る
- [x] T1.3.2 `Layout` とルーティング（architecture.md 2.4 の5パス＋NotFound）を作り、各ページは仮の見出しだけ表示する
- [x] T1.3.3 分析画面・設定画面を `React.lazy` で遅延読み込みにする
- [x] T1.3.4 Error Boundary を作る（エラー画面に「データを書き出す」ボタンを置く。ボタンの処理はフェーズ5でつなぐ）

**フェーズ1の完了条件**
- [x] 空の5画面を行き来できる
- [x] `npm run lint`、`typecheck`、`test`、`build` が通る
- [x] 明るい表示・ダーク表示でレイアウトの背景と文字色が切り替わる

---

## フェーズ2: ドメイン・保存層

### 2.1 ドメイン層

- [x] T2.1.1 `domain/enums.ts`: 列挙値と表示名（glossary.md 3章と一字一句一致させる）
- [x] T2.1.2 `domain/schemas.ts` と `domain/types.ts`: Zod スキーマと型
- [x] T2.1.3 `domain/validation.ts`: V1〜V7 と、結果ごとのコース・GK対応の必須/可否 ＋ テスト
- [x] T2.1.4 `domain/youtube.ts`: URL 解析 ＋ テスト
- [x] T2.1.5 `domain/stats/metrics.ts` ＋ テスト
- [x] T2.1.6 `domain/stats/filter.ts` ＋ テスト
- [x] T2.1.7 `domain/stats/heatmap.ts` ＋ テスト
- [x] T2.1.8 集計の性能テスト（1万件で `applyFilter` + `buildGoalHeatmap` が 100ms 以内）
- [x] T2.1.9 `domain/transfer/`（exportJson、importJson、migrations）＋ テスト
- [x] T2.1.10 `lib/`（id、time、download）＋ テスト
- [x] T2.1.11 `src/test/factories.ts`（buildGoalkeeper、buildMatch、buildShot）

### 2.2 データ保存層

- [x] T2.2.1 `db/database.ts`: Dexie の定義（design.md 2.2）
- [x] T2.2.2 `goalkeeperRepository` ＋ テスト（連動削除を含む）
- [x] T2.2.3 `matchRepository` ＋ テスト（紐づけの差分更新、担当シュートがあるGKの解除拒否、連動削除）
- [x] T2.2.4 `shotRepository` ＋ テスト（`restore` を含む）
- [x] T2.2.5 `settingsRepository` ＋ テスト（未保存時の既定値）
- [x] T2.2.6 `dataTransferService` ＋ テスト（書き出し3種、取り込みのプレビュー、上書き/スキップ、途中失敗時のロールバック）

### 2.3 フックとストア

- [x] T2.3.1 `hooks/useGoalkeepers`、`useMatches`、`useShots`、`useSettings`（`useLiveQuery`）
- [x] T2.3.2 `stores/analysisFilterStore`、`stores/shotFormStore`（`persist` で localStorage に保存）

**フェーズ2の完了条件**
- [x] すべての単体テストが通る
- [x] `domain/` のカバレッジが 90% 以上

**design.md からの変更点（実装時の判断）**
- `applyFilter(shots, criteria)` は試合の情報を使わないため、引数から `matches` を外した
- 設定の既定値 `defaultSettings` を `domain/schemas.ts` に置いた
- 書き出し・取り込みの操作用に `hooks/useDataTransfer.ts` を、テスト用DBの作成に `src/test/db.ts` を追加した
- `Result` 型を `lib/result.ts` に置いた（ドメイン層と Repository の両方で使うため）
- Repository は `goalkeeperRepository(db)` のようにDBを受け取る関数とし、フックでは `appDb` を渡したものを使う

---

## フェーズ3: GK・試合・記録

### 3.1 プレーヤー制御

- [ ] T3.1.1 `player/types.ts`（VideoPlayer インターフェース）
- [ ] T3.1.2 `player/loadYouTubeApi.ts`（読み込みを1回に限る）
- [ ] T3.1.3 `player/youTubePlayer.ts`（エラーコードの対応づけ、nocookie ホスト、playerVars）
- [ ] T3.1.4 E2E 用のプレーヤー差し替え（`window.__E2E_VIDEO_PLAYER__`）と `src/test/mockVideoPlayer.ts`
- [ ] T3.1.5 `hooks/useVideoPlayer`（状態、現在時刻の 250ms ごとの更新、準備完了の判定）
- [ ] T3.1.6 `components/video/YouTubePlayer`、`PlayerControls`（±2秒・±5秒、速度 0.25x〜2x）

### 3.2 GK・試合の管理

- [ ] T3.2.1 M1 `GoalkeeperForm`（登録・編集、検証エラーの表示）
- [ ] T3.2.2 SC1 `GoalkeeperListPage`（チーム別グループ、検索、試合数・シュート数、GK追加）
- [ ] T3.2.3 M2 `MatchForm`（URL 解析、プレーヤーでの埋め込み可否の確認、GKの紐づけ）
- [ ] T3.2.4 SC2 `GoalkeeperDetailPage`（GK情報、合計指標、試合一覧、試合の追加・編集・削除、GKの編集・削除）
- [ ] T3.2.5 削除時の確認ダイアログ（連動して消える件数を表示）

### 3.3 記録画面

- [ ] T3.3.1 `components/court/CourtZoneShape`、`CourtZonePicker`（コート図＋7mスロー・速攻・ロングシュートのボタン）
- [ ] T3.3.2 `components/court/GoalGrid`、`GoalCellPicker`
- [ ] T3.3.3 `components/shot/ShotForm`（必須項目、結果による切り替え、詳細欄の折りたたみ、担当GK・前後半の保持、「記録する（時刻）」ボタン）＋ コンポーネントテスト
- [ ] T3.3.4 保存後の処理（フォームのリセット、取り消しトースト5秒、設定に応じた自動再開）
- [ ] T3.3.5 `components/shot/ShotList`（時系列、タップで3秒前にシーク、編集・削除）
- [ ] T3.3.6 編集モード（「更新する」、±0.5秒、「現在の再生位置で上書き」）
- [ ] T3.3.7 SC3 `RecordPage`（レイアウト、`?shot=` での編集状態、プレーヤーのエラー表示と「URLを変更」）

### 3.4 実動画での確認

- [ ] 👤 T3.4.1 埋め込みが許可された公開の試合動画のURLを用意する
- [ ] T3.4.2 PC の Chrome で、試合登録 → シュート10本の記録 → 編集・削除・取り消しを確認する
- [ ] 👤 T3.4.3 iPad の Safari で、再生・一時停止・記録・シーンへのジャンプを確認する（開発サーバーを同じネットワークで公開して確認）
- [ ] T3.4.4 埋め込み不可の動画・存在しない動画のURLで、試合登録時にエラーが表示されることを確認する

**フェーズ3の完了条件**
- [ ] 実際の YouTube 動画で1試合分（目安50本）を記録できる
- [ ] 5タップで1本を記録でき、記録後に再生が再開する（AC2）
- [ ] 結果に応じて入力欄が切り替わる（AC3）、取り消しができる（AC4）

---

## フェーズ4: 分析

- [ ] T4.1 `components/court/GoalHeatmap`（指標の切り替え、6段階の配色、参考値の斜線、枠内0本は「−」、セルのタップ）＋ コンポーネントテスト
- [ ] T4.2 `components/analysis/FilterPanel`（全項目、試合の除外、クリア）＋ コンポーネントテスト
- [ ] T4.3 `components/analysis/SceneList`（試合日 → 動画時刻の順、シーン情報の表示）
- [ ] T4.4 M3 `HighlightPlayerModal`（1シーン再生: 前3秒〜後2秒、「もう一度」「閉じる」）
- [ ] T4.5 SC4 `AnalysisPage`（3列レイアウト、対象の試合数・本数、ヒートマップのセルで絞り込み、条件の復元）
- [ ] T4.6 SC2・SC3 から分析画面への導線、「シーンを編集」から記録画面への遷移
- [ ] T4.7 500本のテストデータで、絞り込みの変更からヒートマップの更新まで1秒以内であることを確認する（QC7）

**フェーズ4の完了条件**
- [ ] AC5・AC6・AC7 を満たす
- [ ] フェーズ3で記録した実データで、弱点のコースを確認できる

---

## フェーズ5: 書き出し・取り込み、データ保護

- [ ] T5.1 SC5 `SettingsPage`: 全データの書き出し（`lastBackupAt` の更新）
- [ ] T5.2 SC5: 取り込み（ファイル選択 → 検証 → 件数・重複件数のプレビュー → 上書き/スキップ → 実行 → 完了メッセージ）。20MB を超えるファイルは拒否
- [ ] T5.3 SC2: GK単位・試合単位の書き出しメニュー
- [ ] T5.4 SC5: 設定値の編集（前余白・後余白、記録後の自動再開、参考値の閾値）
- [ ] T5.5 SC5: 保存容量の表示（`navigator.storage.estimate()`）
- [ ] T5.6 `BackupReminder`（7日以上で警告、「今すぐ書き出す」）を SC1 に表示
- [ ] T5.7 起動時に `navigator.storage.persist()` を要求し、結果を設定画面に表示する
- [ ] T5.8 Error Boundary の「データを書き出す」ボタンをつなぐ

**フェーズ5の完了条件**
- [ ] AC8・AC9・AC10 を満たす

---

## フェーズ6: E2E・CI・仕上げ

### 6.1 E2E テスト

- [ ] T6.1.1 `e2e/mocks/` に YouTube プレーヤーのモック（`addInitScript` で注入）
- [ ] T6.1.2 `e2e/record-and-analyze.spec.ts`
- [ ] T6.1.3 `e2e/export-import.spec.ts`
- [ ] T6.1.4 Chromium と WebKit の両方で通ることを確認する

### 6.2 CI・公開の設定

- [ ] T6.2.1 `.github/workflows/ci.yml`（check ジョブ、e2e ジョブ、失敗時のレポート保存）
- [ ] T6.2.2 `.github/dependabot.yml`（npm、GitHub Actions）
- [ ] T6.2.3 `vercel.json`（rewrites、CSP、セキュリティヘッダー）
- [ ] T6.2.4 `npm run preview` で CSP により YouTube の埋め込みが妨げられないことを確認し、必要なら CSP を調整する（architecture.md 4章も更新）
- [ ] T6.2.5 README（概要、開発の始め方、npm スクリプト、Vercel 連携の手順）
- [ ] T6.2.6 GitHub にブランチを push し、CI が成功することを確認する

### 6.3 仕上げ

- [ ] T6.3.1 1024×768 と 1280×800 で全画面の表示・操作を確認する（QC5）
- [ ] T6.3.2 明るい表示・ダーク表示で全画面を確認する（QC6）
- [ ] T6.3.3 画面の表示名が glossary.md と一致しているか確認する（AC11）
- [ ] T6.3.4 タップ領域 44px 以上、`aria-label`、フォーカスリングを確認する
- [ ] T6.3.5 requirements.md 4章の受け入れ条件（AC1〜AC11、QC1〜QC7）をすべて確認し、結果を本書の末尾に記録する
- [ ] T6.3.6 実装中に docs/ と食い違いが生じた箇所があれば、docs/ の更新を提案する

### 6.4 利用者の作業

- [ ] 👤 T6.4.1 GitHub に main ブランチを作り、既定ブランチにする
- [ ] 👤 T6.4.2 初回実装の Pull Request をレビューしてマージする
- [ ] 👤 T6.4.3 README の手順で Vercel と GitHub を連携し、本番URLを確認する
- [ ] 👤 T6.4.4 main のブランチ保護（CI 成功を必須）を設定する

**フェーズ6の完了条件**
- [ ] requirements.md 4章の受け入れ条件をすべて満たす
- [ ] CI が成功している

---

## 受け入れ確認の記録

（T6.3.5 で記入する）

| 条件 | 結果 | 備考 |
|---|---|---|
| AC1〜AC11 | | |
| QC1〜QC7 | | |
