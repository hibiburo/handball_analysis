import clsx from 'clsx';
import type { ReactNode, RefCallback } from 'react';
import { playerErrorMessage } from '@/player/playerErrorMessage';
import type { PlayerError } from '@/player/types';

type YouTubePlayerProps = {
  containerRef: RefCallback<HTMLDivElement>;
  error: PlayerError | null;
  /** エラー表示の下に置く操作（「URLを変更」など） */
  errorAction?: ReactNode;
  className?: string;
};

/** 16:9 の枠に YouTube プレーヤーを表示する。プレーヤー本体は useVideoPlayer が containerRef の中に作る */
export function YouTubePlayer({ containerRef, error, errorAction, className }: YouTubePlayerProps) {
  return (
    <div className={clsx('relative aspect-video w-full overflow-hidden rounded-lg bg-black', className)}>
      <div ref={containerRef} className="absolute inset-0 [&_iframe]:size-full" />
      {error && (
        <div
          role="alert"
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/85 p-6 text-center text-white"
        >
          <p>{playerErrorMessage(error)}</p>
          {errorAction}
        </div>
      )}
    </div>
  );
}
