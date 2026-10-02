# シュート種別の変更 設計

- 作業ディレクトリ: `.steering/20261002-change-shot-types/`
- 作成日: 2026-10-02
- ステータス: 承認済み（2026-10-02、利用者の「PR まで作成して」の指示により、PR のレビューで確認する）
- 前提: [requirements.md](./requirements.md)（承認済み）

---

## 1. 新しい列挙値

| コード値 | 表示名 | 定義 |
|---|---|---|
| `side` | サイドシュート | ウイングの位置・角度のない所から打つシュート |
| `middle` | ミドルシュート | 9m付近（バックの位置）から打つ、ディフェンスの外からのシュート |
| `pivot` | ポスト | ポスト（ピヴォ）プレーヤーが6mライン際で受けて打つシュート |
| `cut_in` | カットイン | ディフェンスの間に切り込んで、6mライン付近で打つシュート |
| `fast_break` | 速攻 | 速攻（カウンター・ブレイクスルー）からのシュート |

- コード値は既存の命名規則（英小文字の snake_case）に合わせる。`fast_break` はシュート位置（`zone`）の値と同じ文字列だが、項目が違うため衝突しない
- 古いコード値（`jump`・`step`・`running`・`diving`・`lob`・`bounce`・`spin`・`other`）は新しい値と重ならないため、「新しい値に含まれない値」を古い値として判定して消せる

## 2. 移行（記録済みのデータ・書き出しファイル・保存済みの絞り込み条件）

### 2.1 IndexedDB（記録済みのシュート）

`src/db/database.ts` に `version(2)` を追加し、`upgrade()` でシュートを走査して、`shotType` が新しい値に含まれないものからプロパティを削除する。ストア・インデックスの定義は変えない。

```ts
this.version(2)
  .stores({ ...version 1 と同じ })
  .upgrade((tx) =>
    tx.table('shots').toCollection().modify((shot) => {
      if (shot.shotType !== undefined && !isShotType(shot.shotType)) delete shot.shotType;
    }),
  );
```

Dexie はアプリを開いたとき（DB を開いたとき）に1回だけ移行を実行する。

### 2.2 書き出しファイル

- `CURRENT_SCHEMA_VERSION` を 1 → 2 に上げる
- `domain/transfer/migrations.ts` に「1 → 2」の変換を追加する: 各シュートの `shotType` が新しい値に含まれなければ削除する
- 取り込み時、バージョン1のファイルは変換してからスキーマで検証する。バージョン3以上は従来どおり「新しいバージョン」として拒否する

### 2.3 保存済みの絞り込み条件（localStorage）

`stores/analysisFilterStore.ts` の `persist` の `version` を 1 → 2 に上げ、`migrate` で各 GK の `criteria.shotTypes` から新しい値に含まれない値を取り除く（他の条件はそのまま残す）。

### 2.4 共通の判定関数

古い値かどうかの判定は3か所で使うため、`domain/enums.ts` に `isShotType(value: unknown): value is ShotType` を追加して共有する。

## 3. 変更するファイル

| ファイル | 変更 |
|---|---|
| `src/domain/enums.ts` | `shotTypes`・`shotTypeLabels` を新しい5つに。`isShotType` を追加 |
| `src/domain/schemas.ts` | `CURRENT_SCHEMA_VERSION` を 2 に |
| `src/domain/transfer/migrations.ts` | 1 → 2 の変換 |
| `src/db/database.ts` | `version(2)` と `upgrade()` |
| `src/stores/analysisFilterStore.ts` | `persist` の `version: 2` と `migrate` |
| `src/components/shot/ShotForm.tsx` | 種別の選択肢の列数を5つに合わせる（4列 → 3列） |
| 画面（ShotList・SceneList・HighlightPlayerModal・FilterPanel） | 変更なし（`shotTypes`・`shotTypeLabels` を参照しているため自動で反映） |

### テスト

| ファイル | 変更 |
|---|---|
| `src/domain/validation.test.ts`、`stats/filter.test.ts`、`stats/heatmap.test.ts` | テストデータの `jump`・`step` などを新しい値に |
| `src/domain/transfer/transfer.test.ts` | バージョン1のファイルの古い種別が消えること、`schemaVersion: 2` で書き出されること、新しいバージョンの拒否の例を 2 → 3 に |
| `src/domain/enums.test.ts` | `isShotType` のテスト |
| `src/db/repositories/repositories.test.ts`（または新規） | バージョン1の DB に古い種別のシュートを入れて開き直すと、種別だけが消えること |
| `src/stores/stores.test.ts` | 古い種別を含む保存済みの条件が移行で取り除かれること |
| `src/domain/glossary.test.ts` | 変更なし（glossary.md と enums.ts の一致を検査する） |

### 永続的ドキュメント

| ファイル | 変更 |
|---|---|
| `docs/glossary.md` | 2.2 のシュート種別の定義（「打ち方」→「攻撃の形」）、3.3 の表 |
| `docs/functional-design.md` | 6.2 の列挙値、5.5 の書き出しファイルの例（`schemaVersion: 2`）、6.4 の DB バージョン |
| `docs/product-requirements.md` | 8.4 のシュート種別の一覧、US6 の例（「ジャンプシュート」→「カットイン」） |

## 4. 影響範囲

| 対象 | 影響 |
|---|---|
| 記録済みのシュート | 種別だけが未入力になる（他の項目は変わらない） |
| 古い書き出しファイル（v1） | 取り込める（種別は未入力になる） |
| 新しい書き出しファイル（v2） | 変更前のアプリでは「新しいバージョン」として取り込めない（利用者は1人のため問題なし） |
| 分析画面の絞り込み条件 | 古い種別の条件だけが消える |
