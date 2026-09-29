import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { FilterPanel } from '@/components/analysis/FilterPanel';
import { SceneList } from '@/components/analysis/SceneList';
import { GoalHeatmap } from '@/components/court/GoalHeatmap';
import { HighlightPlayerModal } from '@/components/video/HighlightPlayerModal';
import { applyFilter } from '@/domain/stats/filter';
import { buildGoalHeatmap } from '@/domain/stats/heatmap';
import { calcMetrics, formatRate } from '@/domain/stats/metrics';
import type { Match, Shot } from '@/domain/types';
import { useGoalkeeper } from '@/hooks/useGoalkeepers';
import { useMatchesByGoalkeeper } from '@/hooks/useMatches';
import { useSettings } from '@/hooks/useSettings';
import { useShotsByGoalkeeper } from '@/hooks/useShots';
import { selectGoalkeeperFilter, useAnalysisFilterStore } from '@/stores/analysisFilterStore';

/** SC4 分析画面（functional-design.md 4.4） */
export function AnalysisPage() {
  const { goalkeeperId = '' } = useParams();
  const goalkeeper = useGoalkeeper(goalkeeperId);
  const matches = useMatchesByGoalkeeper(goalkeeperId);
  const shots = useShotsByGoalkeeper(goalkeeperId);
  const settings = useSettings();
  const filter = useAnalysisFilterStore(selectGoalkeeperFilter(goalkeeperId));
  const toggleCriteriaValue = useAnalysisFilterStore((s) => s.toggleCriteriaValue);
  const setMetric = useAnalysisFilterStore((s) => s.setMetric);
  const [playingShot, setPlayingShot] = useState<Shot | null>(null);

  const matchesById = useMemo(() => new Map((matches ?? []).map((m) => [m.id, m])), [matches]);
  // 除外していない試合が対象。あとから追加した試合は自動で対象に入る
  const targetMatchIds = useMemo(
    () => (matches ?? []).map((m) => m.id).filter((id) => !filter.excludedMatchIds.includes(id)),
    [matches, filter.excludedMatchIds],
  );

  const { heatmap, sceneShots, metrics } = useMemo(() => {
    const all = shots ?? [];
    const criteria = { ...filter.criteria, matchIds: targetMatchIds };
    // 試合がすべて除外された場合は対象なし（matchIds が空だと「全試合」になるため明示的に空にする）
    const scoped = targetMatchIds.length === 0 ? [] : all;
    // ヒートマップはコースの絞り込みを除いて集計し、選んだコースを強調表示する（他のコースと比べられるように）
    const forHeatmap = applyFilter(scoped, { ...criteria, goalCells: [] });
    const filtered = applyFilter(scoped, criteria);
    const sorted = [...filtered].sort(
      (a, b) =>
        (matchesById.get(a.matchId)?.date ?? '').localeCompare(matchesById.get(b.matchId)?.date ?? '') ||
        a.videoTime - b.videoTime,
    );
    return {
      heatmap: buildGoalHeatmap(forHeatmap, settings.lowSampleThreshold),
      sceneShots: sorted,
      metrics: calcMetrics(filtered),
    };
  }, [shots, filter.criteria, targetMatchIds, matchesById, settings.lowSampleThreshold]);

  if (goalkeeper === undefined || matches === undefined || shots === undefined) {
    return <p className="p-6 text-muted">読み込み中…</p>;
  }
  if (goalkeeper === null) {
    return (
      <div className="p-6">
        <p>GKが見つかりません。削除された可能性があります。</p>
        <Link to="/" className="mt-2 inline-flex min-h-11 items-center text-primary">
          GK一覧に戻る
        </Link>
      </div>
    );
  }

  const playingMatch: Match | undefined = playingShot ? matchesById.get(playingShot.matchId) : undefined;

  return (
    // 広い画面では画面の高さに収め、絞り込み・ヒートマップ・シーンの各列をそれぞれスクロールさせる（記録画面と同じ）
    <div className="flex min-h-0 flex-1 flex-col lg:h-[calc(100dvh-3.5rem)] lg:flex-none">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <Link
          to={`/goalkeepers/${goalkeeper.id}`}
          className="flex min-h-11 items-center rounded-lg px-2 text-sm text-muted hover:bg-surface-hover"
        >
          ← 戻る
        </Link>
        <h1 className="font-bold">
          {goalkeeper.number !== undefined && <span className="mr-1 font-mono text-muted">#{goalkeeper.number}</span>}
          {goalkeeper.name}
          <span className="ml-1 font-normal text-muted">（{goalkeeper.teamName}）</span>
        </h1>
        <p className="ml-auto text-sm text-muted">
          対象: {targetMatchIds.length}試合 {metrics.shotCount}本 ／ 枠内 {metrics.onTargetCount}本 ／ セーブ率{' '}
          <span className="font-bold text-foreground">{formatRate(metrics.saveRate)}</span>
        </p>
      </div>

      {matches.length === 0 ? (
        <p className="m-6 rounded-xl border border-dashed border-border p-6 text-center text-muted">
          まだ試合が登録されていません。GK詳細から試合を追加してシュートを記録してください。
        </p>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[15rem_minmax(0,1fr)_17rem] lg:grid-rows-[minmax(0,1fr)]">
          <aside className="overflow-y-auto border-border p-3 lg:border-r">
            <FilterPanel goalkeeperId={goalkeeper.id} matches={matches} />
          </aside>
          <section className="overflow-y-auto p-4" aria-label="ヒートマップ">
            <GoalHeatmap
              heatmap={heatmap}
              metric={filter.metric}
              onMetricChange={(metric) => setMetric(goalkeeper.id, metric)}
              selectedCells={filter.criteria.goalCells}
              onCellSelect={(cell) => toggleCriteriaValue(goalkeeper.id, 'goalCells', cell)}
            />
          </section>
          <aside className="flex min-h-0 flex-col border-border lg:border-l" aria-label="シーン">
            <h2 className="border-b border-border px-3 py-2 text-sm font-bold">シーン（{sceneShots.length}件）</h2>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <SceneList shots={sceneShots} matchesById={matchesById} onPlay={setPlayingShot} />
            </div>
          </aside>
        </div>
      )}

      {playingShot && playingMatch && (
        <HighlightPlayerModal
          shot={playingShot}
          match={playingMatch}
          preSeconds={settings.highlightPreSeconds}
          postSeconds={settings.highlightPostSeconds}
          onClose={() => setPlayingShot(null)}
        />
      )}
    </div>
  );
}
