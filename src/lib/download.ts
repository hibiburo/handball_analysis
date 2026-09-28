/** テキストをファイルとしてダウンロードさせる */
export function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // クリック直後に解放すると Safari でダウンロードが始まらないことがあるため、少し待つ
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** ファイル名に使えない文字を取り除く */
export function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|\s]+/g, '').slice(0, 50);
}
