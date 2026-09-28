import { describe, expect, it } from 'vitest';
import { buildShot } from '@/test/factories';
import { calcMetrics, formatRate } from './metrics';

describe('calcMetrics', () => {
  it('失点とセーブのシュートだけを分母にしてセーブ率を計算する', () => {
    const shots = [
      buildShot({ result: 'goal' }),
      buildShot({ result: 'save' }),
      buildShot({ result: 'save' }),
      buildShot({ result: 'save' }),
      buildShot({ result: 'post' }),
      buildShot({ result: 'miss' }),
      buildShot({ result: 'blocked' }),
    ];
    expect(calcMetrics(shots)).toEqual({
      shotCount: 7,
      onTargetCount: 4,
      goalCount: 1,
      saveCount: 3,
      saveRate: 0.75,
      goalRate: 0.25,
    });
  });

  it('枠内シュートが0本の場合はセーブ率・失点率を undefined にする', () => {
    const metrics = calcMetrics([buildShot({ result: 'miss' }), buildShot({ result: 'post' })]);
    expect(metrics.shotCount).toBe(2);
    expect(metrics.onTargetCount).toBe(0);
    expect(metrics.saveRate).toBeUndefined();
    expect(metrics.goalRate).toBeUndefined();
  });

  it('シュートがない場合はすべて0で、割合は undefined', () => {
    expect(calcMetrics([])).toEqual({
      shotCount: 0,
      onTargetCount: 0,
      goalCount: 0,
      saveCount: 0,
      saveRate: undefined,
      goalRate: undefined,
    });
  });
});

describe('formatRate', () => {
  it('整数の % に四捨五入して表示する', () => {
    expect(formatRate(0.3125)).toBe('31%');
    expect(formatRate(2 / 3)).toBe('67%');
    expect(formatRate(1)).toBe('100%');
    expect(formatRate(0)).toBe('0%');
  });

  it('値がない場合は「−」を表示する', () => {
    expect(formatRate(undefined)).toBe('−');
  });
});
