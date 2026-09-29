import type { LoadVideoParams, PlayerError, PlayerState, VideoPlayer } from '@/player/types';

/**
 * テスト用のプレーヤー。時刻や状態をテストから操作できる。
 */
export class MockVideoPlayer implements VideoPlayer {
  currentTime = 0;
  duration = 3600;
  playbackRate = 1;
  state: PlayerState = 'cued';
  loaded: LoadVideoParams[] = [];
  private stateListeners = new Set<(state: PlayerState) => void>();
  private errorListeners = new Set<(error: PlayerError) => void>();

  constructor(params: LoadVideoParams) {
    this.loaded.push(params);
    this.currentTime = params.start ?? 0;
  }

  play() {
    this.emitState('playing');
  }
  pause() {
    this.emitState('paused');
  }
  seekTo(seconds: number) {
    this.currentTime = Math.max(0, seconds);
  }
  getCurrentTime() {
    return this.currentTime;
  }
  getDuration() {
    return this.duration;
  }
  setPlaybackRate(rate: number) {
    this.playbackRate = rate;
  }
  loadVideo(params: LoadVideoParams) {
    this.loaded.push(params);
    this.currentTime = params.start ?? 0;
    this.emitState(params.autoplay === false ? 'cued' : 'playing');
  }
  onStateChange(listener: (state: PlayerState) => void) {
    this.stateListeners.add(listener);
    return () => {
      this.stateListeners.delete(listener);
    };
  }
  onError(listener: (error: PlayerError) => void) {
    this.errorListeners.add(listener);
    return () => {
      this.errorListeners.delete(listener);
    };
  }
  destroy() {
    this.stateListeners.clear();
    this.errorListeners.clear();
  }

  emitState(state: PlayerState) {
    this.state = state;
    for (const listener of this.stateListeners) listener(state);
  }
  emitError(error: PlayerError) {
    for (const listener of this.errorListeners) listener(error);
  }
}

/** window.__E2E_VIDEO_PLAYER_FACTORY__ に設定し、作られたプレーヤーを返す */
export function installMockVideoPlayer(): { players: MockVideoPlayer[]; uninstall: () => void } {
  const players: MockVideoPlayer[] = [];
  window.__E2E_VIDEO_PLAYER_FACTORY__ = async (_element, params) => {
    const player = new MockVideoPlayer(params);
    players.push(player);
    return player;
  };
  return {
    players,
    uninstall: () => {
      delete window.__E2E_VIDEO_PLAYER_FACTORY__;
    },
  };
}
