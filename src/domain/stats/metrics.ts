import type { Shot } from '../types';

export type Metrics = {
  /** 結果を問わない全シュートの数 */
  shotCount: number;
  /** 枠内シュート（失点・セーブ）の数 */
  onTargetCount: number;
  goalCount: number;
  saveCount: number;
  /** セーブ数 ÷ 枠内シュート数。枠内0本なら undefined */
  saveRate: number | undefined;
  /** 失点数 ÷ 枠内シュート数。枠内0本なら undefined */
  goalRate: number | undefined;
};

/**
 * シュートの指標を計算する。
 * ポスト・バー、枠外、DFブロックはGKが止めたわけではないため、セーブ率・失点率の分母から除く（functional-design.md 5.3）。
 */
export function calcMetrics(shots: readonly Pick<Shot, 'result'>[]): Metrics {
  let goalCount = 0;
  let saveCount = 0;
  for (const shot of shots) {
    if (shot.result === 'goal') goalCount++;
    else if (shot.result === 'save') saveCount++;
  }
  const onTargetCount = goalCount + saveCount;
  return {
    shotCount: shots.length,
    onTargetCount,
    goalCount,
    saveCount,
    saveRate: onTargetCount > 0 ? saveCount / onTargetCount : undefined,
    goalRate: onTargetCount > 0 ? goalCount / onTargetCount : undefined,
  };
}

/** 割合（0〜1）を「31%」のような整数の % 表示にする。値がなければ「−」（glossary.md 1章） */
export function formatRate(rate: number | undefined): string {
  return rate === undefined ? '−' : `${Math.round(rate * 100)}%`;
}
