import { defaultSettings, settingsSchema } from '@/domain/schemas';
import type { Settings } from '@/domain/types';
import { SETTINGS_KEY, type AppDatabase } from '../database';

export function settingsRepository(db: AppDatabase) {
  return {
    /** 保存されていなければ既定値を返す */
    async get(): Promise<Settings> {
      const record = await db.settings.get(SETTINGS_KEY);
      if (!record) return { ...defaultSettings };
      const { key: _, ...settings } = record;
      return { ...defaultSettings, ...settings };
    },

    async update(partial: Partial<Settings>): Promise<Settings> {
      return db.transaction('rw', db.settings, async () => {
        const next = settingsSchema.parse({ ...(await this.get()), ...partial });
        await db.settings.put({ ...next, key: SETTINGS_KEY });
        return next;
      });
    },
  };
}
