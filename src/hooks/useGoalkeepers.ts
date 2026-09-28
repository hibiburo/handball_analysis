import { useLiveQuery } from 'dexie-react-hooks';
import { appDb } from '@/db/database';
import { goalkeeperRepository } from '@/db/repositories/goalkeeperRepository';

/** 画面から GK を保存・削除するための操作 */
export const goalkeeperActions = goalkeeperRepository(appDb);

/** GK一覧（試合数・シュート数付き）。読み込み中は undefined */
export function useGoalkeeperSummaries() {
  return useLiveQuery(() => goalkeeperActions.listSummaries(), []);
}

/** GK1人。読み込み中は undefined、存在しなければ null */
export function useGoalkeeper(id: string | undefined) {
  return useLiveQuery(async () => (id ? ((await goalkeeperActions.get(id)) ?? null) : null), [id]);
}

/** 試合に紐づけるGKの候補（全GK） */
export function useAllGoalkeepers() {
  return useLiveQuery(() => goalkeeperActions.list(), []);
}
