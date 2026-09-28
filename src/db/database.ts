import { Dexie, type EntityTable, type Table } from 'dexie';
import type { Goalkeeper, Match, MatchGoalkeeper, Settings, Shot } from '@/domain/types';

export const SETTINGS_KEY = 'app';
export type SettingsRecord = Settings & { key: typeof SETTINGS_KEY };

/**
 * IndexedDB のデータベース定義（functional-design.md 6.4）。
 * スキーマを変えるときは version(n+1) を追加し、必要なら upgrade() で既存データを移行する。
 */
export class AppDatabase extends Dexie {
  goalkeepers!: EntityTable<Goalkeeper, 'id'>;
  matches!: EntityTable<Match, 'id'>;
  matchGoalkeepers!: Table<MatchGoalkeeper, [string, string]>;
  shots!: EntityTable<Shot, 'id'>;
  settings!: Table<SettingsRecord, string>;

  constructor(name = 'handball_analysis') {
    super(name);
    this.version(1).stores({
      goalkeepers: 'id, teamName',
      matches: 'id, date',
      matchGoalkeepers: '[matchId+goalkeeperId], goalkeeperId, matchId',
      shots: 'id, matchId, goalkeeperId, [matchId+videoTime]',
      settings: 'key',
    });
  }
}

/** アプリで使うデータベース。テストでは名前を変えた AppDatabase を個別に作る */
export const appDb = new AppDatabase();
