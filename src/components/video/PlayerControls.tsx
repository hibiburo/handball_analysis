import { Button } from '@/components/ui/Button';
import type { VideoPlayerControls } from '@/hooks/useVideoPlayer';
import { formatVideoTime } from '@/lib/time';

const PLAYBACK_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2] as const;

type PlayerControlsProps = {
  controls: VideoPlayerControls;
  isReady: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
};

/** 再生・停止、±2秒・±5秒、再生速度、現在時刻（functional-design.md 8.3） */
export function PlayerControls({ controls, isReady, isPlaying, currentTime, duration, playbackRate }: PlayerControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Button size="sm" disabled={!isReady} aria-label="5秒戻る" onClick={() => controls.seekBy(-5)}>
        ⏪5
      </Button>
      <Button size="sm" disabled={!isReady} aria-label="2秒戻る" onClick={() => controls.seekBy(-2)}>
        ◀2
      </Button>
      <Button
        variant="primary"
        disabled={!isReady}
        aria-label={isPlaying ? '一時停止' : '再生'}
        className="w-16"
        onClick={controls.togglePlay}
      >
        {isPlaying ? '⏸' : '▶'}
      </Button>
      <Button size="sm" disabled={!isReady} aria-label="2秒進む" onClick={() => controls.seekBy(2)}>
        2▶
      </Button>
      <Button size="sm" disabled={!isReady} aria-label="5秒進む" onClick={() => controls.seekBy(5)}>
        5⏩
      </Button>
      <label className="ml-1 flex items-center gap-1 text-sm text-muted">
        速度
        <select
          className="min-h-11 rounded-lg border border-border bg-surface px-2 text-foreground"
          value={playbackRate}
          disabled={!isReady}
          onChange={(event) => controls.setPlaybackRate(Number(event.target.value))}
        >
          {PLAYBACK_RATES.map((rate) => (
            <option key={rate} value={rate}>
              {rate}x
            </option>
          ))}
        </select>
      </label>
      <span className="ml-auto font-mono text-sm tabular-nums" aria-live="off">
        {formatVideoTime(currentTime)}
        {duration > 0 && <span className="text-muted"> / {formatVideoTime(duration)}</span>}
      </span>
    </div>
  );
}
