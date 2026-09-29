import type { PlayerError } from './types';

/** プレーヤーのエラーを利用者向けの文言にする（何が起きたか＋どうすればよいか。development-guidelines.md 2.5） */
export function playerErrorMessage(error: PlayerError, isOnline: boolean = navigator.onLine): string {
  switch (error) {
    // YouTube は存在しない・非公開の動画にも同じエラーコードを返すことがあるため、両方の可能性を伝える
    case 'embed_not_allowed':
      return 'この動画は埋め込みが許可されていないか、存在しないため再生できません。URLを確認するか、別の動画のURLを登録してください。';
    case 'not_found':
      return '動画が見つかりません。削除または非公開になった可能性があります。URLを確認してください。';
    case 'invalid_video':
      return '動画のURLが正しくありません。URLを確認してください。';
    case 'unknown':
      return isOnline
        ? '動画を再生できませんでした。時間をおいて再読み込みしてください。'
        : 'オフラインのため動画を再生できません。インターネットに接続してください。';
  }
}
