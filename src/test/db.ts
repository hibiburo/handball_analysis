import { AppDatabase } from '@/db/database';

let dbSequence = 0;

/** テストごとに独立したデータベースを作る（fake-indexeddb 上） */
export function createTestDatabase(): AppDatabase {
  dbSequence++;
  return new AppDatabase(`test-${dbSequence}-${Date.now()}`);
}
