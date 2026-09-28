# 開発ガイドライン

- バージョン: 0.1（初版ドラフト）
- 作成日: 2026-09-28
- ステータス: 承認済み（2026-09-28）
- 前提: [architecture.md](./architecture.md)、[repository-structure.md](./repository-structure.md)（いずれも承認済み）

---

## 1. 基本方針

- **読みやすさを優先する**。短さや巧妙さより、あとで読む人（未来の自分・Claude）が意図を理解できることを重視する
- **ドメイン層を純粋に保つ**。業務ロジックは `src/domain/` に置き、React・Dexie・ブラウザAPIに依存させない（repository-structure.md 3章）
- **用語は glossary.md に合わせる**。コード上の名前・画面の表記・ドキュメントで同じ概念に別の言葉を使わない
- **言語の使い分け**

| 対象 | 言語 |
|---|---|
| 変数名・関数名・型名・ファイル名 | 英語 |
| コメント・JSDoc | 日本語 |
| テスト名（`describe` / `it`） | 日本語 |
| 画面の表示文言 | 日本語 |
| コミットメッセージの本文・PR | 日本語（接頭辞は英語） |

---

## 2. コーディング規約

### 2.1 TypeScript

- `tsconfig.json` は `strict: true` に加え、`noUncheckedIndexedAccess`、`exactOptionalPropertyTypes` を有効にする
- `any` は使用禁止。型が不明な外部データは `unknown` で受け取り、Zod で検証してから使う
- 型アサーション（`as`）は原則禁止。やむを得ない場合は理由をコメントに書く
- 列挙値は TypeScript の `enum` を使わず、`as const` の配列とそこから導いたユニオン型で表す

```ts
// src/domain/enums.ts
export const shotResults = ['goal', 'save', 'post', 'miss', 'blocked'] as const;
export type ShotResult = (typeof shotResults)[number];

export const shotResultLabels: Record<ShotResult, string> = {
  goal: '失点',
  save: 'セーブ',
  post: 'ポスト・バー',
  miss: '枠外',
  blocked: 'DFブロック',
};
```

- データの型は Zod スキーマから `z.infer` で導き、型とスキーマを二重に定義しない
- 関数の引数が3つ以上になる場合は、オブジェクト1つにまとめる
- 例外は「想定外の異常」にのみ使う。入力エラーなど想定内の失敗は戻り値で表す

```ts
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
```

- `null` と `undefined` の使い分け: 任意項目で「値がない」ことは `undefined`（プロパティを省略）で表す。`null` は `lastBackupAt` のように「まだ一度も行われていない」ことを明示する場合に限る

### 2.2 React

- 関数コンポーネントと Hooks のみを使う
- 1ファイル1コンポーネント。ファイル名とコンポーネント名を一致させる
- props の型は `type [コンポーネント名]Props = { ... }` として同じファイルに定義する
- `export default` は使わず、名前付き export にする（ただし `React.lazy` で読み込むページは `lazy(() => import(...).then(m => ({ default: m.AnalysisPage })))` で対応する）
- データの取得・保存は `hooks/` のフックを通して行い、コンポーネントから `db/` を直接 import しない
- 計算量の多い集計は `useMemo` でキャッシュする。それ以外で `useMemo` / `useCallback` を予防的に使わない
- `useEffect` は外部との同期（YouTube プレーヤー、イベントリスナーなど）にのみ使う。props から計算できる値を state に入れない
- `dangerouslySetInnerHTML` は使用禁止

### 2.3 状態管理（Zustand）

- ストアは責務ごとに分ける（`analysisFilterStore`、`shotFormStore`）。1つの巨大なストアにしない
- コンポーネントでは必要な値だけをセレクターで取り出す（`useStore((s) => s.filters)`）
- IndexedDB に保存するデータを Zustand に複製しない。保存データの参照は `useLiveQuery` を使う

### 2.4 コメント

- **何をしているか** ではなく **なぜそうしているか** を書く
- 公開する関数・型のうち、ドメイン層と Repository のものには JSDoc を書く
- 業務ルールに基づく処理には、根拠となるドキュメントの箇所を書く

```ts
/**
 * セーブ率を計算する。
 * ポスト・バー、枠外、DFブロックはGKが止めたわけではないため分母から除く（functional-design.md 5.3）。
 * 枠内シュートが0本の場合は undefined を返す。
 */
export function calcSaveRate(shots: readonly Shot[]): number | undefined { ... }
```

- 使わなくなったコードはコメントアウトで残さず削除する（履歴は Git にある）
- `TODO:` を書く場合は、対応する作業（.steering のディレクトリ名など）を添える

### 2.5 エラー処理

- 利用者に見せるエラーメッセージは日本語で、**何が起きたか** と **どうすればよいか** を書く（例: 「この動画は埋め込みが許可されていないため再生できません。別の動画のURLを登録してください。」）
- IndexedDB への保存失敗は必ずトーストで通知し、入力内容を失わない
- 画面全体の予期しないエラーは React の Error Boundary で受け止め、「データを書き出す」ボタン付きのエラー画面を表示する

---

## 3. 命名規則

| 対象 | 形式 | 例 |
|---|---|---|
| 変数・関数 | camelCase | `saveRate`, `calcSaveRate()` |
| 真偽値 | `is` / `has` / `can` / `should` で始める | `isPlaying`, `hasGoalCell` |
| イベントハンドラー（定義側） | `handle` + 対象 + 動作 | `handleResultSelect` |
| イベントハンドラー（props） | `on` + 対象 + 動作 | `onResultSelect` |
| 型・コンポーネント | PascalCase | `Shot`, `ShotForm` |
| 定数（設定値など不変の値） | UPPER_SNAKE_CASE | `DEFAULT_HIGHLIGHT_PRE_SECONDS` |
| 列挙値の配列 | 複数形の camelCase | `shotResults`, `shotZones` |
| 列挙値のコード値 | snake_case の英小文字（ポジションのみ大文字の略称） | `fast_break`, `power_play`, `LW` |
| フック | `use` + PascalCase | `useShots` |
| Zustand ストア | `use` + 名前 + `Store` | `useAnalysisFilterStore` |
| Repository の関数 | 動詞 + 対象 | `listByMatch`, `save`, `delete` |
| 集計関数 | `calc` / `count` / `build` + 対象 | `calcSaveRate`, `buildHeatmap` |

- 略語は一般的なもの（`id`, `url`, `csv`, `json`）以外は使わない
    - 「GK」はコード上では略さず `goalkeeper` / `Goalkeeper` と書く。画面の表示では「GK」を使う
- 業務用語の英語表記は glossary.md の対応表に従う

---

## 4. スタイリング規約

### 4.1 Tailwind CSS

- スタイルは Tailwind のユーティリティクラスで書く。独自の CSS ファイルは `src/index.css` のテーマ定義のみとする
- 色・余白・角丸などは `index.css` の `@theme` で定義したデザイントークンを使い、`#1a73e8` のような直接の色指定をしない
- 同じクラスの組み合わせが3か所以上で繰り返されたら、`components/ui/` の部品にする
- クラスの並び順は Prettier のプラグイン（prettier-plugin-tailwindcss）に任せる
- 条件付きのクラスは `clsx` でまとめる

### 4.2 テーマとダークモード

- 明るい表示を基本とし、端末の設定（`prefers-color-scheme`）に合わせてダーク表示に切り替える
- 色は意味で名前を付けたトークンとして定義し、明暗それぞれの値を持たせる

| トークン | 用途 |
|---|---|
| `background` / `surface` | 画面背景 / カード・パネルの背景 |
| `foreground` / `muted` | 本文 / 補足テキスト |
| `border` | 区切り線・枠線 |
| `primary` | 主要ボタン、選択中の状態 |
| `danger` | 削除、エラー |
| `result-goal` / `result-save` / `result-other` | 結果の色分け（失点・セーブ・その他） |
| `heat-0` 〜 `heat-5` | ヒートマップの濃淡（単色の6段階） |

- ヒートマップの配色は明暗どちらの表示でも区別できることを確認する。色だけに頼らず、必ず数値を併記する（functional-design.md 5.3）

### 4.3 レイアウトと操作性

- タブレット横向き（1024px〜）を基準に設計し、PC（1280px〜）で広がるようにする。スマートフォンは閲覧できれば可
- タップできる要素は最小 44×44px
- 押した状態・選択中の状態・無効の状態を、見た目で区別できるようにする
- キーボードで操作できるようにし、フォーカスリングを消さない
- ボタンやアイコンだけの要素には `aria-label` を付ける

---

## 5. テスト規約

### 5.1 何をテストするか

| 対象 | 必須度 | 内容 |
|---|---|---|
| `domain/` | 必須（カバレッジ90%以上） | 集計、検証（V1〜V7）、URL解析、書き出し/取り込み、CSV、移行処理 |
| `db/repositories/` | 必須 | CRUD、連動削除（functional-design.md 6.5）、取り込みのトランザクション |
| `components/` | 主要なもの | ShotForm（必須項目、結果による表示切り替え）、FilterPanel、GoalHeatmap |
| E2E | 主要な流れ | GK登録 → 試合登録 → 記録 → 分析 → 連続再生、書き出し → 取り込み |

### 5.2 書き方

- テスト名は日本語で、**条件** と **期待する結果** が分かるように書く

```ts
describe('calcSaveRate', () => {
  it('失点とセーブのシュートだけを分母にして計算する', () => { ... });
  it('枠内シュートが0本の場合は undefined を返す', () => { ... });
});
```

- 1つのテストでは1つの振る舞いだけを確認する
- テストデータは `src/test/factories.ts` のファクトリー関数で作り、テストに関係する項目だけを明示する

```ts
const shots = [buildShot({ result: 'goal' }), buildShot({ result: 'save' }), buildShot({ result: 'miss' })];
```

- 日時・ID に依存するテストは、値を固定する（Vitest のフェイクタイマー、ID 生成のモック）
- コンポーネントテストでは、実装の詳細ではなく利用者から見た振る舞い（表示・ロール・ラベル）で要素を探す（`getByRole` を優先）
- YouTube プレーヤーは `VideoPlayer` インターフェースのモックに差し替え、実際の YouTube には接続しない
- バグを修正するときは、先にそのバグを再現するテストを書く

---

## 6. Git 規約

### 6.1 ブランチ運用

- `main` は常に公開できる状態に保つ。**`main` に直接 push しない**
- 作業ごとにブランチを作り、Pull Request で `main` にマージする

| 種類 | ブランチ名 | 例 |
|---|---|---|
| 機能追加 | `feat/[内容]` | `feat/shot-form` |
| 不具合修正 | `fix/[内容]` | `fix/video-sync` |
| ドキュメント | `docs/[内容]` | `docs/glossary` |
| リファクタリング | `refactor/[内容]` | `refactor/stats-module` |
| 設定・依存関係など | `chore/[内容]` | `chore/update-deps` |

- ブランチ名は英小文字とハイフン。`.steering/` のディレクトリ名と揃えると追いやすい

### 6.2 コミットメッセージ

[Conventional Commits](https://www.conventionalcommits.org/ja/) の形式。接頭辞は英語、本文は日本語でよい。

```
<種類>(<範囲>): <要約>

<本文（任意）: なぜこの変更をしたか>
```

| 種類 | 用途 |
|---|---|
| `feat` | 機能追加 |
| `fix` | 不具合修正 |
| `docs` | ドキュメントのみの変更 |
| `style` | 動作に影響しない見た目・整形 |
| `refactor` | 動作を変えないコードの整理 |
| `test` | テストの追加・修正 |
| `perf` | 性能改善 |
| `chore` | ビルド・設定・依存関係など |

例:
```
feat(record): シュート記録フォームを追加
fix(analysis): 枠内シュート0本のコースでセーブ率がNaNになる不具合を修正
docs: 用語集にシュート種別を追加
```

- 範囲（`record`, `analysis`, `db`, `player` など）は任意
- 1つのコミットには1つの目的の変更だけを入れる

### 6.3 Pull Request

- タイトルはコミットメッセージと同じ形式
- 本文には「変更内容」「関連する .steering ディレクトリ」「確認方法」を書く。画面の変更はスクリーンショットを添える
- CI（lint・型チェック・単体テスト・ビルド・E2E）がすべて成功してから、**squash マージ** する
- マージ後はブランチを削除する

---

## 7. 品質チェック

コードを変更したら、コミット前に次を実行する（CLAUDE.md「コード変更後は必ずリント・型チェックを実施する」）。

```bash
npm run lint
npm run typecheck
npm run test
```

Pull Request を出す前には、加えて次を確認する。

```bash
npm run build
npm run test:e2e
```

### レビュー時の確認項目

- [ ] 用語が glossary.md と一致している
- [ ] 層の依存ルール（repository-structure.md 3章）を守っている
- [ ] 業務ロジックに単体テストがある
- [ ] 利用者の入力・取り込みデータを検証している
- [ ] エラー時に入力内容を失わない
- [ ] 明るい表示・ダーク表示の両方で見やすい
- [ ] タブレット横向きで操作できる（タップ領域 44px 以上）
- [ ] 関連するドキュメント（docs/, .steering/）を更新している
