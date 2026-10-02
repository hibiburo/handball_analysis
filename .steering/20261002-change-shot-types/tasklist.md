# シュート種別の変更 タスクリスト

- 作業ディレクトリ: `.steering/20261002-change-shot-types/`
- 作成日: 2026-10-02
- ステータス: 承認済み（2026-10-02、利用者の「PR まで作成して」の指示により、PR のレビューで確認する）
- ブランチ: `feat/shot-types`

## タスク

### 1. ドメイン・移行

- [x] T1 `domain/enums.ts`: 新しい5つの種別と `isShotType`
- [x] T2 `domain/schemas.ts`: `CURRENT_SCHEMA_VERSION` を 2 に
- [x] T3 `domain/transfer/migrations.ts`: 1 → 2 の変換
- [x] T4 `db/database.ts`: `version(2)` の移行
- [x] T5 `stores/analysisFilterStore.ts`: `persist` の移行
- [x] T6 `components/shot/ShotForm.tsx`: 種別の選択肢の列数

### 2. テスト

- [x] T7 既存テストのテストデータを新しい種別に
- [x] T8 移行のテスト（書き出しファイル・DB・絞り込み条件）、`isShotType` のテスト

### 3. 永続的ドキュメント

- [x] T9 `docs/glossary.md`（2.2、3.3）
- [x] T10 `docs/functional-design.md`（5.5、6.2、6.4）
- [x] T11 `docs/product-requirements.md`（8.4、US6）

### 4. 品質チェック・PR

- [x] T12 lint・型チェック・単体テスト・E2E が成功する
- [x] T13 ブラウザで、記録画面と分析画面の種別の表示を確認する
- [ ] T14 Pull Request を作成し、CI が成功することを確認する
- [ ] 👤 T15 Pull Request をレビューしてマージする

## 実施メモ

- 単体テスト185件（domain のカバレッジ 行100%・分岐99%）、E2E 8件（Chromium・WebKit）が成功
- ブラウザ（Chromium、1024×768）で、記録画面の「詳細」と分析画面の絞り込みに新しい5つの種別が表示され、記録・絞り込みができることを確認した
- 計画外の変更: 3列では「サイドシュート」「ミドルシュート」が2行に折り返したため、`components/ui/OptionButtonGroup.tsx` のボタンの左右の余白を `px-2` → `px-1` にした（他の選択肢にも適用されるが、44px のタップ領域は変わらない）

## 完了条件

- requirements.md の受け入れ条件 AC1〜AC8 をすべて満たす
