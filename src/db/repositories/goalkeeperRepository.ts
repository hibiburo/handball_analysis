import { goalkeeperInputSchema, goalkeeperSchema } from '@/domain/schemas';
import type { Goalkeeper, GoalkeeperInput } from '@/domain/types';
import { createId } from '@/lib/id';
import { nowIso } from '@/lib/time';
import type { AppDatabase } from '../database';

export type GoalkeeperSummary = Goalkeeper & { matchCount: number; shotCount: number };

export function goalkeeperRepository(db: AppDatabase) {
  return {
    /** チーム名 → GK名の順に並べて返す */
    async list(): Promise<Goalkeeper[]> {
      const goalkeepers = await db.goalkeepers.toArray();
      return goalkeepers.sort(
        (a, b) => a.teamName.localeCompare(b.teamName, 'ja') || a.name.localeCompare(b.name, 'ja'),
      );
    },

    /** GK一覧（SC1）用に、試合数・シュート数を付けて返す */
    async listSummaries(): Promise<GoalkeeperSummary[]> {
      const goalkeepers = await this.list();
      return Promise.all(
        goalkeepers.map(async (goalkeeper) => ({
          ...goalkeeper,
          matchCount: await db.matchGoalkeepers.where('goalkeeperId').equals(goalkeeper.id).count(),
          shotCount: await db.shots.where('goalkeeperId').equals(goalkeeper.id).count(),
        })),
      );
    },

    get(id: string): Promise<Goalkeeper | undefined> {
      return db.goalkeepers.get(id);
    },

    /** id がなければ新規登録、あれば更新する。入力が不正な場合は ZodError を投げる（フォームで検証済みの前提） */
    async save(input: GoalkeeperInput): Promise<Goalkeeper> {
      const parsed = goalkeeperInputSchema.parse(input);
      const now = nowIso();
      const existing = parsed.id ? await db.goalkeepers.get(parsed.id) : undefined;
      const goalkeeper = goalkeeperSchema.parse({
        ...parsed,
        id: existing?.id ?? parsed.id ?? createId(),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      });
      await db.goalkeepers.put(goalkeeper);
      return goalkeeper;
    },

    /** 削除すると連動して消える件数（確認ダイアログ用） */
    async countRelated(id: string): Promise<{ matchCount: number; shotCount: number }> {
      return {
        matchCount: await db.matchGoalkeepers.where('goalkeeperId').equals(id).count(),
        shotCount: await db.shots.where('goalkeeperId').equals(id).count(),
      };
    },

    /** GK と、そのGKの出場記録・シュートを削除する。試合自体は残す（functional-design.md 6.5） */
    async delete(id: string): Promise<void> {
      await db.transaction('rw', [db.goalkeepers, db.matchGoalkeepers, db.shots], async () => {
        await db.shots.where('goalkeeperId').equals(id).delete();
        await db.matchGoalkeepers.where('goalkeeperId').equals(id).delete();
        await db.goalkeepers.delete(id);
      });
    },
  };
}
