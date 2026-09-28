import { appDb } from '@/db/database';
import { dataTransferService } from '@/db/repositories/dataTransferService';

export type { ConflictPolicy, ImportSummary } from '@/db/repositories/dataTransferService';

/** 書き出し・取り込みの操作 */
export const dataTransferActions = dataTransferService(appDb);
