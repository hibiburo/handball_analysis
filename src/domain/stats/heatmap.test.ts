import { describe, expect, it } from 'vitest';
import { goalCells, shotResults, shotZones, type GoalCell } from '@/domain/enums';
import type { Shot } from '@/domain/types';
import { buildShot } from '@/test/factories';
import { applyFilter, emptyFilterCriteria } from './filter';
import { buildGoalHeatmap, heatLevel, type HeatmapCell } from './heatmap';

describe('buildGoalHeatmap', () => {
  it('9コースすべての集計を返す', () => {
    const heatmap = buildGoalHeatmap([], 3);
    expect(Object.keys(heatmap).map(Number)).toEqual([...goalCells]);
    expect(heatmap[5]).toMatchObject({ shotCount: 0, onTargetCount: 0, saveRate: undefined, isLowSample: true });
  });

  it('コースごとにシュート数・失点数・セーブ率を集計する', () => {
    const shots = [
      buildShot({ goalCell: 1, result: 'goal' }),
      buildShot({ goalCell: 1, result: 'goal' }),
      buildShot({ goalCell: 1, result: 'save' }),
      buildShot({ goalCell: 9, result: 'save' }),
    ];
    const heatmap = buildGoalHeatmap(shots, 3);
    expect(heatmap[1]).toMatchObject({ shotCount: 3, goalCount: 2, saveCount: 1, isLowSample: false });
    expect(heatmap[1].goalRate).toBeCloseTo(2 / 3);
    expect(heatmap[9]).toMatchObject({ shotCount: 1, saveRate: 1, isLowSample: true });
  });

  it('コースが記録されていないシュートは含めない', () => {
    const heatmap = buildGoalHeatmap([buildShot({ result: 'miss' }), buildShot({ result: 'post' })], 3);
    const total = goalCells.reduce((sum, cell) => sum + heatmap[cell].shotCount, 0);
    expect(total).toBe(0);
  });

  it('ポスト・バーのコースは本数に数えるが、枠内シュートには数えない', () => {
    const heatmap = buildGoalHeatmap([buildShot({ result: 'post', goalCell: 3 })], 1);
    expect(heatmap[3]).toMatchObject({ shotCount: 1, onTargetCount: 0, saveRate: undefined, isLowSample: true });
  });

  it('枠内シュート数が閾値ちょうどなら参考値にしない', () => {
    const shots = [1, 2, 3].map(() => buildShot({ goalCell: 4, result: 'save' }));
    expect(buildGoalHeatmap(shots, 3)[4].isLowSample).toBe(false);
    expect(buildGoalHeatmap(shots, 4)[4].isLowSample).toBe(true);
  });
});

describe('heatLevel', () => {
  const cell = (overrides: Partial<HeatmapCell>): HeatmapCell => ({
    shotCount: 10,
    onTargetCount: 10,
    goalCount: 5,
    saveCount: 5,
    saveRate: 0.5,
    goalRate: 0.5,
    isLowSample: false,
    ...overrides,
  });

  it('割合を6段階に分ける', () => {
    expect(heatLevel(cell({ goalRate: 0 }), 'goalRate', 10)).toBe(0);
    expect(heatLevel(cell({ goalRate: 0.5 }), 'goalRate', 10)).toBe(3);
    expect(heatLevel(cell({ goalRate: 0.99 }), 'goalRate', 10)).toBe(5);
    expect(heatLevel(cell({ goalRate: 1 }), 'goalRate', 10)).toBe(5);
    expect(heatLevel(cell({ saveRate: 0.2 }), 'saveRate', 10)).toBe(1);
  });

  it('値がない（枠内0本）場合は undefined', () => {
    expect(heatLevel(cell({ saveRate: undefined }), 'saveRate', 10)).toBeUndefined();
  });

  it('本数は全セルの最大値を基準に分ける', () => {
    expect(heatLevel(cell({ shotCount: 10 }), 'shotCount', 10)).toBe(5);
    expect(heatLevel(cell({ shotCount: 5 }), 'shotCount', 10)).toBe(3);
    expect(heatLevel(cell({ shotCount: 0 }), 'shotCount', 0)).toBe(0);
  });
});

describe('集計の性能', () => {
  it('1万件の絞り込みとヒートマップの集計が 100ms 以内に終わる', () => {
    const shots: Shot[] = Array.from({ length: 10_000 }, (_, i) => {
      const result = shotResults[i % shotResults.length] ?? 'goal';
      const goalCell = (goalCells[i % goalCells.length] ?? 1) as GoalCell;
      return buildShot({
        zone: shotZones[i % shotZones.length] ?? 'lb',
        result,
        ...(result === 'goal' || result === 'save' ? { goalCell } : { goalCell: undefined }),
        shotType: i % 2 === 0 ? 'middle' : 'cut_in',
      });
    });
    const criteria = { ...emptyFilterCriteria, zones: ['lb' as const, 'rb' as const], shotTypes: ['middle' as const] };

    const start = performance.now();
    buildGoalHeatmap(applyFilter(shots, criteria), 3);
    buildGoalHeatmap(applyFilter(shots, emptyFilterCriteria), 3);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(100);
  });
});
