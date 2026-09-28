import { goalCells, type GoalCell } from '../enums';
import type { Shot } from '../types';
import { calcMetrics, type Metrics } from './metrics';

export type HeatmapCell = Metrics & {
  /** 枠内シュート数が閾値未満で、割合の信頼性が低い（参考値） */
  isLowSample: boolean;
};

export type HeatmapMetric = 'saveRate' | 'goalRate' | 'shotCount';

/** ヒートマップの色の段階数（heat-0〜heat-5） */
export const HEAT_LEVEL_COUNT = 6;

/**
 * ゴール9分割のコースごとに指標を集計する（functional-design.md 5.3）。
 * コースが記録されていないシュート（枠外・DFブロックなど）は含めない。
 */
export function buildGoalHeatmap(
  shots: readonly Shot[],
  lowSampleThreshold: number,
): Record<GoalCell, HeatmapCell> {
  const byCell = new Map<GoalCell, Shot[]>(goalCells.map((cell) => [cell, []]));
  for (const shot of shots) {
    if (shot.goalCell !== undefined) byCell.get(shot.goalCell)?.push(shot);
  }

  const heatmap = {} as Record<GoalCell, HeatmapCell>; // 直後のループで9コースすべてを埋める
  for (const cell of goalCells) {
    const metrics = calcMetrics(byCell.get(cell) ?? []);
    heatmap[cell] = { ...metrics, isLowSample: metrics.onTargetCount < lowSampleThreshold };
  }
  return heatmap;
}

/**
 * セルの色の段階（0〜5）を返す。値がない（枠内0本）場合は undefined。
 * 割合は 0〜1 を6等分し、本数は全セルの最大値を基準に6等分する。
 */
export function heatLevel(
  cell: HeatmapCell,
  metric: HeatmapMetric,
  maxShotCount: number,
): number | undefined {
  let ratio: number | undefined;
  if (metric === 'shotCount') {
    ratio = maxShotCount > 0 ? cell.shotCount / maxShotCount : 0;
  } else {
    ratio = cell[metric];
  }
  if (ratio === undefined) return undefined;
  return Math.min(HEAT_LEVEL_COUNT - 1, Math.floor(ratio * HEAT_LEVEL_COUNT));
}
