import { readFileSync } from 'node:fs';
import { unzipSync } from 'fflate';
import { createGoalkeeper, createMatch, expect, recordShot, test } from './fixtures.ts';

/** .xlsx（zip）を展開し、シートの文字列を出現順に取り出す（共有文字列・セル内の文字列の両方に対応） */
function xlsxTexts(data: Uint8Array): string[] {
  const files = unzipSync(data);
  const decode = (name: string) => new TextDecoder().decode(files[name] ?? new Uint8Array());
  const shared = [...decode('xl/sharedStrings.xml').matchAll(/<si>(.*?)<\/si>/gs)].map((m) =>
    [...(m[1] ?? '').matchAll(/<t[^>]*>(.*?)<\/t>/gs)].map((t) => t[1]).join(''),
  );
  const sheet = decode('xl/worksheets/sheet1.xml');
  return [...sheet.matchAll(/<c\b([^>]*)>(.*?)<\/c>/gs)].map(([, attrs = '', body = '']) => {
    if (/t="s"/.test(attrs)) return shared[Number(body.match(/<v>(\d+)<\/v>/)?.[1])] ?? '';
    return body.match(/<t[^>]*>(.*?)<\/t>/s)?.[1] ?? body.match(/<v>(.*?)<\/v>/s)?.[1] ?? '';
  });
}

function toSeconds(text: string): number {
  return text.split(':').reduce((total, part) => total * 60 + Number(part), 0);
}

test('GK登録 → 試合登録 → シュート記録（取り消しを含む）→ 分析 → シーン再生', async ({ page }) => {
  await createGoalkeeper(page, { name: '山田 太郎', teamName: '○○大学' });
  await createMatch(page, { homeTeam: '○○大学', awayTeam: '□□大学' });

  // 記録（AC1・AC2）: 位置 → コース → 結果 → 記録
  await page.getByRole('button', { name: '5秒進む' }).click();
  await recordShot(page, { zone: 'レフトバック', cell: 1, result: '失点' });
  await page.getByRole('button', { name: '一時停止' }).click();
  await page.getByRole('button', { name: '5秒進む' }).click();
  await recordShot(page, { zone: 'レフトバック', cell: 1, result: 'セーブ' });
  await page.getByRole('button', { name: '一時停止' }).click();
  await page.getByRole('button', { name: '5秒進む' }).click();
  await recordShot(page, { zone: 'ライトウイング', cell: 9, result: '失点' });

  // 直前の記録を取り消す（AC4）
  await expect(page.getByRole('heading', { name: 'シュート一覧（3本）' })).toBeVisible();
  await page
    .getByRole('status')
    .filter({ hasText: 'に記録しました' })
    .last()
    .getByRole('button', { name: '元に戻す' })
    .click();
  await expect(page.getByRole('heading', { name: 'シュート一覧（2本）' })).toBeVisible();

  // 結果に応じた入力欄の切り替え（AC3）
  await page.getByRole('radio', { name: '枠外' }).click();
  await expect(page.getByRole('button', { name: /^コース1（/ })).toBeDisabled();
  await page.getByRole('radio', { name: '失点' }).click();

  // 分析画面（AC5）
  await page.getByRole('link', { name: /を分析/ }).click();
  const cell1 = page.getByRole('button', { name: /^コース1（左上）/ });
  await expect(cell1).toContainText('50%');
  await expect(cell1).toContainText('1/2');
  await expect(cell1).toContainText('参考');
  await expect(page.getByRole('heading', { name: 'シーン（2件）' })).toBeVisible();

  // 絞り込み（AC6）: 結果=失点、再読み込みしても残る
  await page.getByRole('button', { name: /^▸ 結果/ }).click();
  await page.getByRole('region', { name: '絞り込み' }).getByRole('button', { name: '失点', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'シーン（1件）' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'シーン（1件）' })).toBeVisible();

  // Excel の書き出し: 絞り込んだシーン（1件）を、シュート種別・動画開始時間・動画終了時間の一覧で書き出す
  // （.steering/20261003-scene-excel-export）
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Excel で書き出す' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^handball_analysis_scenes_山田太郎_\d{8}\.xlsx$/);
  const texts = xlsxTexts(readFileSync(await download.path()));
  expect(texts.slice(0, 3)).toEqual(['シュート種別', '動画開始時間', '動画終了時間']);
  const [sheetStart, sheetEnd] = texts.filter((text) => /^\d+:\d{2}$/.test(text)).map(toSeconds);
  // 既定の前余白4秒・後余白3秒（記録時刻が4秒より後のため、開始は0秒で切り詰められていない）
  expect((sheetEnd ?? 0) - (sheetStart ?? 0)).toBe(7);

  // シーン再生（AC7）: 記録時刻の4秒前から3秒後まで
  await page.getByRole('region', { name: '絞り込み' }).getByRole('button', { name: 'クリア' }).click();
  await page.locator('aside[aria-label="シーン"] ol button').first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByTestId('mock-player')).toContainText('playing');
  const created = await page.evaluate(() =>
    (
      window as unknown as { __E2E_PLAYER_LOG__: { action: string; value?: { start?: number; end?: number } }[] }
    ).__E2E_PLAYER_LOG__
      .filter((entry) => entry.action === 'create')
      .at(-1),
  );
  // 既定の前余白4秒・後余白3秒で、合わせて7秒のシーンを再生する。
  // 終了 = 記録時刻 + 3秒 なので、長さが7秒で開始が0秒に切り詰められていなければ、開始 = 記録時刻 − 4秒 になっている
  const start = created?.value?.start ?? 0;
  const end = created?.value?.end ?? 0;
  expect(start).toBeGreaterThan(0);
  expect(end - start).toBeCloseTo(7, 0);
  await dialog.locator('footer').getByRole('button', { name: '閉じる' }).click();
  await expect(dialog).toBeHidden();
});

test('存在しない（埋め込みできない）動画のURLでは試合を登録できない', async ({ page }) => {
  await createGoalkeeper(page, { name: '鈴木', teamName: '△△高校' });
  await page.getByRole('button', { name: '＋ 試合を追加' }).click();
  await page.getByLabel('ホーム').fill('A');
  await page.getByLabel('アウェイ').fill('B');
  await page.getByLabel('YouTube の URL').fill('https://youtu.be/aaaaaaaaaaa');
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('再生できません');
  await expect(page.getByRole('button', { name: '登録する' })).toBeDisabled();
});
