import { Dexie } from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { buildShot } from '@/test/factories';
import { AppDatabase } from './database';

const names: string[] = [];

afterEach(async () => {
  for (const name of names.splice(0)) await Dexie.delete(name);
});

describe('AppDatabase の移行', () => {
  it('version 1 から開き直すと、古いシュート種別だけが消え、他の項目と新しい種別は残る（AC4）', async () => {
    const name = `migration-${Date.now()}`;
    names.push(name);

    // 変更前のアプリ（version 1）のデータベースを作り、古い種別のシュートを入れる
    const v1 = new Dexie(name);
    v1.version(1).stores({
      goalkeepers: 'id, teamName',
      matches: 'id, date',
      matchGoalkeepers: '[matchId+goalkeeperId], goalkeeperId, matchId',
      shots: 'id, matchId, goalkeeperId, [matchId+videoTime]',
      settings: 'key',
    });
    const old = { ...buildShot({ zone: 'lb', result: 'goal', goalCell: 3 }), shotType: 'jump' };
    const noType = buildShot({ zone: 'rw', result: 'miss', goalCell: undefined });
    await v1.table('shots').bulkAdd([old, noType]);
    v1.close();

    // 現在のアプリのデータベースとして開くと移行が実行される
    const db = new AppDatabase(name);
    const migrated = await db.shots.get(old.id);
    expect(migrated).not.toHaveProperty('shotType');
    expect(migrated).toMatchObject({ zone: 'lb', result: 'goal', goalCell: 3, videoTime: old.videoTime });
    expect(await db.shots.get(noType.id)).toEqual(noType);

    // 移行後は新しい種別を保存できる
    await db.shots.put({ ...noType, shotType: 'side' });
    expect((await db.shots.get(noType.id))?.shotType).toBe('side');
    db.close();
  });
});
