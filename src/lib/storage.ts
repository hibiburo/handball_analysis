/**
 * ブラウザの保存領域（IndexedDB）の永続化と使用量（architecture.md 3.2）。
 * 対応していないブラウザでは何もしない。
 */

/** データが自動で消されないよう、永続化を要求する。結果（永続化されているか）を返す */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export type StorageStatus = {
  /** 永続化されているか。判定できない場合は undefined */
  isPersisted: boolean | undefined;
  /** 使用量（バイト） */
  usage: number | undefined;
  /** 上限の目安（バイト） */
  quota: number | undefined;
};

export async function getStorageStatus(): Promise<StorageStatus> {
  try {
    const [isPersisted, estimate] = await Promise.all([
      navigator.storage?.persisted ? navigator.storage.persisted() : Promise.resolve(undefined),
      navigator.storage?.estimate ? navigator.storage.estimate() : Promise.resolve(undefined),
    ]);
    return { isPersisted, usage: estimate?.usage, quota: estimate?.quota };
  } catch {
    return { isPersisted: undefined, usage: undefined, quota: undefined };
  }
}

/** バイト数を「1.2 MB」のような表示にする */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}
