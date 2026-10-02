import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { isShotType } from '@/domain/enums';
import { emptyFilterCriteria, type FilterCriteria } from '@/domain/stats/filter';
import type { HeatmapMetric } from '@/domain/stats/heatmap';

/** 試合以外の絞り込み条件。試合は「除外した試合」として別に持つ（design.md 2.1） */
export type ShotCriteria = Omit<FilterCriteria, 'matchIds'>;
export type CriteriaKey = keyof ShotCriteria;

export type GoalkeeperFilter = {
  criteria: ShotCriteria;
  /** 集計対象から外した試合。あとから追加した試合が自動で対象に入るよう、含める試合ではなく除外した試合を持つ */
  excludedMatchIds: string[];
  metric: HeatmapMetric;
};

const { matchIds: _, ...emptyShotCriteria } = emptyFilterCriteria;

export const defaultGoalkeeperFilter: GoalkeeperFilter = {
  criteria: emptyShotCriteria,
  excludedMatchIds: [],
  metric: 'goalRate',
};

type AnalysisFilterState = {
  byGoalkeeper: Record<string, GoalkeeperFilter>;
  setCriteria: <K extends CriteriaKey>(goalkeeperId: string, key: K, values: ShotCriteria[K]) => void;
  /** 値が選ばれていれば外し、選ばれていなければ加える */
  toggleCriteriaValue: <K extends CriteriaKey>(goalkeeperId: string, key: K, value: ShotCriteria[K][number]) => void;
  toggleExcludedMatch: (goalkeeperId: string, matchId: string) => void;
  setMetric: (goalkeeperId: string, metric: HeatmapMetric) => void;
  /** 試合の除外と表示の指標は残し、試合以外の条件を消す */
  clearCriteria: (goalkeeperId: string) => void;
};

/**
 * 保存済みの状態を現在の形に変換する。
 * version 1 → 2: シュート種別を変更したため、古い種別（ジャンプなど）の条件だけを取り除く（.steering/20261002-change-shot-types）
 */
export function migrateAnalysisFilter(
  persisted: unknown,
  version: number,
): { byGoalkeeper: Record<string, GoalkeeperFilter> } {
  const state = (persisted ?? {}) as { byGoalkeeper?: Record<string, GoalkeeperFilter> }; // 保存した形（partialize）のまま読み出される
  const byGoalkeeper = state.byGoalkeeper ?? {};
  if (version >= 2) return { byGoalkeeper };
  return {
    byGoalkeeper: Object.fromEntries(
      Object.entries(byGoalkeeper).map(([goalkeeperId, filter]) => [
        goalkeeperId,
        {
          ...filter,
          criteria: { ...filter.criteria, shotTypes: (filter.criteria.shotTypes ?? []).filter(isShotType) },
        },
      ]),
    ),
  };
}

function current(state: AnalysisFilterState, goalkeeperId: string): GoalkeeperFilter {
  return state.byGoalkeeper[goalkeeperId] ?? defaultGoalkeeperFilter;
}

export const useAnalysisFilterStore = create<AnalysisFilterState>()(
  persist(
    (set) => {
      const update = (goalkeeperId: string, fn: (filter: GoalkeeperFilter) => GoalkeeperFilter) =>
        set((state) => ({
          byGoalkeeper: { ...state.byGoalkeeper, [goalkeeperId]: fn(current(state, goalkeeperId)) },
        }));

      return {
        byGoalkeeper: {},
        setCriteria: (goalkeeperId, key, values) =>
          update(goalkeeperId, (filter) => ({ ...filter, criteria: { ...filter.criteria, [key]: values } })),
        toggleCriteriaValue: (goalkeeperId, key, value) =>
          update(goalkeeperId, (filter) => {
            const values: readonly unknown[] = filter.criteria[key];
            const next = values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
            return { ...filter, criteria: { ...filter.criteria, [key]: next } };
          }),
        toggleExcludedMatch: (goalkeeperId, matchId) =>
          update(goalkeeperId, (filter) => ({
            ...filter,
            excludedMatchIds: filter.excludedMatchIds.includes(matchId)
              ? filter.excludedMatchIds.filter((id) => id !== matchId)
              : [...filter.excludedMatchIds, matchId],
          })),
        setMetric: (goalkeeperId, metric) => update(goalkeeperId, (filter) => ({ ...filter, metric })),
        clearCriteria: (goalkeeperId) => update(goalkeeperId, (filter) => ({ ...filter, criteria: emptyShotCriteria })),
      };
    },
    {
      name: 'handball_analysis.analysisFilter',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ byGoalkeeper: state.byGoalkeeper }),
      migrate: migrateAnalysisFilter,
    },
  ),
);

/** GKの絞り込み状態を取り出すセレクター。未設定なら既定値（同じ参照）を返す */
export function selectGoalkeeperFilter(goalkeeperId: string) {
  return (state: AnalysisFilterState) => current(state, goalkeeperId);
}
