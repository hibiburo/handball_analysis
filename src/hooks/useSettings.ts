import { useLiveQuery } from 'dexie-react-hooks';
import { appDb } from '@/db/database';
import { settingsRepository } from '@/db/repositories/settingsRepository';
import { defaultSettings } from '@/domain/schemas';

export const settingsActions = settingsRepository(appDb);

/** 設定。読み込み中も既定値を返し、画面の表示が遅れないようにする */
export function useSettings() {
  return useLiveQuery(() => settingsActions.get(), []) ?? defaultSettings;
}
