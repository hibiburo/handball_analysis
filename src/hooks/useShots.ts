import { useLiveQuery } from 'dexie-react-hooks';
import { appDb } from '@/db/database';
import { shotRepository } from '@/db/repositories/shotRepository';

/** 画面からシュートを保存・削除・復元するための操作 */
export const shotActions = shotRepository(appDb);

/** 試合のシュート（動画時刻の順）。読み込み中は undefined */
export function useShotsByMatch(matchId: string | undefined) {
  return useLiveQuery(async () => (matchId ? shotActions.listByMatch(matchId) : []), [matchId]);
}

/** GKのシュート（全試合）。読み込み中は undefined */
export function useShotsByGoalkeeper(goalkeeperId: string | undefined) {
  return useLiveQuery(async () => (goalkeeperId ? shotActions.listByGoalkeeper(goalkeeperId) : []), [goalkeeperId]);
}
