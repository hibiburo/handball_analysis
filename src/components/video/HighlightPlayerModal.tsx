import { Link } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { goalkeeperActionLabels, shotResultLabels, shotTypeLabels, situationLabels, zoneLabels } from '@/domain/enums';
import type { Match, Shot } from '@/domain/types';
import { useVideoPlayer } from '@/hooks/useVideoPlayer';
import { formatVideoTime } from '@/lib/time';
import { YouTubePlayer } from './YouTubePlayer';

type HighlightPlayerModalProps = {
  shot: Shot;
  match: Match;
  preSeconds: number;
  postSeconds: number;
  onClose: () => void;
};

/**
 * M3 動画プレーヤー（重ね表示）。初回実装では1シーンずつ再生する（requirements.md 2.1）。
 * 記録時刻の前余白〜後余白を再生する。
 */
export function HighlightPlayerModal({ shot, match, preSeconds, postSeconds, onClose }: HighlightPlayerModalProps) {
  const start = Math.max(0, shot.videoTime - preSeconds);
  const end = shot.videoTime + postSeconds;
  const player = useVideoPlayer({ videoId: match.youtubeVideoId, start, end, autoplay: true });

  const details = [
    zoneLabels[shot.zone],
    shot.shotType && shotTypeLabels[shot.shotType],
    shot.goalCell !== undefined && `コース${shot.goalCell}`,
    shotResultLabels[shot.result],
    shot.goalkeeperAction && `GK: ${goalkeeperActionLabels[shot.goalkeeperAction]}`,
    shot.situation && situationLabels[shot.situation],
  ].filter(Boolean);

  return (
    <Modal
      isOpen
      size="xl"
      title={`${match.date.replaceAll('-', '/')} ${match.homeTeam} vs ${match.awayTeam}  ${formatVideoTime(shot.videoTime)}`}
      onClose={onClose}
      footer={
        <>
          <Link
            to={`/matches/${match.id}/record?shot=${shot.id}`}
            className="mr-auto inline-flex min-h-11 items-center rounded-lg px-3 text-sm text-primary hover:bg-surface-hover"
          >
            このシーンを編集
          </Link>
          <Button
            disabled={!player.isReady}
            onClick={() => player.controls.loadVideo({ videoId: match.youtubeVideoId, start, end, autoplay: true })}
          >
            もう一度
          </Button>
          <Button variant="primary" onClick={onClose}>
            閉じる
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-2">
        <YouTubePlayer containerRef={player.containerRef} error={player.error} />
        <p className="text-center font-bold">{details.join('・')}</p>
        {shot.memo && <p className="text-center text-sm text-muted">{shot.memo}</p>}
      </div>
    </Modal>
  );
}
