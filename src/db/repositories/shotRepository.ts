import { Dexie } from 'dexie';
import { shotSchema } from '@/domain/schemas';
import type { Shot, ShotInput } from '@/domain/types';
import { createId } from '@/lib/id';
import { nowIso } from '@/lib/time';
import type { AppDatabase } from '../database';

export function shotRepository(db: AppDatabase) {
  return {
    /** 試合のシュートを動画時刻の順に返す */
    listByMatch(matchId: string): Promise<Shot[]> {
      return db.shots.where('[matchId+videoTime]').between([matchId, Dexie.minKey], [matchId, Dexie.maxKey]).toArray();
    },

    listByGoalkeeper(goalkeeperId: string): Promise<Shot[]> {
      return db.shots.where('goalkeeperId').equals(goalkeeperId).toArray();
    },

    get(id: string): Promise<Shot | undefined> {
      return db.shots.get(id);
    },

    /**
     * id がなければ新規登録、あれば更新する。
     * 保存前にスキーマ（結果とコースの組み合わせを含む）で検証し、不正なら ZodError を投げる。
     */
    async save(input: ShotInput): Promise<Shot> {
      const now = nowIso();
      const existing = input.id ? await db.shots.get(input.id) : undefined;
      const shot = shotSchema.parse({
        ...input,
        id: existing?.id ?? input.id ?? createId(),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      });
      await db.shots.put(shot);
      return shot;
    },

    /** 削除したシュートを返す（取り消しで restore に渡すため） */
    async delete(id: string): Promise<Shot | undefined> {
      return db.transaction('rw', db.shots, async () => {
        const shot = await db.shots.get(id);
        if (shot) await db.shots.delete(id);
        return shot;
      });
    },

    /** 削除・更新を取り消すために、以前の状態をそのまま書き戻す */
    async restore(shot: Shot): Promise<void> {
      await db.shots.put(shotSchema.parse(shot));
    },
  };
}
