import { beforeEach, describe, expect, it } from 'vitest';
import { defaultGoalkeeperFilter, selectGoalkeeperFilter, useAnalysisFilterStore } from './analysisFilterStore';
import { useShotFormStore } from './shotFormStore';

describe('analysisFilterStore', () => {
  beforeEach(() => {
    useAnalysisFilterStore.setState({ byGoalkeeper: {} });
    localStorage.clear();
  });

  const get = (goalkeeperId: string) => selectGoalkeeperFilter(goalkeeperId)(useAnalysisFilterStore.getState());

  it('未設定のGKは既定値（同じ参照）を返す', () => {
    expect(get('gk1')).toBe(defaultGoalkeeperFilter);
  });

  it('条件の値を切り替え、GKごとに別々に保持する', () => {
    const { toggleCriteriaValue } = useAnalysisFilterStore.getState();
    toggleCriteriaValue('gk1', 'zones', 'lb');
    toggleCriteriaValue('gk1', 'zones', 'rb');
    toggleCriteriaValue('gk1', 'zones', 'lb');
    toggleCriteriaValue('gk2', 'results', 'goal');

    expect(get('gk1').criteria.zones).toEqual(['rb']);
    expect(get('gk1').criteria.results).toEqual([]);
    expect(get('gk2').criteria.results).toEqual(['goal']);
  });

  it('試合の除外を切り替える', () => {
    const { toggleExcludedMatch } = useAnalysisFilterStore.getState();
    toggleExcludedMatch('gk1', 'm1');
    toggleExcludedMatch('gk1', 'm2');
    toggleExcludedMatch('gk1', 'm1');
    expect(get('gk1').excludedMatchIds).toEqual(['m2']);
  });

  it('条件のクリアでは試合の除外と表示の指標を残す', () => {
    const state = useAnalysisFilterStore.getState();
    state.setCriteria('gk1', 'goalCells', [1, 2]);
    state.toggleExcludedMatch('gk1', 'm1');
    state.setMetric('gk1', 'saveRate');
    state.clearCriteria('gk1');

    expect(get('gk1')).toEqual({ ...defaultGoalkeeperFilter, excludedMatchIds: ['m1'], metric: 'saveRate' });
  });

  it('localStorage に保存する', () => {
    useAnalysisFilterStore.getState().toggleCriteriaValue('gk1', 'halves', 2);
    const saved = JSON.parse(localStorage.getItem('handball_analysis.analysisFilter') ?? '{}');
    expect(saved.state.byGoalkeeper.gk1.criteria.halves).toEqual([2]);
  });
});

describe('shotFormStore', () => {
  beforeEach(() => {
    useShotFormStore.setState({ lastGoalkeeperIdByMatch: {}, lastHalfByMatch: {}, isDetailOpen: false });
  });

  it('試合ごとに直前の担当GKと前後半を保持する', () => {
    const state = useShotFormStore.getState();
    state.setLastGoalkeeper('m1', 'gk1');
    state.setLastGoalkeeper('m2', 'gk2');
    state.setLastHalf('m1', 2);

    expect(useShotFormStore.getState().lastGoalkeeperIdByMatch).toEqual({ m1: 'gk1', m2: 'gk2' });
    expect(useShotFormStore.getState().lastHalfByMatch).toEqual({ m1: 2 });

    state.setLastHalf('m1', undefined);
    expect(useShotFormStore.getState().lastHalfByMatch).toEqual({});
  });

  it('詳細欄の開閉を保持する', () => {
    useShotFormStore.getState().setDetailOpen(true);
    expect(useShotFormStore.getState().isDetailOpen).toBe(true);
  });
});
