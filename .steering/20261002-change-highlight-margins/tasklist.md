# シーン再生の余白の既定値変更 タスクリスト

- 作業ディレクトリ: `.steering/20261002-change-highlight-margins/`
- 作成日: 2026-10-02
- ステータス: 承認済み（2026-10-02）
- 前提: [requirements.md](./requirements.md)、[design.md](./design.md)（いずれも承認済み）
- ブランチ: `feat/highlight-margins`

## タスク

### 1. コードとテスト

- [x] T1 `src/domain/schemas.ts` の `defaultSettings` を前余白4・後余白3に変更する
- [x] T2 `src/db/repositories/repositories.test.ts` の既定値の期待値を 4・3 に変更する
- [x] T3 `e2e/record-and-analyze.spec.ts` のシーン再生の確認を、開始 = 記録時刻 − 4秒・長さ7秒に変更する

### 2. 永続的ドキュメント

- [x] T4 `docs/product-requirements.md`（US4・US7 の受け入れ条件、8.5）
- [x] T5 `docs/functional-design.md`（5.4、6.3）
- [x] T6 `docs/glossary.md`（4章 前余白・後余白）
- [x] T7 `docs/architecture.md`（3.1）

### 3. 品質チェック

- [x] T8 `npm run lint`・`npm run typecheck`・`npm run test` が成功する
- [x] T9 `npm run test:e2e`（Chromium・WebKit）が成功する
- [x] T10 ブラウザで、設定を保存していない状態の設定画面の初期値が 4・3 であることを確認する（AC3）

### 4. Pull Request

- [x] T11 ブランチを push して Pull Request を作成し、CI が成功することを確認する（AC6）
- [ ] 👤 T12 Pull Request をレビューしてマージする
- [ ] 👤 T13 お使いのブラウザで、設定画面の前余白・後余白を 4・3 に変更する（保存済みの設定は自動で変わらないため）

## 完了条件

- requirements.md の受け入れ条件 AC1〜AC6 をすべて満たす
