import { describe, expect, it } from 'vitest';
import { getBackupStatus, shouldWarnBackup } from './backup';

const NOW = new Date('2026-09-28T12:00:00.000Z');

describe('getBackupStatus', () => {
  it('データがなければ警告しない', () => {
    const status = getBackupStatus(null, false, NOW);
    expect(status).toEqual({ kind: 'no_data' });
    expect(shouldWarnBackup(status)).toBe(false);
  });

  it('データがあるのに一度も書き出していなければ警告する', () => {
    const status = getBackupStatus(null, true, NOW);
    expect(status).toEqual({ kind: 'never' });
    expect(shouldWarnBackup(status)).toBe(true);
  });

  it('最終バックアップから7日以上たっていれば警告する', () => {
    const status = getBackupStatus('2026-09-21T12:00:00.000Z', true, NOW);
    expect(status).toEqual({ kind: 'stale', days: 7 });
    expect(shouldWarnBackup(status)).toBe(true);
  });

  it('7日未満なら警告しない', () => {
    const status = getBackupStatus('2026-09-22T00:00:00.000Z', true, NOW);
    expect(status).toEqual({ kind: 'recent', days: 6 });
    expect(shouldWarnBackup(status)).toBe(false);
  });
});
