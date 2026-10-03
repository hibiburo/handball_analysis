import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { unzipSync } from 'fflate';
import { createGoalkeeper, createMatch, expect, recordShot, test } from './fixtures.ts';

/** テスト用の動画（40秒・320×180・H.264/AAC、1秒ごとにキーフレーム。ffmpeg の testsrc で生成） */
const SAMPLE_VIDEO = fileURLToPath(new URL('./fixtures/sample.mp4', import.meta.url));

/** MP4 の mvhd ボックスから長さ（秒）を読む（version 0 / 1 に対応） */
function mp4DurationSeconds(data: Uint8Array): number {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  for (let i = 4; i < data.length - 32; i++) {
    if (data[i] === 0x6d && data[i + 1] === 0x76 && data[i + 2] === 0x68 && data[i + 3] === 0x64) {
      const version = data[i + 4];
      if (version === 1) {
        const timescale = view.getUint32(i + 24);
        return Number(view.getBigUint64(i + 28)) / timescale;
      }
      const timescale = view.getUint32(i + 16);
      return view.getUint32(i + 20) / timescale;
    }
  }
  throw new Error('mvhd が見つかりません');
}

test('分析画面から、元の動画ファイルを選んでシーンを MP4 で書き出す', async ({ page }) => {
  // ffmpeg.wasm（約32MB）の読み込みと変換に時間がかかるため、長めに待つ
  test.setTimeout(180_000);

  await createGoalkeeper(page, { name: '山田 太郎', teamName: '○○大学' });
  await createMatch(page, { homeTeam: '○○大学', awayTeam: '□□大学' });
  await page.getByRole('button', { name: '5秒進む' }).click();
  await page.getByRole('button', { name: '5秒進む' }).click();
  await recordShot(page, { zone: 'レフトバック', cell: 1, result: '失点' });
  await page.getByRole('button', { name: '一時停止' }).click();
  await page.getByRole('button', { name: '5秒進む' }).click();
  await page.getByRole('button', { name: '5秒進む' }).click();
  await recordShot(page, { zone: 'センター', cell: 5, result: 'セーブ' });

  await page.getByRole('link', { name: /を分析/ }).click();
  await expect(page.getByRole('heading', { name: 'シーン（2件）' })).toBeVisible();
  await page.getByRole('button', { name: 'MP4 で書き出す' }).click();

  const dialog = page.getByRole('dialog', { name: 'MP4 で書き出す' });
  await expect(dialog).toContainText('動画ファイルを選んでいないため書き出しません');
  await expect(dialog.getByRole('button', { name: '書き出す' })).toBeDisabled();

  await dialog.getByLabel(/の動画ファイル$/).setInputFiles(SAMPLE_VIDEO);
  await expect(dialog).toContainText('sample.mp4');

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 150_000 }),
    dialog.getByRole('button', { name: '2件を書き出す' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^handball_analysis_clips_山田太郎_\d{8}\.zip$/);
  await expect(page.getByRole('status').filter({ hasText: '2件の MP4 を書き出しました' })).toBeVisible();

  const files = unzipSync(readFileSync(await download.path()));
  const names = Object.keys(files);
  const mp4Names = names.filter((name) => name.endsWith('.mp4'));
  expect(mp4Names).toHaveLength(2);
  expect(mp4Names[0]).toMatch(/^\d{8}_\d{2}m\d{2}s_レフトバック_コース1_失点\.mp4$/);
  expect(mp4Names[1]).toMatch(/^\d{8}_\d{2}m\d{2}s_センター_コース5_セーブ\.mp4$/);
  expect(names).toContain('シーン一覧.csv');

  for (const name of mp4Names) {
    const data = files[name] ?? new Uint8Array();
    // MP4（ISO BMFF）の先頭は ftyp ボックス
    expect(new TextDecoder().decode(data.slice(4, 8))).toBe('ftyp');
    // 前余白4秒＋後余白3秒＝7秒。キーフレーム（1秒ごと）から始まるため、最大1秒ほど長くなる
    const duration = mp4DurationSeconds(data);
    expect(duration).toBeGreaterThanOrEqual(6.5);
    expect(duration).toBeLessThanOrEqual(8.5);
  }

  const csv = new TextDecoder().decode(files['シーン一覧.csv']);
  expect(csv).toContain(mp4Names[0]);
  expect(csv).toContain('○○大学 vs □□大学');
});
