/**
 * 列挙値とその表示名（glossary.md 3章）。
 * コード値は保存データ・書き出しファイルに使うため、一度公開したら変更しない。
 */

/** シュート位置（glossary.md 3.1） */
export const shotZones = [
  'lw',
  'lb',
  'cb',
  'rb',
  'rw',
  'pivot_l',
  'pivot_c',
  'pivot_r',
  'seven_m',
  'fast_break',
  'long',
] as const;
export type ShotZone = (typeof shotZones)[number];

export const zoneLabels: Record<ShotZone, string> = {
  lw: 'レフトウイング',
  lb: 'レフトバック',
  cb: 'センター',
  rb: 'ライトバック',
  rw: 'ライトウイング',
  pivot_l: '6m左',
  pivot_c: '6m中央',
  pivot_r: '6m右',
  seven_m: '7mスロー',
  fast_break: '速攻',
  long: 'ロングシュート',
};

/** コート図の外に独立したボタンとして置くシュート位置（場所より状況を優先するもの。glossary.md 3.1） */
export const situationalZones = ['seven_m', 'fast_break', 'long'] as const satisfies readonly ShotZone[];

/** コース（glossary.md 3.2）。上段左から 1・2・3、中段 4・5・6、下段 7・8・9（シューターから見た向き） */
export const goalCells = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
export type GoalCell = (typeof goalCells)[number];

export const goalCellLabels: Record<GoalCell, string> = {
  1: 'コース1',
  2: 'コース2',
  3: 'コース3',
  4: 'コース4',
  5: 'コース5',
  6: 'コース6',
  7: 'コース7',
  8: 'コース8',
  9: 'コース9',
};

/** コースの位置の補足（ツールチップ・凡例用） */
export const goalCellPositionLabels: Record<GoalCell, string> = {
  1: '左上',
  2: '中央上',
  3: '右上',
  4: '左中段',
  5: '中央',
  6: '右中段',
  7: '左下',
  8: '中央下',
  9: '右下',
};

/** シュート種別（glossary.md 3.3）。どんな攻撃の形で打ったか */
export const shotTypes = ['side', 'middle', 'pivot', 'cut_in', 'fast_break'] as const;
export type ShotType = (typeof shotTypes)[number];

export const shotTypeLabels: Record<ShotType, string> = {
  side: 'サイドシュート',
  middle: 'ミドルシュート',
  pivot: 'ポスト',
  cut_in: 'カットイン',
  fast_break: '速攻',
};

/**
 * 現在のシュート種別の値か。
 * 古い種別（ジャンプ・ステップなど、書き出しファイルの schemaVersion 1 まで）を移行で取り除くために使う。
 */
export function isShotType(value: unknown): value is ShotType {
  return typeof value === 'string' && (shotTypes as readonly string[]).includes(value);
}

/** 結果（glossary.md 3.4） */
export const shotResults = ['goal', 'save', 'post', 'miss', 'blocked'] as const;
export type ShotResult = (typeof shotResults)[number];

export const shotResultLabels: Record<ShotResult, string> = {
  goal: '失点',
  save: 'セーブ',
  post: 'ポスト・バー',
  miss: '枠外',
  blocked: 'DFブロック',
};

/** 枠内シュートとみなす結果。セーブ率の分母になる（glossary.md 2.3） */
export const onTargetResults = ['goal', 'save'] as const satisfies readonly ShotResult[];

/** GKの対応（glossary.md 3.5） */
export const goalkeeperActions = ['hand', 'foot', 'body', 'none'] as const;
export type GoalkeeperAction = (typeof goalkeeperActions)[number];

export const goalkeeperActionLabels: Record<GoalkeeperAction, string> = {
  hand: '手',
  foot: '足',
  body: '体',
  none: '反応なし',
};

/** 利き手（glossary.md 3.6） */
export const handednesses = ['right', 'left', 'unknown'] as const;
export type Handedness = (typeof handednesses)[number];

export const handednessLabels: Record<Handedness, string> = {
  right: '右',
  left: '左',
  unknown: '不明',
};

/** ポジション（glossary.md 3.7）。表示は英語の略称 */
export const shooterPositions = ['LW', 'LB', 'CB', 'RB', 'RW', 'PV'] as const;
export type ShooterPosition = (typeof shooterPositions)[number];

export const shooterPositionLabels: Record<ShooterPosition, string> = {
  LW: 'LW',
  LB: 'LB',
  CB: 'CB',
  RB: 'RB',
  RW: 'RW',
  PV: 'PV',
};

/** 数的状況（glossary.md 3.8）。攻撃側から見た人数の状況 */
export const situations = ['even', 'power_play', 'short_handed'] as const;
export type Situation = (typeof situations)[number];

export const situationLabels: Record<Situation, string> = {
  even: '同数',
  power_play: '数的優位',
  short_handed: '数的不利',
};

/** 前後半 */
export const halves = [1, 2] as const;
export type Half = (typeof halves)[number];

export const halfLabels: Record<Half, string> = {
  1: '前半',
  2: '後半',
};

/** ラベルの Record から、画面の選択肢（value と label の組）を作る */
export function toOptions<T extends string | number>(
  values: readonly T[],
  labels: Record<T, string>,
): { value: T; label: string }[] {
  return values.map((value) => ({ value, label: labels[value] }));
}
