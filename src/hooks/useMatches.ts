import { useLiveQuery } from 'dexie-react-hooks';
import { appDb } from '@/db/database';
import { matchRepository } from '@/db/repositories/matchRepository';

export type { MatchSaveError } from '@/db/repositories/matchRepository';

/** 画面から試合を保存・削除するための操作 */
export const matchActions = matchRepository(appDb);

/** GKが出場した試合（日付の新しい順）。読み込み中は undefined */
export function useMatchesByGoalkeeper(goalkeeperId: string | undefined) {
  return useLiveQuery(async () => (goalkeeperId ? matchActions.listByGoalkeeper(goalkeeperId) : []), [goalkeeperId]);
}

/** 試合1つ。読み込み中は undefined、存在しなければ null */
export function useMatch(id: string | undefined) {
  return useLiveQuery(async () => (id ? ((await matchActions.get(id)) ?? null) : null), [id]);
}

/** 試合に出場したGK（登録順ではなくチーム名 → 名前の順） */
export function useMatchGoalkeepers(matchId: string | undefined) {
  return useLiveQuery(async () => {
    if (!matchId) return [];
    const ids = await matchActions.goalkeeperIdsOf(matchId);
    const goalkeepers = await appDb.goalkeepers.bulkGet(ids);
    return goalkeepers
      .filter((g) => g !== undefined)
      .sort((a, b) => a.teamName.localeCompare(b.teamName, 'ja') || a.name.localeCompare(b.name, 'ja'));
  }, [matchId]);
}
