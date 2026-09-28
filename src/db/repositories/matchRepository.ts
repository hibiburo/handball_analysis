import { matchInputSchema, matchSchema } from '@/domain/schemas';
import type { Match, MatchInput } from '@/domain/types';
import { parseYouTubeVideoId } from '@/domain/youtube';
import { createId } from '@/lib/id';
import { err, ok, type Result } from '@/lib/result';
import { nowIso } from '@/lib/time';
import type { AppDatabase } from '../database';

export type MatchSaveError =
  | { code: 'invalid_url' }
  | { code: 'no_goalkeeper' }
  /** 担当シュートがあるGKの紐づけは解除できない（functional-design.md 6.5） */
  | { code: 'goalkeeper_has_shots'; goalkeeperIds: string[] };

export function matchRepository(db: AppDatabase) {
  return {
    /** GKが出場した試合を、日付の新しい順に返す */
    async listByGoalkeeper(goalkeeperId: string): Promise<Match[]> {
      const links = await db.matchGoalkeepers.where('goalkeeperId').equals(goalkeeperId).toArray();
      const matches = await db.matches.bulkGet(links.map((link) => link.matchId));
      return matches
        .filter((match): match is Match => match !== undefined)
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
    },

    get(id: string): Promise<Match | undefined> {
      return db.matches.get(id);
    },

    /** 試合に紐づくGKのID */
    async goalkeeperIdsOf(matchId: string): Promise<string[]> {
      const links = await db.matchGoalkeepers.where('matchId').equals(matchId).toArray();
      return links.map((link) => link.goalkeeperId);
    },

    /**
     * 試合を保存し、出場GKの紐づけを差分で更新する。
     * 動画IDは URL から取り出して保存する（検証済みのIDのみを埋め込みに使うため）。
     */
    async save(input: MatchInput, goalkeeperIds: string[]): Promise<Result<Match, MatchSaveError>> {
      const parsed = matchInputSchema.parse(input);
      const videoId = parseYouTubeVideoId(parsed.youtubeUrl);
      if (!videoId.ok) return err({ code: 'invalid_url' });
      const uniqueGoalkeeperIds = [...new Set(goalkeeperIds)];
      if (uniqueGoalkeeperIds.length === 0) return err({ code: 'no_goalkeeper' });

      return db.transaction('rw', [db.matches, db.matchGoalkeepers, db.shots], async () => {
        const now = nowIso();
        const existing = parsed.id ? await db.matches.get(parsed.id) : undefined;
        const match = matchSchema.parse({
          ...parsed,
          id: existing?.id ?? parsed.id ?? createId(),
          youtubeVideoId: videoId.value,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        });

        const currentIds = existing ? await this.goalkeeperIdsOf(match.id) : [];
        const removedIds = currentIds.filter((id) => !uniqueGoalkeeperIds.includes(id));
        if (removedIds.length > 0) {
          const shots = await db.shots.where('matchId').equals(match.id).toArray();
          const blocked = removedIds.filter((id) => shots.some((shot) => shot.goalkeeperId === id));
          if (blocked.length > 0) return err({ code: 'goalkeeper_has_shots', goalkeeperIds: blocked });
        }

        await db.matches.put(match);
        await db.matchGoalkeepers.bulkDelete(removedIds.map((goalkeeperId) => [match.id, goalkeeperId]));
        await db.matchGoalkeepers.bulkPut(uniqueGoalkeeperIds.map((goalkeeperId) => ({ matchId: match.id, goalkeeperId })));
        return ok(match);
      });
    },

    /** 削除すると連動して消えるシュートの件数（確認ダイアログ用） */
    countShots(id: string): Promise<number> {
      return db.shots.where('matchId').equals(id).count();
    },

    /** 試合と、その試合の出場記録・シュートを削除する（functional-design.md 6.5） */
    async delete(id: string): Promise<void> {
      await db.transaction('rw', [db.matches, db.matchGoalkeepers, db.shots], async () => {
        await db.shots.where('matchId').equals(id).delete();
        await db.matchGoalkeepers.where('matchId').equals(id).delete();
        await db.matches.delete(id);
      });
    },
  };
}
