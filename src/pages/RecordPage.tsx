import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { MatchForm } from '@/components/match/MatchForm';
import { ShotForm } from '@/components/shot/ShotForm';
import { ShotList } from '@/components/shot/ShotList';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { PlayerControls } from '@/components/video/PlayerControls';
import { YouTubePlayer } from '@/components/video/YouTubePlayer';
import type { Shot } from '@/domain/types';
import { useMatch, useMatchGoalkeepers } from '@/hooks/useMatches';
import { useSettings } from '@/hooks/useSettings';
import { shotActions, useShotsByMatch } from '@/hooks/useShots';
import { useVideoPlayer } from '@/hooks/useVideoPlayer';
import { formatVideoTime } from '@/lib/time';
import { useShotFormStore } from '@/stores/shotFormStore';

/** SC3 記録画面（functional-design.md 4.3） */
export function RecordPage() {
  const { matchId } = useParams();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const match = useMatch(matchId);
  const goalkeepers = useMatchGoalkeepers(matchId);
  const shots = useShotsByMatch(matchId);
  const settings = useSettings();
  const lastGoalkeeperId = useShotFormStore((s) => (matchId ? s.lastGoalkeeperIdByMatch[matchId] : undefined));
  // ?shot={id} で開いた場合は、そのシュートを編集状態で開く
  const [editingShotId, setEditingShotId] = useState<string | null>(() => searchParams.get('shot'));
  const [isMatchFormOpen, setIsMatchFormOpen] = useState(false);
  const editingShot = (editingShotId && shots?.find((s) => s.id === editingShotId)) || null;

  const player = useVideoPlayer({ videoId: match?.youtubeVideoId });
  const { controls } = player;

  // ?shot={id} で開いた場合は、プレーヤーの準備ができたらその場面へ移動する（1回だけ）
  const initialShotIdRef = useRef(searchParams.get('shot'));
  const { seekTo } = controls;
  useEffect(() => {
    const initialShotId = initialShotIdRef.current;
    if (!initialShotId || !shots || !player.isReady) return;
    initialShotIdRef.current = null;
    const target = shots.find((s) => s.id === initialShotId);
    if (target) seekTo(target.videoTime - settings.highlightPreSeconds);
  }, [shots, player.isReady, seekTo, settings.highlightPreSeconds]);

  const setEditingShot = (shot: Shot | null) => setEditingShotId(shot?.id ?? null);

  if (match === undefined || goalkeepers === undefined) return <p className="p-6 text-muted">読み込み中…</p>;
  if (match === null) {
    return (
      <div className="p-6">
        <p>試合が見つかりません。削除された可能性があります。</p>
        <Link to="/" className="mt-2 inline-flex min-h-11 items-center text-primary">
          GK一覧に戻る
        </Link>
      </div>
    );
  }

  // 戻る先・分析する GK は、直前に選んだ担当GK（なければ最初のGK）
  const primaryGoalkeeper = goalkeepers.find((g) => g.id === lastGoalkeeperId) ?? goalkeepers[0];

  function jumpTo(shot: Shot) {
    controls.seekTo(shot.videoTime - settings.highlightPreSeconds);
  }

  function startEdit(shot: Shot) {
    setEditingShot(shot);
    controls.pause();
    jumpTo(shot);
  }

  async function deleteShot(shot: Shot) {
    const deleted = await shotActions.delete(shot.id);
    if (!deleted) return;
    if (editingShot?.id === shot.id) setEditingShot(null);
    showToast(`${formatVideoTime(shot.videoTime)} のシュートを削除しました`, {
      duration: 5000,
      action: { label: '元に戻す', onAction: () => void shotActions.restore(deleted) },
    });
  }

  function handleSaved(_shot: Shot, isNew: boolean) {
    if (isNew) {
      if (settings.autoResumeAfterRecord) controls.play();
    } else {
      setEditingShot(null);
    }
  }

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 p-3 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={primaryGoalkeeper ? `/goalkeepers/${primaryGoalkeeper.id}` : '/'}
            className="flex min-h-11 items-center rounded-lg px-2 text-sm text-muted hover:bg-surface-hover"
          >
            ← 戻る
          </Link>
          <h1 className="font-bold">
            {match.homeTeam} vs {match.awayTeam}
            <span className="ml-2 text-sm font-normal text-muted">
              {match.date.replaceAll('-', '/')}
              {match.competition && ` ${match.competition}`}
            </span>
          </h1>
          {primaryGoalkeeper && (
            <Link
              to={`/goalkeepers/${primaryGoalkeeper.id}/analysis`}
              className="ml-auto flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-primary hover:bg-surface-hover"
            >
              {primaryGoalkeeper.name} を分析 →
            </Link>
          )}
        </div>

        <YouTubePlayer
          containerRef={player.containerRef}
          error={player.error}
          errorAction={
            <Button variant="secondary" onClick={() => setIsMatchFormOpen(true)}>
              URLを変更
            </Button>
          }
        />
        <PlayerControls
          controls={controls}
          isReady={player.isReady}
          isPlaying={player.isPlaying}
          currentTime={player.currentTime}
          duration={player.duration}
          playbackRate={player.playbackRate}
        />

        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-surface">
          <h2 className="border-b border-border px-3 py-2 text-sm font-bold">シュート一覧（{shots?.length ?? 0}本）</h2>
          <div className="min-h-40 flex-1 overflow-y-auto">
            <ShotList
              shots={shots ?? []}
              goalkeepers={goalkeepers}
              editingShotId={editingShot?.id ?? null}
              onJump={jumpTo}
              onEdit={startEdit}
              onDelete={(shot) => void deleteShot(shot)}
            />
          </div>
        </section>
      </div>

      <aside className="min-w-0 lg:max-h-[calc(100dvh-5rem)] lg:overflow-y-auto" aria-label="入力パネル">
        {goalkeepers.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted">
            この試合に出場GKが登録されていません。試合を編集してGKを追加してください。
          </p>
        ) : (
          <ShotForm
            key={editingShot?.id ?? 'new'}
            matchId={match.id}
            goalkeepers={goalkeepers}
            editingShot={editingShot}
            isPlayerReady={player.isReady}
            currentTime={player.currentTime}
            videoDuration={player.duration}
            readCurrentTime={controls.readCurrentTime}
            onSaved={handleSaved}
            onCancelEdit={() => setEditingShot(null)}
          />
        )}
      </aside>

      <MatchForm isOpen={isMatchFormOpen} match={match} onClose={() => setIsMatchFormOpen(false)} />
    </div>
  );
}
