import { describe, expect, it } from 'vitest';
import { buildShot } from '@/test/factories';
import { applyFilter, emptyFilterCriteria, hasActiveCriteria, type FilterCriteria } from './filter';

function criteria(overrides: Partial<FilterCriteria>): FilterCriteria {
  return { ...emptyFilterCriteria, ...overrides };
}

describe('applyFilter', () => {
  const lbMiddle = buildShot({ zone: 'lb', shotType: 'middle', shooterHand: 'right', half: 1 });
  const lbCutIn = buildShot({ zone: 'lb', shotType: 'cut_in', shooterHand: 'left', half: 2 });
  const rwMiddle = buildShot({ zone: 'rw', shotType: 'middle', shooterHand: 'left', half: 2 });
  const cbNoType = buildShot({ zone: 'cb', result: 'miss' });
  const shots = [lbMiddle, lbCutIn, rwMiddle, cbNoType];

  it('条件が空の場合は全件を返す', () => {
    expect(applyFilter(shots, emptyFilterCriteria)).toEqual(shots);
  });

  it('同じ項目の中の複数の値は OR で組み合わせる', () => {
    expect(applyFilter(shots, criteria({ zones: ['lb', 'rw'] }))).toEqual([lbMiddle, lbCutIn, rwMiddle]);
  });

  it('異なる項目どうしは AND で組み合わせる', () => {
    expect(applyFilter(shots, criteria({ zones: ['lb', 'rw'], shooterHands: ['left'] }))).toEqual([lbCutIn, rwMiddle]);
    expect(applyFilter(shots, criteria({ zones: ['lb'], shotTypes: ['middle'], halves: [1] }))).toEqual([lbMiddle]);
  });

  it('任意項目が未入力のシュートは、その項目に条件がある場合は除外する', () => {
    expect(applyFilter(shots, criteria({ shotTypes: ['middle', 'cut_in', 'pivot'] }))).not.toContain(cbNoType);
  });

  it('試合で絞り込む', () => {
    const other = buildShot({ matchId: 'other-match' });
    expect(applyFilter([...shots, other], criteria({ matchIds: ['other-match'] }))).toEqual([other]);
  });

  it('コース・結果・ポジション・数的状況で絞り込む', () => {
    const target = buildShot({ goalCell: 7, result: 'save', shooterPosition: 'RW', situation: 'short_handed' });
    const all = [...shots, target];
    expect(applyFilter(all, criteria({ goalCells: [7] }))).toEqual([target]);
    expect(applyFilter(all, criteria({ results: ['save'] }))).toEqual([target]);
    expect(applyFilter(all, criteria({ shooterPositions: ['RW'] }))).toEqual([target]);
    expect(applyFilter(all, criteria({ situations: ['short_handed'] }))).toEqual([target]);
  });
});

describe('hasActiveCriteria', () => {
  it('試合以外の条件が1つでも指定されていれば true', () => {
    const { matchIds: _, ...rest } = emptyFilterCriteria;
    expect(hasActiveCriteria(rest)).toBe(false);
    expect(hasActiveCriteria({ ...rest, results: ['goal'] })).toBe(true);
  });
});
