import { unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { createZip } from './zip';

describe('createZip', () => {
  it('作った zip を展開すると、同じファイル名・同じ中身に戻る（日本語のファイル名を含む）', async () => {
    const mp4 = new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112]);
    const csv = new TextEncoder().encode('\uFEFFファイル名\r\n');
    const blob = await createZip([
      { name: '20260920_23m41s_レフトバック_コース1_失点.mp4', data: mp4 },
      { name: 'シーン一覧.csv', data: csv },
    ]);

    expect(blob.type).toBe('application/zip');
    const files = unzipSync(new Uint8Array(await blob.arrayBuffer()));
    expect(Object.keys(files)).toEqual(['20260920_23m41s_レフトバック_コース1_失点.mp4', 'シーン一覧.csv']);
    expect(Array.from(files['20260920_23m41s_レフトバック_コース1_失点.mp4'] ?? [])).toEqual(Array.from(mp4));
    expect(Array.from(files['シーン一覧.csv'] ?? [])).toEqual(Array.from(csv));
  });

  it('ファイルがなくても空の zip を作る', async () => {
    const blob = await createZip([]);
    expect(Object.keys(unzipSync(new Uint8Array(await blob.arrayBuffer())))).toEqual([]);
  });
});
