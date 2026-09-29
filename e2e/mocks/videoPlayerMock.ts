/**
 * E2E テストで YouTube の代わりに使うプレーヤー（design.md 4.3）。
 * Playwright の addInitScript でページに注入し、window.__E2E_VIDEO_PLAYER_FACTORY__ を差し替える。
 * ブラウザ内で実行されるため、外部の変数や import を参照しないこと。
 */
export function installVideoPlayerMock(): void {
  type State = 'unstarted' | 'playing' | 'paused' | 'buffering' | 'ended' | 'cued';
  type Params = { videoId: string; start?: number; end?: number; autoplay?: boolean };

  const DURATION = 3600;
  const log: { action: string; value?: unknown }[] = [];
  (window as unknown as { __E2E_PLAYER_LOG__: typeof log }).__E2E_PLAYER_LOG__ = log;

  (window as unknown as { __E2E_VIDEO_PLAYER_FACTORY__: unknown }).__E2E_VIDEO_PLAYER_FACTORY__ = async (
    element: HTMLElement,
    params: Params,
  ) => {
    const stateListeners = new Set<(state: State) => void>();
    const errorListeners = new Set<(error: string) => void>();
    let baseTime = params.start ?? 0;
    let playingSince: number | null = null;
    let rate = 1;

    element.replaceChildren();
    const screen = document.createElement('div');
    screen.setAttribute('data-testid', 'mock-player');
    screen.style.cssText =
      'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#fff;font:14px monospace';
    element.append(screen);

    const now = () => (playingSince === null ? baseTime : baseTime + ((Date.now() - playingSince) / 1000) * rate);
    const emit = (state: State) => {
      screen.textContent = `mock ${params.videoId} ${state}`;
      for (const listener of stateListeners) listener(state);
    };
    const play = () => {
      if (playingSince === null) playingSince = Date.now();
      log.push({ action: 'play' });
      emit('playing');
    };
    const pause = () => {
      baseTime = now();
      playingSince = null;
      log.push({ action: 'pause' });
      emit('paused');
    };

    const player = {
      play,
      pause,
      seekTo: (seconds: number) => {
        baseTime = Math.max(0, Math.min(seconds, DURATION));
        if (playingSince !== null) playingSince = Date.now();
        log.push({ action: 'seekTo', value: baseTime });
      },
      getCurrentTime: () => now(),
      getDuration: () => DURATION,
      setPlaybackRate: (next: number) => {
        baseTime = now();
        if (playingSince !== null) playingSince = Date.now();
        rate = next;
      },
      loadVideo: (next: Params) => {
        baseTime = next.start ?? 0;
        playingSince = null;
        log.push({ action: 'loadVideo', value: next });
        if (next.autoplay === false) emit('cued');
        else play();
      },
      onStateChange: (listener: (state: State) => void) => {
        stateListeners.add(listener);
        return () => stateListeners.delete(listener);
      },
      onError: (listener: (error: string) => void) => {
        errorListeners.add(listener);
        return () => errorListeners.delete(listener);
      },
      destroy: () => {
        stateListeners.clear();
        errorListeners.clear();
        element.replaceChildren();
      },
    };

    log.push({ action: 'create', value: params });
    // 準備完了の直後に、YouTube と同じく「再生待ち」または「再生中」を通知する
    setTimeout(() => {
      if (params.videoId === 'aaaaaaaaaaa') {
        for (const listener of errorListeners) listener('embed_not_allowed');
      } else if (params.autoplay) {
        play();
      } else {
        emit('cued');
      }
    }, 50);
    return player;
  };
}
