import { loadYouTubeApi } from './loadYouTubeApi';
import type { LoadVideoParams, PlayerError, PlayerState, VideoPlayer, VideoPlayerFactory } from './types';

/** プライバシーに配慮した埋め込みホスト（architecture.md 3.1） */
const EMBED_HOST = 'https://www.youtube-nocookie.com';

const stateByCode: Record<number, PlayerState> = {
  [-1]: 'unstarted',
  0: 'ended',
  1: 'playing',
  2: 'paused',
  3: 'buffering',
  5: 'cued',
};

/** YouTube のエラーコードの対応（design.md 2.3） */
export function toPlayerError(code: number): PlayerError {
  switch (code) {
    case 2:
      return 'invalid_video';
    case 100:
      return 'not_found';
    case 101:
    case 150:
      return 'embed_not_allowed';
    default:
      return 'unknown';
  }
}

function createListeners<T>() {
  const listeners = new Set<(value: T) => void>();
  return {
    add(listener: (value: T) => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    emit(value: T) {
      for (const listener of listeners) listener(value);
    },
  };
}

function toYouTubeParams({ videoId, start, end }: LoadVideoParams) {
  return {
    videoId,
    ...(start !== undefined && { startSeconds: Math.max(0, start) }),
    ...(end !== undefined && { endSeconds: end }),
  };
}

const createYouTubePlayer: VideoPlayerFactory = async (element, params) => {
  const api = await loadYouTubeApi();
  const stateListeners = createListeners<PlayerState>();
  const errorListeners = createListeners<PlayerError>();

  // YouTube は渡した要素を iframe に置き換えるため、React が管理しない要素を中に作って渡す
  const mount = document.createElement('div');
  element.replaceChildren(mount);

  return new Promise<VideoPlayer>((resolve) => {
    const player: YT.Player = new api.Player(mount, {
      host: EMBED_HOST,
      width: '100%',
      height: '100%',
      videoId: params.videoId,
      playerVars: {
        rel: 0,
        playsinline: 1,
        ...(params.start !== undefined && { start: Math.floor(Math.max(0, params.start)) }),
        ...(params.end !== undefined && { end: Math.ceil(params.end) }),
        ...(params.autoplay && { autoplay: 1 }),
      },
      events: {
        onReady: () => resolve(wrapper),
        onStateChange: (event) => {
          const state = stateByCode[event.data];
          if (state) stateListeners.emit(state);
        },
        onError: (event) => errorListeners.emit(toPlayerError(event.data)),
      },
    });

    const wrapper: VideoPlayer = {
      play: () => player.playVideo(),
      pause: () => player.pauseVideo(),
      seekTo: (seconds) => player.seekTo(Math.max(0, seconds), true),
      getCurrentTime: () => player.getCurrentTime() ?? 0,
      getDuration: () => player.getDuration() ?? 0,
      setPlaybackRate: (rate) => player.setPlaybackRate(rate),
      loadVideo: (next) => {
        if (next.autoplay === false) player.cueVideoById(toYouTubeParams(next));
        else player.loadVideoById(toYouTubeParams(next));
      },
      onStateChange: stateListeners.add,
      onError: errorListeners.add,
      destroy: () => {
        player.destroy();
        element.replaceChildren();
      },
    };
  });
};

/** プレーヤーを作る。E2E テストではモックのプレーヤーを使う（design.md 4.3） */
export function createVideoPlayer(element: HTMLElement, params: LoadVideoParams): Promise<VideoPlayer> {
  const factory = window.__E2E_VIDEO_PLAYER_FACTORY__ ?? createYouTubePlayer;
  return factory(element, params);
}
