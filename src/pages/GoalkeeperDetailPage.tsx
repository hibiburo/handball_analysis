import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { GoalkeeperForm } from '@/components/goalkeeper/GoalkeeperForm';
import { MatchForm } from '@/components/match/MatchForm';
import { MatchList } from '@/components/match/MatchList';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { handednessLabels } from '@/domain/enums';
import { calcMetrics, formatRate } from '@/domain/stats/metrics';
import type { Match } from '@/domain/types';
import { downloadGoalkeeperData, downloadMatchData } from '@/hooks/useDataTransfer';
import { goalkeeperActions, useGoalkeeper } from '@/hooks/useGoalkeepers';
import { matchActions, useMatchesByGoalkeeper } from '@/hooks/useMatches';
import { useShotsByGoalkeeper } from '@/hooks/useShots';

type PendingDelete =
  { kind: 'goalkeeper'; matchCount: number; shotCount: number } | { kind: 'match'; match: Match; shotCount: number };

/** SC2 GK詳細 */
export function GoalkeeperDetailPage() {
  const { goalkeeperId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const goalkeeper = useGoalkeeper(goalkeeperId);
  const matches = useMatchesByGoalkeeper(goalkeeperId);
  const shots = useShotsByGoalkeeper(goalkeeperId);
  const [isGoalkeeperFormOpen, setIsGoalkeeperFormOpen] = useState(false);
  const [matchForm, setMatchForm] = useState<{ match?: Match } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  const metrics = useMemo(() => calcMetrics(shots ?? []), [shots]);
  const shotCountByMatch = useMemo(() => {
    const counts = new Map<string, number>();
    for (const shot of shots ?? []) counts.set(shot.matchId, (counts.get(shot.matchId) ?? 0) + 1);
    return counts;
  }, [shots]);

  if (goalkeeper === undefined) return <p className="p-6 text-muted">読み込み中…</p>;
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

  async function exportData(run: () => Promise<void>) {
    try {
      await run();
      showToast('書き出しました', { tone: 'success' });
    } catch {
      showToast('書き出せませんでした。もう一度お試しください。', { tone: 'error' });
    }
  }

  async function requestDeleteGoalkeeper() {
    if (!goalkeeper) return;
    setPendingDelete({ kind: 'goalkeeper', ...(await goalkeeperActions.countRelated(goalkeeper.id)) });
  }

  async function requestDeleteMatch(match: Match) {
    setPendingDelete({ kind: 'match', match, shotCount: await matchActions.countShots(match.id) });
  }

  async function confirmDelete() {
    if (!pendingDelete || !goalkeeper) return;
    try {
      if (pendingDelete.kind === 'goalkeeper') {
        await goalkeeperActions.delete(goalkeeper.id);
        showToast('GKを削除しました');
        navigate('/');
      } else {
        await matchActions.delete(pendingDelete.match.id);
        showToast('試合を削除しました');
      }
    } catch {
      showToast('削除できませんでした。もう一度お試しください。', { tone: 'error' });
    }
    setPendingDelete(null);
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link to="/" className="flex min-h-11 items-center rounded-lg px-2 text-sm text-muted hover:bg-surface-hover">
          ← GK一覧
        </Link>
        <h1 className="text-xl font-bold">
          {goalkeeper.number !== undefined && <span className="mr-2 font-mono text-muted">#{goalkeeper.number}</span>}
          {goalkeeper.name}
          <span className="ml-2 text-base font-normal text-muted">
            （{goalkeeper.teamName}・{handednessLabels[goalkeeper.handedness]}）
          </span>
        </h1>
        <div className="ml-auto flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => void exportData(() => downloadGoalkeeperData(goalkeeper))}>
            書き出し
          </Button>
          <Button size="sm" onClick={() => setIsGoalkeeperFormOpen(true)}>
            編集
          </Button>
          <Button size="sm" variant="ghost" className="text-danger" onClick={requestDeleteGoalkeeper}>
            削除
          </Button>
        </div>
      </div>

      <section className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-surface p-4">
        <dl className="flex gap-6">
          <Stat label="試合" value={`${matches?.length ?? 0}`} />
          <Stat label="シュート" value={`${metrics.shotCount}`} />
          <Stat label="セーブ率" value={formatRate(metrics.saveRate)} />
        </dl>
        <Link
          to={`/goalkeepers/${goalkeeper.id}/analysis`}
          className="ml-auto inline-flex min-h-11 items-center rounded-lg bg-primary px-4 font-medium text-primary-foreground hover:bg-primary-hover"
        >
          このGKを分析する
        </Link>
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">試合一覧</h2>
          <Button variant="primary" onClick={() => setMatchForm({})}>
            ＋ 試合を追加
          </Button>
        </div>
        {matches === undefined ? (
          <p className="text-muted">読み込み中…</p>
        ) : matches.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-muted">
            試合を追加すると、動画を見ながらシュートを記録できます。
          </p>
        ) : (
          <MatchList
            matches={matches}
            shotCountByMatch={shotCountByMatch}
            onEdit={(match) => setMatchForm({ match })}
            onDelete={requestDeleteMatch}
            onExport={(match) => void exportData(() => downloadMatchData(match))}
          />
        )}
      </section>

      <GoalkeeperForm
        isOpen={isGoalkeeperFormOpen}
        goalkeeper={goalkeeper}
        onClose={() => setIsGoalkeeperFormOpen(false)}
      />
      <MatchForm
        isOpen={matchForm !== null}
        match={matchForm?.match}
        defaultGoalkeeperId={goalkeeper.id}
        onClose={() => setMatchForm(null)}
        onSaved={(match) => {
          if (!matchForm?.match) navigate(`/matches/${match.id}/record`);
        }}
      />
      <ConfirmDialog
        isOpen={pendingDelete !== null}
        title={pendingDelete?.kind === 'goalkeeper' ? 'GKを削除しますか？' : '試合を削除しますか？'}
        isDanger
        confirmLabel="削除する"
        message={
          pendingDelete?.kind === 'goalkeeper' ? (
            <p>
              {goalkeeper.name} と、このGKのシュート {pendingDelete.shotCount} 本を削除します（出場した{' '}
              {pendingDelete.matchCount} 試合そのものは残ります）。この操作は元に戻せません。
            </p>
          ) : pendingDelete?.kind === 'match' ? (
            <p>
              {pendingDelete.match.homeTeam} vs {pendingDelete.match.awayTeam} と、この試合のシュート{' '}
              {pendingDelete.shotCount} 本（全GK分）を削除します。この操作は元に戻せません。
            </p>
          ) : null
        }
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-2xl font-bold tabular-nums">{value}</dd>
    </div>
  );
}
