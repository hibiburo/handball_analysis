import { useCallback, useEffect, useRef, useState } from 'react';
import type { LoadVideoParams, PlayerError, PlayerState, VideoPlayer } from '@/player/types';
import { createVideoPlayer } from '@/player/youTubePlayer';

/** 再生中に現在時刻を取得する間隔（design.md 2.3） */
const TIME_POLL_INTERVAL_MS = 250;

type UseVideoPlayerParams = Omit<LoadVideoParams, 'videoId'> & {
  videoId: string | undefined;
};

export type VideoPlayerControls = {
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seekTo: (seconds: number) => void;
  seekBy: (deltaSeconds: number) => void;
  setPlaybackRate: (rate: number) => void;
  loadVideo: (params: LoadVideoParams) => void;
  /** プレーヤーから最新の時刻を読み直して返す（記録ボタンを押した瞬間の時刻を使うため） */
  readCurrentTime: () => number;
};

/**
 * 動画プレーヤーを作り、状態と操作を提供する。
 * videoId が変わるとプレーヤーを作り直す。containerRef を付けた要素の中にプレーヤーが入る。
 */
export function useVideoPlayer({ videoId, start, end, autoplay }: UseVideoPlayerParams) {
  // 要素が後から描画される場合（読み込み中の表示のあとなど）にも対応するため、ref ではなく state で持つ
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const playerRef = useRef<VideoPlayer | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [state, setState] = useState<PlayerState>('unstarted');
  const [error, setError] = useState<PlayerError | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRateState] = useState(1);

  // 作成時の開始位置などは、videoId が変わったときだけ反映する
  // （プレーヤーを作る effect より先に宣言し、先に実行されるようにする）
  const initialParamsRef = useRef({ start, end, autoplay });
  useEffect(() => {
    initialParamsRef.current = { start, end, autoplay };
  }, [start, end, autoplay]);

  useEffect(() => {
    if (!videoId || !container) return;

    let isDisposed = false;
    let created: VideoPlayer | null = null;
    const unsubscribers: (() => void)[] = [];

    const { start: s, end: e, autoplay: a } = initialParamsRef.current;
    createVideoPlayer(container, {
      videoId,
      ...(s !== undefined && { start: s }),
      ...(e !== undefined && { end: e }),
      ...(a !== undefined && { autoplay: a }),
    })
      .then((player) => {
        created = player;
        // 準備完了より先に後片付けが走った場合（画面を閉じた・StrictMode）は、ここで破棄する
        if (isDisposed) {
          player.destroy();
          return;
        }
        playerRef.current = player;
        unsubscribers.push(
          player.onStateChange((next) => {
            setState(next);
            setCurrentTime(player.getCurrentTime());
            setDuration(player.getDuration());
          }),
          player.onError((next) => setError(next)),
        );
        setDuration(player.getDuration());
        setCurrentTime(player.getCurrentTime());
        setIsReady(true);
      })
      .catch(() => {
        if (!isDisposed) setError('unknown');
      });

    return () => {
      isDisposed = true;
      for (const unsubscribe of unsubscribers) unsubscribe();
      created?.destroy();
      playerRef.current = null;
      // 次の動画のために状態を初期化する
      setIsReady(false);
      setError(null);
      setState('unstarted');
      setCurrentTime(0);
      setDuration(0);
    };
  }, [videoId, container]);

  // 再生中だけ現在時刻を定期的に取得する
  useEffect(() => {
    if (state !== 'playing') return;
    const timer = window.setInterval(() => {
      const player = playerRef.current;
      if (player) setCurrentTime(player.getCurrentTime());
    }, TIME_POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [state]);

  // 再生前の動画では、シーク直後の getCurrentTime() が古い値を返すことがある。
  // 続けて「5秒進む」を押したときに正しく足し算できるよう、直前のシーク先を覚えておく
  const lastSeekRef = useRef<{ target: number; at: number } | null>(null);

  const seekTo = useCallback((seconds: number) => {
    const player = playerRef.current;
    if (!player) return;
    const duration = player.getDuration();
    const clamped = Math.max(0, duration > 0 ? Math.min(seconds, duration) : seconds);
    player.seekTo(clamped);
    lastSeekRef.current = { target: clamped, at: Date.now() };
    setCurrentTime(clamped);
  }, []);

  /** 基準にする現在時刻。直前（1秒以内）にシークしていて、再生していなければシーク先を使う */
  const baseTime = useCallback(() => {
    const player = playerRef.current;
    const reported = player?.getCurrentTime() ?? 0;
    const lastSeek = lastSeekRef.current;
    if (lastSeek && Date.now() - lastSeek.at < 1000 && Math.abs(reported - lastSeek.target) > 0.5) {
      return lastSeek.target;
    }
    return reported;
  }, []);

  const readCurrentTime = useCallback(() => {
    const time = baseTime();
    setCurrentTime(time);
    return time;
  }, [baseTime]);

  const controls: VideoPlayerControls = {
    play: useCallback(() => playerRef.current?.play(), []),
    pause: useCallback(() => playerRef.current?.pause(), []),
    togglePlay: useCallback(() => {
      const player = playerRef.current;
      if (!player) return;
      if (state === 'playing' || state === 'buffering') player.pause();
      else player.play();
    }, [state]),
    seekTo,
    seekBy: useCallback((delta: number) => seekTo(baseTime() + delta), [seekTo, baseTime]),
    setPlaybackRate: useCallback((rate: number) => {
      playerRef.current?.setPlaybackRate(rate);
      setPlaybackRateState(rate);
    }, []),
    loadVideo: useCallback((params: LoadVideoParams) => {
      setError(null);
      playerRef.current?.loadVideo(params);
    }, []),
    readCurrentTime,
  };

  return {
    /** プレーヤーを入れる要素に付ける ref */
    containerRef: setContainer,
    isReady,
    state,
    isPlaying: state === 'playing' || state === 'buffering',
    error,
    currentTime,
    duration,
    playbackRate,
    controls,
  };
}
